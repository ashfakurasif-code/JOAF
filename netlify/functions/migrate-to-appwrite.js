// netlify/functions/migrate-to-appwrite.js
// Firestore → Appwrite FULL migration (v3)
// Collections: push_subscriptions, notification_history, leaders, timeline,
//              alerts, donations, press_releases, members, warriors,
//              medicines, bajar_cache, forum_messages, leader_votes, polls
// Uses public Firestore REST API — no firebase-admin required
// Batch async upsert with rate-limit buffer + dry-run support

const {
  AW_ENDPOINT, AW_PROJECT, DB_ID, COLLECTION_ID,
  awListAll, awCreate, awUpdate, awGet,
  sanitizeId, DEFAULT_DOC_PERMISSIONS, qEqual, awList,
} = require('./aw-utils');

// ── Firestore REST ───────────────────────────────────────────────────────────
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
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) m[k] = fsFieldToValue(mv);
    return m;
  }
  if (v.arrayValue) return (v.arrayValue.values || []).map(av => fsFieldToValue(av));
  return null;
}

async function fsSafeJson(url) {
  const r = await fetch(url);
  const text = await r.text();
  if (!r.ok) throw new Error(`Firestore HTTP ${r.status}: ${text.slice(0, 300)}`);
  // Guard: if response is HTML (e.g. 502 gateway), throw clearly
  if (text.trimStart().startsWith('<')) {
    throw new Error(`Firestore returned HTML instead of JSON (HTTP ${r.status}). Check project/key.`);
  }
  return JSON.parse(text);
}

