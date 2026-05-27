// netlify/functions/migrate-to-appwrite.js
// Full Firestore → Appwrite Mirror Migration
// Covers ALL collections. Chunked 8/batch. Upsert. active:true forced. Pure JSON.

'use strict';

const { Client, Databases, Query, ID } = require('node-appwrite');

// ── Config ────────────────────────────────────────────────────────────────────
const FB_API_KEY = 'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk';
const FB_PROJECT = 'joaf-app-45753';
const FB_BASE    = `https://firestore.googleapis.com/v1/projects/${FB_PROJECT}/databases/(default)/documents`;

const AW_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT  = '6a11b6cd000b59f318eb';
const AW_DB       = 'joaf';

const BATCH_SIZE  = 8;

// All collections to mirror. Schema defines which fields get written and how.
// Fields not in schema are serialised to JSON strings automatically.
// 'active' is always forced to true. 'updatedAt' always set.
const COLLECTIONS = {
  push_subscriptions: {
    idField:    'endpoint',         // field used to build deterministic ID
    idBuilder:  endpointDocId,
    normalize:  normalizePushSub,
  },
  notification_history: {
    idField:    null,               // use Firestore document ID
    normalize:  normalizeGeneric,
  },
  donors: {
    idField:    null,
    normalize:  normalizeGeneric,
  },
  alerts: {
    idField:    null,
    normalize:  normalizeGeneric,
  },
  leaders: {
    idField:    null,
    normalize:  normalizeGeneric,
  },
  warriors: {
    idField:    null,
    normalize:  normalizeGeneric,
  },
  members: {
    idField:    null,
    normalize:  normalizeGeneric,
  },
  medicines: {
    idField:    null,
    normalize:  normalizeGeneric,
  },
  press_releases: {
    idField:    null,
    normalize:  normalizeGeneric,
  },
  poll_users: {
    idField:    null,
    normalize:  normalizeGeneric,
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const H = {
  'Access-Control-Allow-Origin': '*',
  'Content-Type': 'application/json',
};

const ok  = (b) => ({ statusCode: 200, headers: H, body: JSON.stringify(b) });
const bad = (s, m) => ({ statusCode: s,   headers: H, body: JSON.stringify({ error: String(m) }) });

// ── Appwrite ID sanitiser ─────────────────────────────────────────────────────
function safeId(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 36);
  if (!s || /^_+$/.test(s) || !/^[a-zA-Z0-9]/.test(s)) {
    s = 'doc_' + String(raw).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
  }
  if (!s || s.length < 4) s = 'doc_' + Math.random().toString(36).slice(2, 12);
  return s.slice(0, 36);
}

function endpointDocId(endpoint) {
  if (!endpoint) return null;
  const b64 = Buffer.from(endpoint).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(-32);
  return b64.length >= 4 ? b64 : 'sub_' + b64;
}

// ── Firebase field decoder ────────────────────────────────────────────────────
function decodeField(v) {
  if (v === undefined || v === null) return null;
  if (v.nullValue  !== undefined) return null;
  if (v.booleanValue !== undefined) return v.booleanValue;
  if (v.integerValue !== undefined) return String(v.integerValue);
  if (v.doubleValue  !== undefined) return v.doubleValue;
  if (v.stringValue  !== undefined) return v.stringValue;
  if (v.timestampValue !== undefined) return v.timestampValue; // ISO string
  if (v.arrayValue) {
    return (v.arrayValue.values || []).map(decodeField);
  }
  if (v.mapValue) {
    const m = {};
    for (const [mk, mv] of Object.entries(v.mapValue.fields || {})) {
      m[mk] = decodeField(mv);
    }
    return m;
  }
  return null;
}

// ── Firebase REST fetcher (full paginated collection) ─────────────────────────
async function fetchFirebaseDocs(colName) {
  const all = [];
  let pageToken = null;

  do {
    let url = `${FB_BASE}/${colName}?key=${FB_API_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;

    const res = await fetch(url);

    if (res.status === 404) return []; // collection doesn't exist in Firestore
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Firebase GET /${colName} → ${res.status}: ${txt.slice(0, 300)}`);
    }

    const data = await res.json();

    for (const doc of (data.documents || [])) {
      const fbId   = doc.name.split('/').pop();
      const fields = doc.fields || {};
      const obj    = { _fbId: fbId };
      for (const [k, v] of Object.entries(fields)) {
        obj[k] = decodeField(v);
      }
      all.push(obj);
    }

    pageToken = data.nextPageToken || null;
  } while (pageToken);

  return all;
}

