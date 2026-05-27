// netlify/functions/migrate-to-appwrite.js
// Batched Firestore → Appwrite migration.
// Each invocation processes BATCH_SIZE docs (8 max) to stay under Netlify 10s limit.
// Returns nextPageToken so the frontend loop can resume exactly where it left off.
// Upsert logic: checks Appwrite first — update if exists, create if not. No duplicates.

const {
  AW_ENDPOINT,
  AW_PROJECT,
  DB_ID,
  COLLECTION_ID,
  awGet,
  awCreate,
  awUpdate,
  sanitizeId,
  DEFAULT_DOC_PERMISSIONS,
} = require('./aw-utils');

const FS_PROJECT = 'joaf-app-45753';
const FS_API_KEY = 'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT}/databases/(default)/documents`;
const BATCH_SIZE = 8; // safe under 10s per invocation

// ── Firestore REST helpers ─────────────────────────────────────────────────

function fsFieldToValue(v) {
  if (!v || typeof v !== 'object') return null;
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue  !== undefined) return parseFloat(v.doubleValue);
  if (v.nullValue    !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.mapValue) {
    const m = {};
    for (const [k, mv] of Object.entries(v.mapValue.fields || {}))
      m[k] = fsFieldToValue(mv);
    return m;
  }
  if (v.arrayValue)
    return (v.arrayValue.values || []).map(av => fsFieldToValue(av));
  return null;
}

async function fsGetPage(collection, pageToken) {
  let url = `${FS_BASE}/${collection}?key=${FS_API_KEY}&pageSize=${BATCH_SIZE}`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
  const r = await fetch(url);
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`Firestore error ${r.status}: ${txt.slice(0, 200)}`);
  }
  const data = await r.json();
  const docs = (data.documents || []).map(doc => {
    const id  = doc.name.split('/').pop();
    const obj = { _fsId: id };
    for (const [k, v] of Object.entries(doc.fields || {}))
      obj[k] = fsFieldToValue(v);
    return obj;
  });
  return { docs, nextPageToken: data.nextPageToken || null };
}

