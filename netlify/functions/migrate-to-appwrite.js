// netlify/functions/migrate-to-appwrite.js
// Firestore → Appwrite one-way migration
// Uses public Firestore REST API (no firebase-admin required)
// Upserts into Appwrite: no duplicates, forces active:true

const {
  AW_ENDPOINT,
  AW_PROJECT,
  DB_ID,
  COLLECTION_ID,
  awListAll,
  awCreate,
  awUpdate,
  awGet,
  sanitizeId,
  DEFAULT_DOC_PERMISSIONS,
  qEqual,
  awList,
} = require('./aw-utils');

// ── Firestore REST (public API key only) ────────────────────────────────────
const FS_PROJECT = 'joaf-app-45753';
const FS_API_KEY = 'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT}/databases/(default)/documents`;

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
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) {
      m[k] = fsFieldToValue(mv);
    }
    return m;
  }
  if (v.arrayValue) {
    return (v.arrayValue.values || []).map(av => fsFieldToValue(av));
  }
  return null;
}

async function fsGetCollection(collection, pageToken = null) {
  let url = `${FS_BASE}/${collection}?key=${FS_API_KEY}&pageSize=300`;
  if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
  const r = await fetch(url);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`Firestore GET failed (${r.status}): ${text.slice(0, 300)}`);
  }
  return r.json();
}

async function fsGetAllDocs(collection) {
  const all = [];
  let pageToken = null;
  do {
    const data = await fsGetCollection(collection, pageToken);
    for (const doc of (data.documents || [])) {
      const id = doc.name.split('/').pop();
      const obj = { _fsId: id };
      for (const [k, v] of Object.entries(doc.fields || {})) {
        obj[k] = fsFieldToValue(v);
      }
      all.push(obj);
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return all;
}

// ── Validation ──────────────────────────────────────────────────────────────
async function validateFirestore() {
  const r = await fetch(
    `${FS_BASE}/push_subscriptions?key=${FS_API_KEY}&pageSize=1`
  );
  if (!r.ok) throw new Error(`Firestore unreachable: HTTP ${r.status}`);
  return true;
}

async function validateAppwrite() {
  const res = await fetch(
    `${AW_ENDPOINT}/databases/${DB_ID}/collections/${COLLECTION_ID}/documents?limit=1`,
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': AW_PROJECT,
        'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
      },
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Appwrite unreachable: HTTP ${res.status} — ${text.slice(0, 200)}`);
  }
  return true;
}

// ── Parse & normalize a Firestore subscription doc ─────────────────────────
function normalizeSubscription(fsDoc) {
  // Extract raw sub from all known field shapes
  let sub = fsDoc.subscription || fsDoc.pushSubscription || fsDoc.subscriptionJson || null;

  if (typeof sub === 'string') {
    try { sub = JSON.parse(sub); } catch (_) { sub = null; }
  }

  // If sub is still null, try reconstructing from top-level fields
  if (!sub || typeof sub !== 'object') {
    const ep = fsDoc.endpoint;
    if (ep) {
      sub = {
        endpoint: ep,
        keys: fsDoc.keys || {},
      };
    }
  }

  if (!sub || !sub.endpoint) return null;

  // Ensure keys
  const keys = sub.keys || fsDoc.keys || {};

  const clean = {
    endpoint: sub.endpoint,
    keys: {
      p256dh: keys.p256dh || '',
      auth:   keys.auth   || '',
    },
  };

  if (sub.expirationTime !== undefined) {
    clean.expirationTime = sub.expirationTime;
  }

  return clean;
}

function endpointToDocId(endpoint) {
  return sanitizeId(
    Buffer.from(endpoint).toString('base64url').slice(-32)
  );
}

// ── Upsert one subscription into Appwrite ──────────────────────────────────
async function upsertSubscription(cleanSub, district) {
  const docId = endpointToDocId(cleanSub.endpoint);

  const payload = {
    endpoint:         cleanSub.endpoint,
    subscriptionJson: JSON.stringify(cleanSub),
    district:         typeof district === 'string' ? district.slice(0, 255) : '',
    active:           true,
    updatedAt:        new Date().toISOString(),
  };

  // Check Appwrite first — no duplicates
  const existing = await awGet(COLLECTION_ID, docId);
  if (existing) {
    await awUpdate(COLLECTION_ID, docId, payload);
    return { action: 'updated', id: docId };
  }

  await awCreate(COLLECTION_ID, payload, docId, DEFAULT_DOC_PERMISSIONS);
  return { action: 'created', id: docId };
}

// ── Main handler ────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  const action = body.action || 'migrate';

  // ── VALIDATE ──────────────────────────────────────────────────────────────
  if (action === 'validate') {
    const results = { firestore: false, appwrite: false, errors: [] };
    try { await validateFirestore(); results.firestore = true; }
    catch (e) { results.errors.push('Firestore: ' + e.message); }
    try { await validateAppwrite(); results.appwrite = true; }
    catch (e) { results.errors.push('Appwrite: ' + e.message); }

    const ok = results.firestore && results.appwrite;
    return {
      statusCode: ok ? 200 : 503,
      headers,
      body: JSON.stringify({ ok, ...results }),
    };
  }

  // ── MIGRATE ───────────────────────────────────────────────────────────────
  if (action === 'migrate') {
    // Pre-flight
    try { await validateFirestore(); } catch (e) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Pre-flight failed — Firestore: ' + e.message }) };
    }
    try { await validateAppwrite(); } catch (e) {
      return { statusCode: 503, headers, body: JSON.stringify({ error: 'Pre-flight failed — Appwrite: ' + e.message }) };
    }

    let fsDocs;
    try {
      fsDocs = await fsGetAllDocs('push_subscriptions');
    } catch (e) {
      return { statusCode: 502, headers, body: JSON.stringify({ error: 'Firestore fetch failed: ' + e.message }) };
    }

    const total    = fsDocs.length;
    let created    = 0;
    let updated    = 0;
    let skipped    = 0;
    const failures = [];

    for (const fsDoc of fsDocs) {
      try {
        const cleanSub = normalizeSubscription(fsDoc);
        if (!cleanSub || !cleanSub.keys.p256dh || !cleanSub.keys.auth) {
          skipped++;
          continue;
        }

        const result = await upsertSubscription(cleanSub, fsDoc.district || '');
        if (result.action === 'created') created++;
        else updated++;

        // Small rate-limit buffer
        await new Promise(r => setTimeout(r, 50));
      } catch (e) {
        failures.push({ id: fsDoc._fsId, error: e.message });
      }
    }

    const success = failures.length === 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success,
        total,
        created,
        updated,
        skipped,
        failed: failures.length,
        failures: failures.slice(0, 20), // cap to avoid huge response
        message: success
          ? `✅ Migration complete! ${created} created, ${updated} updated, ${skipped} skipped.`
          : `⚠️ Migration finished with ${failures.length} error(s). ${created} created, ${updated} updated.`,
      }),
    };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action' }) };
};