// ── Appwrite client ───────────────────────────────────────────────────────────
function getAppwrite() {
  const key = process.env.APPWRITE_API_KEY;
  if (!key) throw new Error('APPWRITE_API_KEY env var missing');
  const client = new Client().setEndpoint(AW_ENDPOINT).setProject(AW_PROJECT).setKey(key);
  return new Databases(client);
}

// ── Value encoder for Appwrite (no nested objects; convert to JSON string) ────
function encodeForAppwrite(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return v;
  if (Array.isArray(v) || typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function encodePayload(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue; // skip internal fields like _fbId
    const enc = encodeForAppwrite(v);
    if (enc !== undefined) out[k] = enc;
  }
  return out;
}

// ── Collection-specific normalisers ──────────────────────────────────────────
function normalizePushSub(doc) {
  let sub = doc.subscription || doc.pushSubscription || doc.subscriptionJson || doc.subscription_data;
  if (typeof sub === 'string') {
    try { sub = JSON.parse(sub); } catch (_) { sub = null; }
  }
  const endpoint = (sub && sub.endpoint) || doc.endpoint || null;
  if (!endpoint) return null; // unpersistable without endpoint

  return {
    endpoint,
    subscriptionJson: JSON.stringify(sub || { endpoint }),
    district:  typeof doc.district === 'string' ? doc.district : 'unknown',
    active:    true,
    updatedAt: new Date().toISOString(),
  };
}

function normalizeGeneric(doc) {
  const payload = {};
  for (const [k, v] of Object.entries(doc)) {
    if (k === '_fbId') continue;
    if (k === 'active') { payload.active = true; continue; } // always force true
    payload[k] = encodeForAppwrite(v);
  }
  // ensure active is always set
  payload.active    = true;
  payload.updatedAt = new Date().toISOString();
  return payload;
}

// ── Appwrite upsert ───────────────────────────────────────────────────────────
async function upsertDoc(databases, colId, docId, payload) {
  try {
    await databases.updateDocument(AW_DB, colId, docId, payload);
    return 'updated';
  } catch (e) {
    if (e.code === 404) {
      await databases.createDocument(AW_DB, colId, docId, payload);
      return 'created';
    }
    throw e;
  }
}

// ── Ensure Appwrite collection exists (best-effort) ───────────────────────────
async function ensureCollection(databases, colId) {
  try {
    await databases.getCollection(AW_DB, colId);
  } catch (e) {
    if (e.code === 404) {
      try {
        await databases.createCollection(
          AW_DB, colId, colId,
          ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
          true, true
        );
      } catch (ce) {
        if (ce.code !== 409) console.error('createCollection failed:', colId, ce.message);
      }
    }
  }
}

// ── Count documents in Appwrite collection ────────────────────────────────────
async function countAppwriteDocs(databases, colId) {
  let total = 0, offset = 0;
  const PAGE = 100;
  while (true) {
    try {
      const res = await databases.listDocuments(AW_DB, colId, [Query.limit(PAGE), Query.offset(offset)]);
      const docs = res.documents || [];
      total += docs.length;
      if (docs.length < PAGE) break;
      offset += PAGE;
    } catch (e) {
      break; // collection may not exist yet
    }
  }
  return total;
}

// ── HANDLER ───────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: H, body: '' };

  const adminKey = (event.headers?.['x-admin-key'])
    || (event.queryStringParameters?.key)
    || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) return bad(401, 'Unauthorized');

  try {
    const p      = event.queryStringParameters || {};
    const action = p.action || 'count';

    // ── action=scan : discover all FB collections + their doc counts ──────────
    if (action === 'scan') {
      const report = {};
      for (const colName of Object.keys(COLLECTIONS)) {
        try {
          const docs = await fetchFirebaseDocs(colName);
          report[colName] = { firebase: docs.length };
        } catch (e) {
          report[colName] = { firebase: 0, error: e.message };
        }
      }
      return ok({ report });
    }

    // ── action=count : count valid documents across all collections ───────────
    if (action === 'count') {
      const totals = {};
      let grandTotal = 0;

      for (const [colName, def] of Object.entries(COLLECTIONS)) {
        const docs  = await fetchFirebaseDocs(colName);
        const valid = docs.map(d => def.normalize(d)).filter(Boolean);
        totals[colName] = valid.length;
        grandTotal += valid.length;
      }

      const totalBatches = Math.ceil(grandTotal / BATCH_SIZE);
      return ok({ totals, grandTotal, totalBatches, batchSize: BATCH_SIZE });
    }

    // ── action=batch : migrate one COLLECTION batch ──────────────────────────
    if (action === 'batch') {
      const colName    = p.col;
      const batchIndex = parseInt(p.batchIndex || '0', 10);

      if (!colName || !COLLECTIONS[colName]) {
        return bad(400, `Unknown collection: ${colName}. Valid: ${Object.keys(COLLECTIONS).join(', ')}`);
      }

      const def  = COLLECTIONS[colName];
      const docs = await fetchFirebaseDocs(colName);

      // Normalise valid payloads
      const valid = docs.map((d, i) => {
        const payload = def.normalize(d);
        if (!payload) return null;
        // Determine document ID
        let docId;
        if (def.idBuilder) {
          docId = def.idBuilder(payload[def.idField]);
        } else {
          docId = safeId(d._fbId);
        }
        return { docId, payload };
      }).filter(Boolean);

      const totalBatches = Math.ceil(valid.length / BATCH_SIZE);
      const start        = batchIndex * BATCH_SIZE;
      const slice        = valid.slice(start, start + BATCH_SIZE);

      if (slice.length === 0) {
        return ok({ col: colName, batchIndex, processed: 0, created: 0, updated: 0, failed: 0, done: true, totalBatches, totalValid: valid.length });
      }

      const databases = getAppwrite();
      await ensureCollection(databases, colName);

      let created = 0, updated = 0, failed = 0;
      const errors = [];

      for (const { docId, payload } of slice) {
        try {
          const result = await upsertDoc(databases, colName, docId, payload);
          if (result === 'created') created++; else updated++;
        } catch (e) {
          failed++;
          errors.push(`${docId}: ${e.message}`);
        }
      }

      const done = (start + slice.length) >= valid.length;
      return ok({ col: colName, batchIndex, processed: slice.length, created, updated, failed, errors: errors.slice(0, 5), done, totalBatches, totalValid: valid.length });
    }

    // ── action=verify : sync report — Firebase count vs Appwrite count ────────
    if (action === 'verify') {
      const databases = getAppwrite();
      const report    = {};
      let totalFB = 0, totalAW = 0, mismatches = 0;

      for (const colName of Object.keys(COLLECTIONS)) {
        const [fbDocs, awCount] = await Promise.all([
          fetchFirebaseDocs(colName),
          countAppwriteDocs(databases, colName),
        ]);
        const fbCount = fbDocs.length;
        const match   = awCount >= fbCount; // AW can have MORE (existing data) but never less
        if (!match) mismatches++;
        totalFB += fbCount;
        totalAW += awCount;
        report[colName] = { firebase: fbCount, appwrite: awCount, status: match ? '✅ OK' : '⚠️ MISMATCH' };
      }

      return ok({ report, totalFB, totalAW, mismatches, synced: mismatches === 0 });
    }

    // ── action=fix-active : force active:true on all Appwrite docs ────────────
    if (action === 'fix-active') {
      const databases = getAppwrite();
      let fixed = 0, total = 0;

      for (const colName of Object.keys(COLLECTIONS)) {
        let offset = 0;
        const PAGE = 100;
        while (true) {
          let docs;
          try {
            const res = await databases.listDocuments(AW_DB, colName, [Query.limit(PAGE), Query.offset(offset)]);
            docs = res.documents || [];
          } catch (_) { break; }

          total += docs.length;
          for (const doc of docs) {
            if (doc.active !== true) {
              await databases.updateDocument(AW_DB, colName, doc.$id, { active: true, updatedAt: new Date().toISOString() }).catch(() => {});
              fixed++;
            }
          }
          if (docs.length < PAGE) break;
          offset += PAGE;
        }
      }

      return ok({ fixed, total, message: `${fixed}/${total} documents forced to active:true across all collections` });
    }

    return bad(400, 'Unknown action. Use: scan | count | batch | verify | fix-active');

  } catch (e) {
    console.error('migrate-to-appwrite crash:', e);
    return bad(500, e.message || 'Internal server error');
  }
};