// Count total docs via a single small request (uses totalCount if available,
// otherwise we fall back to a best-effort estimate by fetching page 1 only).
async function fsTotalCount(collection) {
  // Firestore REST does not expose a native count endpoint without v1beta — so
  // we fetch one page and return the real pageToken presence as a signal only.
  // For progress display we resolve a lightweight aggregation query.
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT}/databases/(default)/documents:runQuery?key=${FS_API_KEY}`;
    const body = {
      structuredQuery: {
        from: [{ collectionId: collection }],
        select: { fields: [] },
      },
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      const lines = await r.json();
      // Each result row is one document (last row may be a stats-only row)
      const count = Array.isArray(lines)
        ? lines.filter(l => l.document).length
        : 0;
      return count;
    }
  } catch (_) {}
  return null; // unknown — frontend will show relative progress
}

// ── Subscription normalisation ─────────────────────────────────────────────

function normalizeSubscription(fsDoc) {
  let sub = fsDoc.subscription || fsDoc.pushSubscription || fsDoc.subscriptionJson || null;
  if (typeof sub === 'string') {
    try { sub = JSON.parse(sub); } catch (_) { sub = null; }
  }
  if (!sub || typeof sub !== 'object') {
    const ep = fsDoc.endpoint;
    if (ep) sub = { endpoint: ep, keys: fsDoc.keys || {} };
  }
  if (!sub || !sub.endpoint) return null;
  const keys = sub.keys || fsDoc.keys || {};
  const clean = {
    endpoint: sub.endpoint,
    keys: { p256dh: keys.p256dh || '', auth: keys.auth || '' },
  };
  if (sub.expirationTime !== undefined) clean.expirationTime = sub.expirationTime;
  return clean;
}

function endpointToDocId(endpoint) {
  return sanitizeId(Buffer.from(endpoint).toString('base64url').slice(-32));
}

// ── Upsert one doc into Appwrite ───────────────────────────────────────────

async function upsertOne(fsDoc) {
  const cleanSub = normalizeSubscription(fsDoc);
  if (!cleanSub || !cleanSub.keys.p256dh || !cleanSub.keys.auth) {
    return { action: 'skipped', reason: 'invalid_sub' };
  }
  const docId   = endpointToDocId(cleanSub.endpoint);
  const payload = {
    endpoint:         cleanSub.endpoint,
    subscriptionJson: JSON.stringify(cleanSub),
    district:         typeof fsDoc.district === 'string' ? fsDoc.district.slice(0, 255) : '',
    active:           true,
    updatedAt:        new Date().toISOString(),
  };
  const existing = await awGet(COLLECTION_ID, docId);
  if (existing) {
    await awUpdate(COLLECTION_ID, docId, payload);
    return { action: 'updated', id: docId };
  }
  await awCreate(COLLECTION_ID, payload, docId, DEFAULT_DOC_PERMISSIONS);
  return { action: 'created', id: docId };
}

// ── Connectivity validators ────────────────────────────────────────────────

async function validateFirestore() {
  const r = await fetch(
    `${FS_BASE}/push_subscriptions?key=${FS_API_KEY}&pageSize=1`
  );
  if (!r.ok) throw new Error(`Firestore unreachable: HTTP ${r.status}`);
}

async function validateAppwrite() {
  const res = await fetch(
    `${AW_ENDPOINT}/databases/${DB_ID}/collections/${COLLECTION_ID}/documents?limit=1`,
    {
      headers: {
        'Content-Type':      'application/json',
        'X-Appwrite-Project': AW_PROJECT,
        'X-Appwrite-Key':     process.env.APPWRITE_API_KEY,
      },
    }
  );
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Appwrite unreachable: HTTP ${res.status} — ${txt.slice(0, 200)}`);
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type':                 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY)
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  const action = body.action || 'batch';

  // ── VALIDATE ──────────────────────────────────────────────────────────────
  if (action === 'validate') {
    const errors = [];
    try { await validateFirestore(); } catch (e) { errors.push('Firestore: ' + e.message); }
    try { await validateAppwrite();  } catch (e) { errors.push('Appwrite: '  + e.message); }

    // Also fetch total count for accurate progress bar
    const totalCount = await fsTotalCount('push_subscriptions').catch(() => null);

    const ok = errors.length === 0;
    return {
      statusCode: ok ? 200 : 503,
      headers,
      body: JSON.stringify({ ok, errors, totalCount }),
    };
  }

  // ── BATCH ─────────────────────────────────────────────────────────────────
  if (action === 'batch') {
    // pageToken from previous batch (null = start of collection)
    const pageToken       = body.pageToken       || null;
    // running totals passed back from the frontend
    const processedSoFar  = parseInt(body.processedSoFar  || 0, 10);
    const createdSoFar    = parseInt(body.createdSoFar    || 0, 10);
    const updatedSoFar    = parseInt(body.updatedSoFar    || 0, 10);
    const skippedSoFar    = parseInt(body.skippedSoFar    || 0, 10);
    const failedSoFar     = parseInt(body.failedSoFar     || 0, 10);
    const totalCount      = body.totalCount != null ? parseInt(body.totalCount, 10) : null;

    let page;
    try {
      page = await fsGetPage('push_subscriptions', pageToken);
    } catch (e) {
      return {
        statusCode: 502,
        headers,
        body: JSON.stringify({ error: 'Firestore fetch failed: ' + e.message }),
      };
    }

    let batchCreated = 0, batchUpdated = 0, batchSkipped = 0, batchFailed = 0;
    const batchFailures = [];

    for (const fsDoc of page.docs) {
      try {
        const result = await upsertOne(fsDoc);
        if      (result.action === 'created') batchCreated++;
        else if (result.action === 'updated') batchUpdated++;
        else                                   batchSkipped++;
      } catch (e) {
        batchFailed++;
        batchFailures.push({ id: fsDoc._fsId, error: e.message });
      }
    }

    const newProcessed = processedSoFar + page.docs.length;
    const newCreated   = createdSoFar   + batchCreated;
    const newUpdated   = updatedSoFar   + batchUpdated;
    const newSkipped   = skippedSoFar   + batchSkipped;
    const newFailed    = failedSoFar    + batchFailed;
    const isComplete   = !page.nextPageToken;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok:             true,
        isComplete,
        nextPageToken:  page.nextPageToken || null,
        batchSize:      page.docs.length,
        // cumulative
        processedCount: newProcessed,
        totalCount,
        createdCount:   newCreated,
        updatedCount:   newUpdated,
        skippedCount:   newSkipped,
        failedCount:    newFailed,
        batchFailures:  batchFailures.slice(0, 10),
        message: isComplete
          ? `✅ Done! ${newCreated} created, ${newUpdated} updated, ${newSkipped} skipped${newFailed ? ', ' + newFailed + ' failed' : ''}.`
          : `Batch complete. Processed ${newProcessed}${totalCount ? '/' + totalCount : ''} so far…`,
      }),
    };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
};
