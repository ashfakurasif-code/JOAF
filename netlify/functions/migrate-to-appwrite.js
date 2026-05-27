// netlify/functions/migrate-to-appwrite.js
// Firebase REST → Appwrite upsert migration
// Chunked (8 records/batch), no firebase-admin, pure JSON responses

const { Client, Databases, Query, ID } = require('node-appwrite');

// ── Config ────────────────────────────────────────────────────────────────────
const FB_API_KEY  = 'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk';
const FB_PROJECT  = 'joaf-app-45753';
const FB_BASE     = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

const AW_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT  = '6a11b6cd000b59f318eb';
const AW_DB       = 'joaf';
const AW_COL      = 'push_subscriptions';

const BATCH_SIZE  = 8;

// ── Helpers ───────────────────────────────────────────────────────────────────
function headers() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };
}

function ok(body) {
  return { statusCode: 200, headers: headers(), body: JSON.stringify(body) };
}

function err(status, message) {
  return { statusCode: status, headers: headers(), body: JSON.stringify({ error: String(message) }) };
}

// ── Firebase REST fetch (all docs, one collection) ────────────────────────────
async function fetchFirebaseDocs(collection) {
  let allDocs = [];
  let pageToken = null;

  do {
    let url = `${FB_BASE}/${collection}?key=${FB_API_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    const res = await fetch(url);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Firebase fetch failed (${res.status}): ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    const docs  = data.documents || [];
    pageToken   = data.nextPageToken || null;

    for (const doc of docs) {
      const id     = doc.name.split('/').pop();
      const fields = doc.fields || {};
      const obj    = { _fbId: id };

      for (const [k, v] of Object.entries(fields)) {
        if (v.stringValue  !== undefined) obj[k] = v.stringValue;
        else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
        else if (v.integerValue !== undefined) obj[k] = String(v.integerValue);
        else if (v.mapValue) {
          const m = {};
          for (const [mk, mv] of Object.entries(v.mapValue.fields || {})) {
            m[mk] = mv.stringValue ?? mv.booleanValue ?? mv.integerValue ?? '';
          }
          obj[k] = m;
        }
      }
      allDocs.push(obj);
    }
  } while (pageToken);

  return allDocs;
}

// ── Appwrite client ───────────────────────────────────────────────────────────
function getAppwrite() {
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!apiKey) throw new Error('APPWRITE_API_KEY env var is missing');

  const client = new Client()
    .setEndpoint(AW_ENDPOINT)
    .setProject(AW_PROJECT)
    .setKey(apiKey);

  return new Databases(client);
}

// ── Normalize a Firebase doc into Appwrite payload ────────────────────────────
function normalizePayload(doc) {
  let subscription = doc.subscription || doc.pushSubscription || doc.subscriptionJson || doc.subscription_data;

  if (typeof subscription === 'string') {
    try { subscription = JSON.parse(subscription); } catch (_) { subscription = null; }
  }

  const endpoint = (subscription && subscription.endpoint) || doc.endpoint || null;
  if (!endpoint) return null;

  return {
    endpoint,
    subscriptionJson: JSON.stringify(subscription || { endpoint }),
    district:   doc.district   || 'unknown',
    active:     true,
    updatedAt:  new Date().toISOString(),
  };
}

// ── Deterministic Appwrite doc ID from endpoint ───────────────────────────────
function docIdFromEndpoint(endpoint) {
  // Appwrite IDs: 1-36 chars, alphanumeric + underscore, must start with letter/digit
  const b64 = Buffer.from(endpoint).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(-32);
  return b64.length >= 4 ? b64 : 'sub_' + b64;
}

// ── Upsert one record ─────────────────────────────────────────────────────────
async function upsertOne(databases, payload) {
  // Try to find by endpoint first (idempotency key)
  const existing = await databases.listDocuments(AW_DB, AW_COL, [
    Query.equal('endpoint', payload.endpoint),
    Query.limit(1),
  ]);

  if (existing.documents.length > 0) {
    await databases.updateDocument(AW_DB, AW_COL, existing.documents[0].$id, payload);
    return 'updated';
  }

  const docId = docIdFromEndpoint(payload.endpoint);
  try {
    await databases.createDocument(AW_DB, AW_COL, docId, payload);
  } catch (e) {
    if (e.code === 409) {
      // ID collision — update instead
      await databases.updateDocument(AW_DB, AW_COL, docId, payload);
    } else {
      throw e;
    }
  }
  return 'created';
}

// ── Handler ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers: headers(), body: '' };
  }

  // Auth
  const adminKey = (event.headers && event.headers['x-admin-key'])
    || (event.queryStringParameters && event.queryStringParameters.key)
    || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return err(401, 'Unauthorized');
  }

  try {
    const params = event.queryStringParameters || {};
    const action = params.action || 'count';

    // ── action=count : fetch all Firebase docs, return total & batch info ─────
    if (action === 'count') {
      const docs = await fetchFirebaseDocs('push_subscriptions');
      const valid = docs.filter(d => normalizePayload(d) !== null);
      const totalBatches = Math.ceil(valid.length / BATCH_SIZE);
      return ok({ total: valid.length, totalBatches, batchSize: BATCH_SIZE });
    }

    // ── action=batch : migrate one batch ─────────────────────────────────────
    if (action === 'batch') {
      const batchIndex = parseInt(params.batchIndex || '0', 10);

      const docs  = await fetchFirebaseDocs('push_subscriptions');
      const valid = docs.map(d => normalizePayload(d)).filter(Boolean);

      const totalBatches = Math.ceil(valid.length / BATCH_SIZE);
      const start        = batchIndex * BATCH_SIZE;
      const slice        = valid.slice(start, start + BATCH_SIZE);

      if (slice.length === 0) {
        return ok({ batchIndex, processed: 0, created: 0, updated: 0, failed: 0, done: true, totalBatches });
      }

      const databases = getAppwrite();
      let created = 0, updated = 0, failed = 0;
      const errors = [];

      for (const payload of slice) {
        try {
          const result = await upsertOne(databases, payload);
          if (result === 'created') created++;
          else updated++;
        } catch (e) {
          failed++;
          errors.push(e.message);
        }
      }

      const done = (start + slice.length) >= valid.length;
      return ok({
        batchIndex,
        processed: slice.length,
        created,
        updated,
        failed,
        errors: errors.slice(0, 5),
        done,
        totalBatches,
        totalValid: valid.length,
      });
    }

    return err(400, 'Unknown action. Use action=count or action=batch&batchIndex=N');

  } catch (e) {
    console.error('migrate-to-appwrite crash:', e);
    return err(500, e.message || 'Internal server error');
  }
};