async function fsGetAllDocs(collectionName) {
  const all = [];
  let pageToken = null;
  do {
    let url = `${FS_BASE}/${collectionName}?key=${FS_API_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const data = await fsSafeJson(url);
    for (const doc of (data.documents || [])) {
      const id = doc.name.split('/').pop();
      const obj = { _fsId: id };
      for (const [k, v] of Object.entries(doc.fields || {})) obj[k] = fsFieldToValue(v);
      all.push(obj);
    }
    pageToken = data.nextPageToken || null;
  } while (pageToken);
  return all;
}

// ── Appwrite safe upsert ─────────────────────────────────────────────────────
async function awSafeJson(res) {
  const text = await res.text();
  if (text.trimStart().startsWith('<')) {
    throw new Error(`Appwrite returned HTML (HTTP ${res.status}). Function may not be deployed.`);
  }
  return JSON.parse(text);
}

async function upsertDoc(collection, docId, payload, dryRun) {
  if (dryRun) return { action: 'dry-run', id: docId };
  const headers = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': AW_PROJECT,
    'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
  };
  // Try GET
  const getRes = await fetch(
    `${AW_ENDPOINT}/databases/${DB_ID}/collections/${collection}/documents/${docId}`,
    { method: 'GET', headers }
  );
  if (getRes.ok) {
    // Update
    const upRes = await fetch(
      `${AW_ENDPOINT}/databases/${DB_ID}/collections/${collection}/documents/${docId}`,
      { method: 'PATCH', headers, body: JSON.stringify({ data: payload }) }
    );
    if (!upRes.ok) {
      const t = await upRes.text();
      throw new Error(`Update failed (${upRes.status}): ${t.slice(0,200)}`);
    }
    return { action: 'updated', id: docId };
  }
  // Create
  const crRes = await fetch(
    `${AW_ENDPOINT}/databases/${DB_ID}/collections/${collection}/documents`,
    {
      method: 'POST', headers,
      body: JSON.stringify({
        documentId: docId,
        data: payload,
        permissions: DEFAULT_DOC_PERMISSIONS,
      }),
    }
  );
  if (!crRes.ok) {
    const t = await crRes.text();
    throw new Error(`Create failed (${crRes.status}): ${t.slice(0,200)}`);
  }
  return { action: 'created', id: docId };
}

// ── Collection migrators ─────────────────────────────────────────────────────

function sanitizeStr(v, max = 255) {
  if (v === null || v === undefined) return '';
  return String(v).slice(0, max);
}

// ① push_subscriptions
function normalizeSub(fsDoc) {
  let sub = fsDoc.subscription || fsDoc.pushSubscription || fsDoc.subscriptionJson || null;
  if (typeof sub === 'string') { try { sub = JSON.parse(sub); } catch(_){sub=null;} }
  if (!sub || typeof sub !== 'object') {
    if (fsDoc.endpoint) sub = { endpoint: fsDoc.endpoint, keys: fsDoc.keys || {} };
  }
  if (!sub || !sub.endpoint) return null;
  const keys = sub.keys || fsDoc.keys || {};
  return { endpoint: sub.endpoint, keys: { p256dh: keys.p256dh||'', auth: keys.auth||'' } };
}
function epToId(ep) { return sanitizeId(Buffer.from(ep).toString('base64url').slice(-32)); }

async function migratePushSubscriptions(fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const clean = normalizeSub(fsDoc);
    if (!clean || !clean.keys.p256dh || !clean.keys.auth) { results.skipped++; continue; }
    const docId = epToId(clean.endpoint);
    const payload = {
      endpoint: clean.endpoint,
      subscriptionJson: JSON.stringify(clean),
      district: sanitizeStr(fsDoc.district, 255),
      active: true,
      updatedAt: new Date().toISOString(),
    };
    batch.push({ collection: 'push_subscriptions', docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ② notification_history
async function migrateNotificationHistory(fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const docId = sanitizeId(fsDoc._fsId || fsDoc.id || Math.random().toString(36).slice(2));
    const payload = {
      title:     sanitizeStr(fsDoc.title, 512),
      body:      sanitizeStr(fsDoc.body, 2000),
      url:       sanitizeStr(fsDoc.url, 1024),
      type:      sanitizeStr(fsDoc.type, 100),
      district:  sanitizeStr(fsDoc.district, 255),
      sentAt:    fsDoc.sentAt || fsDoc.createdAt || new Date().toISOString(),
      totalSent: typeof fsDoc.totalSent === 'number' ? fsDoc.totalSent : 0,
    };
    batch.push({ collection: 'notification_history', docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ③ leaders
async function migrateLeaders(fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const docId = sanitizeId(fsDoc._fsId || fsDoc.slug || fsDoc.name || Math.random().toString(36).slice(2));
    const payload = {
      name:       sanitizeStr(fsDoc.name, 255),
      slug:       sanitizeStr(fsDoc.slug, 255),
      party:      sanitizeStr(fsDoc.party, 255),
      district:   sanitizeStr(fsDoc.district, 255),
      position:   sanitizeStr(fsDoc.position || fsDoc.role, 255),
      photoUrl:   sanitizeStr(fsDoc.photoUrl || fsDoc.photo || fsDoc.imageUrl, 1024),
      active:     fsDoc.active !== false,
      bio:        sanitizeStr(fsDoc.bio || fsDoc.description, 5000),
      promises:   typeof fsDoc.promises === 'object' ? JSON.stringify(fsDoc.promises) : sanitizeStr(fsDoc.promises, 5000),
      statements: typeof fsDoc.statements === 'object' ? JSON.stringify(fsDoc.statements) : sanitizeStr(fsDoc.statements, 5000),
      updatedAt:  fsDoc.updatedAt || new Date().toISOString(),
    };
    batch.push({ collection: 'leaders', docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ④ timeline
async function migrateTimeline(fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const docId = sanitizeId(fsDoc._fsId || fsDoc.isoDate || Math.random().toString(36).slice(2));
    const payload = {
      isoDate:     sanitizeStr(fsDoc.isoDate || fsDoc.date, 50),
      title:       sanitizeStr(fsDoc.title, 512),
      description: sanitizeStr(fsDoc.description || fsDoc.body, 5000),
      tags:        Array.isArray(fsDoc.tags) ? fsDoc.tags.join(',') : sanitizeStr(fsDoc.tags, 1000),
      source:      sanitizeStr(fsDoc.source, 1024),
      createdAt:   fsDoc.createdAt || new Date().toISOString(),
    };
    batch.push({ collection: 'timeline', docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ⑤ alerts
async function migrateAlerts(fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const docId = sanitizeId(fsDoc._fsId || Math.random().toString(36).slice(2));
    const payload = {
      title:     sanitizeStr(fsDoc.title, 512),
      message:   sanitizeStr(fsDoc.message || fsDoc.body, 5000),
      type:      sanitizeStr(fsDoc.type, 100),
      district:  sanitizeStr(fsDoc.district, 255),
      active:    fsDoc.active !== false,
      createdAt: fsDoc.createdAt || new Date().toISOString(),
      expiresAt: fsDoc.expiresAt || null,
    };
    batch.push({ collection: 'alerts', docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ⑥ members
async function migrateMembers(fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const docId = sanitizeId(fsDoc._fsId || fsDoc.email || Math.random().toString(36).slice(2));
    const payload = {
      name:      sanitizeStr(fsDoc.name, 255),
      email:     sanitizeStr(fsDoc.email, 512),
      phone:     sanitizeStr(fsDoc.phone, 50),
      district:  sanitizeStr(fsDoc.district, 255),
      role:      sanitizeStr(fsDoc.role || 'member', 100),
      active:    fsDoc.active !== false,
      joinedAt:  fsDoc.joinedAt || fsDoc.createdAt || new Date().toISOString(),
      photoUrl:  sanitizeStr(fsDoc.photoUrl || fsDoc.photo, 1024),
    };
    batch.push({ collection: 'members', docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ⑦ press_releases
async function migratePressReleases(fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const docId = sanitizeId(fsDoc._fsId || fsDoc.slug || Math.random().toString(36).slice(2));
    const payload = {
      title:       sanitizeStr(fsDoc.title, 512),
      slug:        sanitizeStr(fsDoc.slug, 255),
      body:        sanitizeStr(fsDoc.body || fsDoc.content, 65535),
      summary:     sanitizeStr(fsDoc.summary || fsDoc.excerpt, 2000),
      date:        fsDoc.date || fsDoc.createdAt || new Date().toISOString(),
      imageUrl:    sanitizeStr(fsDoc.imageUrl || fsDoc.image, 1024),
      published:   fsDoc.published !== false,
    };
    batch.push({ collection: 'press_releases', docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ⑧ warriors (july-warriors)
async function migrateWarriors(fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const docId = sanitizeId(fsDoc._fsId || Math.random().toString(36).slice(2));
    const payload = {
      name:      sanitizeStr(fsDoc.name, 255),
      district:  sanitizeStr(fsDoc.district, 255),
      story:     sanitizeStr(fsDoc.story || fsDoc.bio, 5000),
      photoUrl:  sanitizeStr(fsDoc.photoUrl || fsDoc.photo, 1024),
      verified:  fsDoc.verified === true,
      createdAt: fsDoc.createdAt || new Date().toISOString(),
    };
    batch.push({ collection: 'warriors', docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ⑨ Generic fallback (forum_messages, leader_votes, polls, medicines, bajar_cache)
async function migrateGeneric(collectionName, fsDocs, dryRun) {
  const results = { created:0, updated:0, skipped:0, failed:0, failures:[] };
  const batch = [];
  for (const fsDoc of fsDocs) {
    const docId = sanitizeId(fsDoc._fsId || Math.random().toString(36).slice(2));
    // Flatten: stringify nested objects, truncate strings
    const payload = {};
    for (const [k, v] of Object.entries(fsDoc)) {
      if (k === '_fsId') continue;
      if (v === null || v === undefined) continue;
      if (typeof v === 'object') payload[k] = JSON.stringify(v).slice(0, 65535);
      else if (typeof v === 'string') payload[k] = v.slice(0, 65535);
      else payload[k] = v;
    }
    batch.push({ collection: collectionName, docId, payload });
  }
  return runBatch(batch, results, dryRun);
}

// ── Batch runner — concurrency 5 with 60ms buffer ───────────────────────────
async function runBatch(batch, results, dryRun, concurrency = 5) {
  for (let i = 0; i < batch.length; i += concurrency) {
    const chunk = batch.slice(i, i + concurrency);
    await Promise.all(chunk.map(async ({ collection, docId, payload }) => {
      try {
        const res = await upsertDoc(collection, docId, payload, dryRun);
        if (res.action === 'created') results.created++;
        else if (res.action === 'updated') results.updated++;
        else results.skipped++;
      } catch(e) {
        results.failed++;
        results.failures.push({ id: docId, error: e.message });
      }
    }));
    if (!dryRun) await new Promise(r => setTimeout(r, 60));
  }
  return results;
}

// ── Collection registry ──────────────────────────────────────────────────────
const COLLECTIONS = [
  { name: 'push_subscriptions',   migrator: migratePushSubscriptions },
  { name: 'notification_history', migrator: migrateNotificationHistory },
  { name: 'leaders',              migrator: migrateLeaders },
  { name: 'timeline',             migrator: migrateTimeline },
  { name: 'alerts',               migrator: migrateAlerts },
  { name: 'members',              migrator: migrateMembers },
  { name: 'press_releases',       migrator: migratePressReleases },
  { name: 'warriors',             migrator: migrateWarriors },
  { name: 'forum_messages',       migrator: (d,dr) => migrateGeneric('forum_messages', d, dr) },
  { name: 'leader_votes',         migrator: (d,dr) => migrateGeneric('leader_votes', d, dr) },
  { name: 'polls',                migrator: (d,dr) => migrateGeneric('polls', d, dr) },
  { name: 'medicines',            migrator: (d,dr) => migrateGeneric('medicines', d, dr) },
  { name: 'bajar_cache',          migrator: (d,dr) => migrateGeneric('bajar_cache', d, dr) },
];

// ── Validation ───────────────────────────────────────────────────────────────
async function validateFirestore() {
  const url = `${FS_BASE}/push_subscriptions?key=${FS_API_KEY}&pageSize=1`;
  const r = await fetch(url);
  const text = await r.text();
  if (text.trimStart().startsWith('<')) throw new Error('Firestore returned HTML — invalid project/key');
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
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error('Appwrite returned HTML — function not deployed or key missing');
  if (!res.ok) throw new Error(`Appwrite unreachable: HTTP ${res.status} — ${text.slice(0,200)}`);
  return true;
}

// ── Main handler ─────────────────────────────────────────────────────────────
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
  try { body = JSON.parse(event.body || '{}'); } catch(_) {}

  const action  = body.action  || 'migrate';
  const dryRun  = body.dryRun  === true;
  // Optional: only migrate specific collections; default = all
  const only    = Array.isArray(body.only) ? body.only : null;

  // ── VALIDATE ────────────────────────────────────────────────────────────────
  if (action === 'validate') {
    const results = { firestore: false, appwrite: false, errors: [] };
    try { await validateFirestore(); results.firestore = true; }
    catch(e) { results.errors.push('Firestore: ' + e.message); }
    try { await validateAppwrite(); results.appwrite = true; }
    catch(e) { results.errors.push('Appwrite: ' + e.message); }
    const ok = results.firestore && results.appwrite;
    return { statusCode: ok?200:503, headers, body: JSON.stringify({ ok, ...results }) };
  }

  // ── DRY-RUN / MIGRATE ────────────────────────────────────────────────────────
  if (action === 'migrate' || action === 'dry-run') {
    const isDry = (action === 'dry-run') || dryRun;

    // Pre-flight
    try { await validateFirestore(); }
    catch(e) { return { statusCode:503, headers, body: JSON.stringify({ error:'Pre-flight Firestore: '+e.message }) }; }
    try { await validateAppwrite(); }
    catch(e) { return { statusCode:503, headers, body: JSON.stringify({ error:'Pre-flight Appwrite: '+e.message }) }; }

    const summary = { dryRun: isDry, collections: {}, totalCreated:0, totalUpdated:0, totalSkipped:0, totalFailed:0, allFailures:[] };
    const targets = COLLECTIONS.filter(c => !only || only.includes(c.name));

    for (const col of targets) {
      let fsDocs = [];
      try {
        fsDocs = await fsGetAllDocs(col.name);
      } catch(e) {
        // Collection may not exist in Firestore — skip gracefully
        summary.collections[col.name] = { skipped: 0, note: 'Firestore collection empty or not found: ' + e.message };
        continue;
      }

      if (!fsDocs.length) {
        summary.collections[col.name] = { total:0, created:0, updated:0, skipped:0, failed:0, note:'empty' };
        continue;
      }

      const res = await col.migrator(fsDocs, isDry);
      summary.collections[col.name] = { total: fsDocs.length, ...res };
      summary.totalCreated  += res.created  || 0;
      summary.totalUpdated  += res.updated  || 0;
      summary.totalSkipped  += res.skipped  || 0;
      summary.totalFailed   += res.failed   || 0;
      summary.allFailures.push(...(res.failures||[]).map(f => ({ collection: col.name, ...f })));
    }

    summary.allFailures = summary.allFailures.slice(0, 50); // cap
    const success = summary.totalFailed === 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        success,
        dryRun: isDry,
        ...summary,
        message: isDry
          ? `🔍 Dry-run complete. Would create ${summary.totalCreated}, update ${summary.totalUpdated}, skip ${summary.totalSkipped} across ${targets.length} collections.`
          : (success
              ? `✅ Migration complete! ${summary.totalCreated} created, ${summary.totalUpdated} updated, ${summary.totalSkipped} skipped across ${targets.length} collections.`
              : `⚠️ Migration done with ${summary.totalFailed} error(s). ${summary.totalCreated} created, ${summary.totalUpdated} updated.`),
      }),
    };
  }

  return { statusCode: 400, headers, body: JSON.stringify({ error: 'Unknown action. Use: validate | migrate | dry-run' }) };
};
