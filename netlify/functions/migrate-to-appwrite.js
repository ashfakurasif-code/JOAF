// netlify/functions/migrate-to-appwrite.js  v4
// Firestore → Appwrite FULL migration
// Strategy: "migrate-collection" action handles ONE collection at a time
//           with offset+limit — frontend calls repeatedly (chunked) to beat
//           Netlify's 10-second function timeout.
// Actions: validate | dry-run | fetch-counts | migrate-collection

const {
  AW_ENDPOINT, AW_PROJECT, DB_ID, COLLECTION_ID,
  sanitizeId, DEFAULT_DOC_PERMISSIONS,
} = require('./aw-utils');

// ── Firestore REST ────────────────────────────────────────────────────────────
const FS_PROJECT = 'joaf-app-45753';
const FS_API_KEY = 'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk';
const FS_BASE    = `https://firestore.googleapis.com/v1/projects/${FS_PROJECT}/databases/(default)/documents`;

function fsFieldToValue(v) {
  if (!v || typeof v !== 'object') return null;
  if (v.stringValue   !== undefined) return v.stringValue;
  if (v.booleanValue  !== undefined) return v.booleanValue;
  if (v.integerValue  !== undefined) return parseInt(v.integerValue, 10);
  if (v.doubleValue   !== undefined) return parseFloat(v.doubleValue);
  if (v.nullValue     !== undefined) return null;
  if (v.timestampValue !== undefined) return v.timestampValue;
  if (v.mapValue) {
    const m = {};
    for (const [k, mv] of Object.entries(v.mapValue.fields || {})) m[k] = fsFieldToValue(mv);
    return m;
  }
  if (v.arrayValue) return (v.arrayValue.values || []).map(av => fsFieldToValue(av));
  return null;
}

async function fsRaw(url) {
  const r = await fetch(url);
  const text = await r.text();
  if (text.trimStart().startsWith('<'))
    throw new Error(`Firestore returned HTML (HTTP ${r.status}) — bad project/key`);
  if (!r.ok) throw new Error(`Firestore HTTP ${r.status}: ${text.slice(0,300)}`);
  return JSON.parse(text);
}

// Fetch ALL docs from a Firestore collection (pagination)
async function fsGetAllDocs(collectionName) {
  const all = [];
  let pageToken = null;
  do {
    let url = `${FS_BASE}/${collectionName}?key=${FS_API_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${encodeURIComponent(pageToken)}`;
    const data = await fsRaw(url);
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

// ── Appwrite upsert (REST, no SDK) ────────────────────────────────────────────
const AW_HEADERS = () => ({
  'Content-Type': 'application/json',
  'X-Appwrite-Project': AW_PROJECT,
  'X-Appwrite-Key': process.env.APPWRITE_API_KEY,
});

function sanitizePayload(payload) {
  // Appwrite: values must be scalar or array of scalars — no nested objects
  const out = {};
  for (const [k, v] of Object.entries(payload)) {
    if (v === null || v === undefined) continue;
    if (typeof v === 'object') out[k] = JSON.stringify(v).slice(0, 65535);
    else if (typeof v === 'string') out[k] = v.slice(0, 65535);
    else out[k] = v;
  }
  return out;
}

async function awUpsert(collection, docId, payload) {
  const h = AW_HEADERS();
  const base = `${AW_ENDPOINT}/databases/${DB_ID}/collections/${collection}/documents`;
  const safeId = sanitizeId(docId);
  const data   = sanitizePayload(payload);

  // GET
  const getRes = await fetch(`${base}/${safeId}`, { method: 'GET', headers: h });
  if (getRes.ok) {
    const upRes = await fetch(`${base}/${safeId}`, {
      method: 'PATCH', headers: h, body: JSON.stringify({ data }),
    });
    if (!upRes.ok) {
      const t = await upRes.text();
      throw new Error(`PATCH ${safeId} → ${upRes.status}: ${t.slice(0,200)}`);
    }
    return 'updated';
  }

  // CREATE
  const crRes = await fetch(base, {
    method: 'POST', headers: h,
    body: JSON.stringify({ documentId: safeId, data, permissions: DEFAULT_DOC_PERMISSIONS }),
  });
  if (!crRes.ok) {
    const t = await crRes.text();
    throw new Error(`POST ${safeId} → ${crRes.status}: ${t.slice(0,200)}`);
  }
  return 'created';
}

// ── Normalizers per collection ────────────────────────────────────────────────
const ss = (v, max=255) => v==null ? '' : String(v).slice(0,max);

function normalizersFor(colName, fsDoc) {
  const id = sanitizeId(fsDoc._fsId || Math.random().toString(36).slice(2));
  switch (colName) {

    case 'push_subscriptions': {
      let sub = fsDoc.subscription || fsDoc.pushSubscription || fsDoc.subscriptionJson || null;
      if (typeof sub === 'string') { try { sub = JSON.parse(sub); } catch(_){sub=null;} }
      if (!sub || typeof sub !== 'object') {
        if (fsDoc.endpoint) sub = { endpoint: fsDoc.endpoint, keys: fsDoc.keys||{} };
      }
      if (!sub || !sub.endpoint) return null;
      const keys = sub.keys || fsDoc.keys || {};
      if (!keys.p256dh || !keys.auth) return null;
      const ep  = sub.endpoint;
      const did = sanitizeId(Buffer.from(ep).toString('base64url').slice(-32));
      return { id: did, payload: {
        endpoint: ep,
        subscriptionJson: JSON.stringify({ endpoint:ep, keys }),
        district: ss(fsDoc.district, 255),
        active: true,
        updatedAt: new Date().toISOString(),
      }};
    }

    case 'notification_history':
      return { id, payload: {
        title:     ss(fsDoc.title, 512),
        body:      ss(fsDoc.body||fsDoc.message, 2000),
        url:       ss(fsDoc.url, 1024),
        type:      ss(fsDoc.type, 100),
        district:  ss(fsDoc.district, 255),
        sentAt:    ss(fsDoc.sentAt||fsDoc.createdAt||new Date().toISOString(), 50),
        totalSent: typeof fsDoc.totalSent==='number' ? fsDoc.totalSent : 0,
      }};

    case 'leaders':
      return { id: sanitizeId(fsDoc._fsId||fsDoc.slug||fsDoc.name||id), payload: {
        name:       ss(fsDoc.name, 255),
        slug:       ss(fsDoc.slug, 255),
        party:      ss(fsDoc.party, 255),
        district:   ss(fsDoc.district, 255),
        position:   ss(fsDoc.position||fsDoc.role, 255),
        photoUrl:   ss(fsDoc.photoUrl||fsDoc.photo||fsDoc.imageUrl, 1024),
        active:     fsDoc.active !== false,
        bio:        ss(fsDoc.bio||fsDoc.description, 5000),
        promises:   typeof fsDoc.promises==='object' ? JSON.stringify(fsDoc.promises) : ss(fsDoc.promises,5000),
        statements: typeof fsDoc.statements==='object' ? JSON.stringify(fsDoc.statements) : ss(fsDoc.statements,5000),
        updatedAt:  ss(fsDoc.updatedAt||new Date().toISOString(), 50),
      }};

    case 'donors':
      return { id: sanitizeId(fsDoc._fsId||fsDoc.email||id), payload: {
        name:      ss(fsDoc.name, 255),
        email:     ss(fsDoc.email, 512),
        phone:     ss(fsDoc.phone, 50),
        amount:    typeof fsDoc.amount==='number' ? fsDoc.amount : parseFloat(fsDoc.amount)||0,
        currency:  ss(fsDoc.currency||'BDT', 10),
        district:  ss(fsDoc.district, 255),
        message:   ss(fsDoc.message||fsDoc.note, 2000),
        method:    ss(fsDoc.method||fsDoc.paymentMethod, 100),
        status:    ss(fsDoc.status||'confirmed', 50),
        donatedAt: ss(fsDoc.donatedAt||fsDoc.createdAt||new Date().toISOString(), 50),
        anonymous: fsDoc.anonymous === true,
      }};

    case 'timeline':
      return { id: sanitizeId(fsDoc._fsId||fsDoc.isoDate||id), payload: {
        isoDate:     ss(fsDoc.isoDate||fsDoc.date, 50),
        title:       ss(fsDoc.title, 512),
        description: ss(fsDoc.description||fsDoc.body, 5000),
        tags:        Array.isArray(fsDoc.tags) ? fsDoc.tags.join(',') : ss(fsDoc.tags, 1000),
        source:      ss(fsDoc.source, 1024),
        createdAt:   ss(fsDoc.createdAt||new Date().toISOString(), 50),
      }};

    case 'alerts':
      return { id, payload: {
        title:     ss(fsDoc.title, 512),
        message:   ss(fsDoc.message||fsDoc.body, 5000),
        type:      ss(fsDoc.type, 100),
        district:  ss(fsDoc.district, 255),
        active:    fsDoc.active !== false,
        createdAt: ss(fsDoc.createdAt||new Date().toISOString(), 50),
        expiresAt: ss(fsDoc.expiresAt||'', 50)||null,
      }};

    case 'members':
      return { id: sanitizeId(fsDoc._fsId||fsDoc.email||id), payload: {
        name:     ss(fsDoc.name, 255),
        email:    ss(fsDoc.email, 512),
        phone:    ss(fsDoc.phone, 50),
        district: ss(fsDoc.district, 255),
        role:     ss(fsDoc.role||'member', 100),
        active:   fsDoc.active !== false,
        joinedAt: ss(fsDoc.joinedAt||fsDoc.createdAt||new Date().toISOString(), 50),
        photoUrl: ss(fsDoc.photoUrl||fsDoc.photo, 1024),
      }};

    case 'press_releases':
      return { id: sanitizeId(fsDoc._fsId||fsDoc.slug||id), payload: {
        title:     ss(fsDoc.title, 512),
        slug:      ss(fsDoc.slug, 255),
        body:      ss(fsDoc.body||fsDoc.content, 65535),
        summary:   ss(fsDoc.summary||fsDoc.excerpt, 2000),
        date:      ss(fsDoc.date||fsDoc.createdAt||new Date().toISOString(), 50),
        imageUrl:  ss(fsDoc.imageUrl||fsDoc.image, 1024),
        published: fsDoc.published !== false,
      }};

    case 'warriors':
      return { id, payload: {
        name:      ss(fsDoc.name, 255),
        district:  ss(fsDoc.district, 255),
        story:     ss(fsDoc.story||fsDoc.bio, 5000),
        photoUrl:  ss(fsDoc.photoUrl||fsDoc.photo, 1024),
        verified:  fsDoc.verified === true,
        createdAt: ss(fsDoc.createdAt||new Date().toISOString(), 50),
      }};

    default: {
      // Generic: flatten all fields
      const payload = {};
      for (const [k, v] of Object.entries(fsDoc)) {
        if (k === '_fsId') continue;
        if (v === null || v === undefined) continue;
        payload[k] = typeof v === 'object' ? JSON.stringify(v).slice(0,65535) : String(v).slice(0,65535);
      }
      return { id, payload };
    }
  }
}

// ── Validation ────────────────────────────────────────────────────────────────
async function validateFirestore() {
  const url = `${FS_BASE}/push_subscriptions?key=${FS_API_KEY}&pageSize=1`;
  const r = await fetch(url);
  const text = await r.text();
  if (text.trimStart().startsWith('<')) throw new Error('Firestore returned HTML — bad project/key');
  if (!r.ok) throw new Error(`Firestore HTTP ${r.status}`);
  return true;
}

async function validateAppwrite() {
  const res = await fetch(
    `${AW_ENDPOINT}/databases/${DB_ID}/collections/${COLLECTION_ID}/documents?limit=1`,
    { headers: AW_HEADERS() }
  );
  const text = await res.text();
  if (text.trimStart().startsWith('<')) throw new Error('Appwrite returned HTML — function not deployed or key missing');
  if (!res.ok) throw new Error(`Appwrite HTTP ${res.status}: ${text.slice(0,200)}`);
  return true;
}

// ── ALL known collections ─────────────────────────────────────────────────────
const ALL_COLLECTIONS = [
  'push_subscriptions','notification_history','leaders','donors',
  'timeline','alerts','members','press_releases','warriors',
  'forum_messages','leader_votes','polls','medicines','bajar_cache',
  'blood_requests','food_aid','jobs','pageviews','poll_users',
  'issue_reacts','bajar_override','med_cache','notifications',
];

// ── Main handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode:200, headers, body:'' };
  if (event.httpMethod !== 'POST')
    return { statusCode:405, headers, body: JSON.stringify({ error:'Method not allowed' }) };

  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY)
    return { statusCode:401, headers, body: JSON.stringify({ error:'Unauthorized' }) };

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch(_) {}

  const action = body.action || 'migrate-collection';

  // ── 1. VALIDATE ─────────────────────────────────────────────────────────────
  if (action === 'validate') {
    const results = { firestore:false, appwrite:false, errors:[] };
    try { await validateFirestore(); results.firestore = true; } catch(e) { results.errors.push('Firestore: '+e.message); }
    try { await validateAppwrite(); results.appwrite = true; }   catch(e) { results.errors.push('Appwrite: '+e.message); }
    const ok = results.firestore && results.appwrite;
    return { statusCode: ok?200:503, headers, body: JSON.stringify({ ok, ...results }) };
  }

  // ── 2. FETCH-COUNTS (dry-run: scan all collections, return totals) ───────────
  if (action === 'fetch-counts') {
    const counts = {};
    for (const col of ALL_COLLECTIONS) {
      try {
        const docs = await fsGetAllDocs(col);
        counts[col] = docs.length;
      } catch(_) {
        counts[col] = 0;
      }
    }
    return { statusCode:200, headers, body: JSON.stringify({ ok:true, counts }) };
  }

  // ── 3. DRY-RUN (fast path — just count, no writes) ──────────────────────────
  if (action === 'dry-run') {
    try { await validateFirestore(); } catch(e) { return { statusCode:503, headers, body: JSON.stringify({ error:'Firestore: '+e.message }) }; }
    try { await validateAppwrite(); }  catch(e) { return { statusCode:503, headers, body: JSON.stringify({ error:'Appwrite: '+e.message }) }; }

    const counts = {};
    let total = 0;
    for (const col of ALL_COLLECTIONS) {
      try { const d = await fsGetAllDocs(col); counts[col] = d.length; total += d.length; }
      catch(_) { counts[col] = 0; }
    }
    return { statusCode:200, headers, body: JSON.stringify({
      ok:true, dryRun:true, total, counts,
      message:`🔍 Dry-run: ${total} total docs found across ${ALL_COLLECTIONS.length} collections.`
    })};
  }

  // ── 4. MIGRATE-COLLECTION  ←  KEY ACTION ────────────────────────────────────
  // Body: { action:"migrate-collection", collection:"leaders", offset:0, limit:25 }
  if (action === 'migrate-collection') {
    const colName = body.collection;
    if (!colName) return { statusCode:400, headers, body: JSON.stringify({ error:'collection required' }) };

    const offset   = parseInt(body.offset, 10)  || 0;
    const limit    = parseInt(body.limit,  10)  || 25;

    // Fetch ALL docs (cached implicitly per invocation)
    let allDocs;
    try { allDocs = await fsGetAllDocs(colName); }
    catch(e) {
      // Empty / non-existent collection — not a fatal error
      return { statusCode:200, headers, body: JSON.stringify({
        ok:true, collection:colName, total:0, processed:0,
        created:0, updated:0, skipped:0, failed:0, failures:[],
        done:true, nextOffset:0,
        note:'Firestore collection empty or missing: '+e.message,
      })};
    }

    const total   = allDocs.length;
    const chunk   = allDocs.slice(offset, offset + limit);
    let created=0, updated=0, skipped=0, failed=0;
    const failures = [];

    // Process chunk with concurrency=8
    const CONCURRENCY = 8;
    for (let i = 0; i < chunk.length; i += CONCURRENCY) {
      const slice = chunk.slice(i, i + CONCURRENCY);
      await Promise.all(slice.map(async (fsDoc) => {
        try {
          const norm = normalizersFor(colName, fsDoc);
          if (!norm) { skipped++; return; }
          const action = await awUpsert(colName, norm.id, norm.payload);
          if (action === 'created') created++;
          else updated++;
        } catch(e) {
          failed++;
          failures.push({ id: fsDoc._fsId || '?', error: e.message.slice(0,200) });
        }
      }));
      // Small buffer between concurrency groups
      if (i + CONCURRENCY < chunk.length) await new Promise(r => setTimeout(r, 40));
    }

    const nextOffset = offset + chunk.length;
    const done       = nextOffset >= total;

    return { statusCode:200, headers, body: JSON.stringify({
      ok: true,
      collection: colName,
      total,
      processed: chunk.length,
      created, updated, skipped, failed,
      failures: failures.slice(0, 20),
      done,
      nextOffset: done ? total : nextOffset,
    })};
  }

  // ── 5. VALIDATE-SCHEMA (chunked, timeout-safe) ─────────────────────────────
  // Each call handles ONE collection so we stay well under Netlify's 10s limit.
  // Frontend calls: { action:'validate-schema', collection:'all' }  → get list
  //                 { action:'validate-schema', collection:'donors' } → patch that col
  if (action === 'validate-schema') {
    const SDK = require('node-appwrite');
    const client = new SDK.Client()
      .setEndpoint(AW_ENDPOINT).setProject(AW_PROJECT).setKey(process.env.APPWRITE_API_KEY);
    const db = new SDK.Databases(client);

    const SCHEMAS = {
      donors: [
        { key:'name',      type:'string',   size:255  },
        { key:'email',     type:'string',   size:512  },
        { key:'phone',     type:'string',   size:50   },
        { key:'blood',     type:'string',   size:10   },
        { key:'amount',    type:'float'               },
        { key:'currency',  type:'string',   size:10   },
        { key:'district',  type:'string',   size:255  },
        { key:'area',      type:'string',   size:255  },
        { key:'message',   type:'string',   size:2000 },
        { key:'method',    type:'string',   size:100  },
        { key:'status',    type:'string',   size:50   },
        { key:'donatedAt', type:'string',   size:50   },
        { key:'anonymous', type:'boolean'             },
        { key:'available', type:'boolean'             },
        { key:'lastDonate',type:'string',   size:50   },
        { key:'lat',       type:'float'               },
        { key:'lng',       type:'float'               },
        { key:'createdAt', type:'string',   size:50   },
      ],
      notification_history: [
        { key:'title',     type:'string',   size:512  },
        { key:'body',      type:'string',   size:2000 },
        { key:'url',       type:'string',   size:1024 },
        { key:'type',      type:'string',   size:100  },
        { key:'district',  type:'string',   size:255  },
        { key:'sentAt',    type:'string',   size:50   },
        { key:'totalSent', type:'integer'             },
      ],
      leaders: [
        { key:'name',       type:'string',  size:255  },
        { key:'slug',       type:'string',  size:255  },
        { key:'party',      type:'string',  size:255  },
        { key:'district',   type:'string',  size:255  },
        { key:'position',   type:'string',  size:255  },
        { key:'photoUrl',   type:'string',  size:1024 },
        { key:'active',     type:'boolean'            },
        { key:'bio',        type:'string',  size:5000 },
        { key:'promises',   type:'string',  size:5000 },
        { key:'statements', type:'string',  size:5000 },
        { key:'updatedAt',  type:'string',  size:50   },
      ],
      alerts: [
        { key:'title',     type:'string',   size:512  },
        { key:'message',   type:'string',   size:5000 },
        { key:'type',      type:'string',   size:100  },
        { key:'district',  type:'string',   size:255  },
        { key:'active',    type:'boolean'             },
        { key:'createdAt', type:'string',   size:50   },
        { key:'expiresAt', type:'string',   size:50   },
      ],
      members: [
        { key:'name',     type:'string',    size:255  },
        { key:'email',    type:'string',    size:512  },
        { key:'phone',    type:'string',    size:50   },
        { key:'district', type:'string',    size:255  },
        { key:'role',     type:'string',    size:100  },
        { key:'active',   type:'boolean'              },
        { key:'joinedAt', type:'string',    size:50   },
        { key:'photoUrl', type:'string',    size:1024 },
      ],
      press_releases: [
        { key:'title',     type:'string',   size:512   },
        { key:'slug',      type:'string',   size:255   },
        { key:'body',      type:'string',   size:65535 },
        { key:'summary',   type:'string',   size:2000  },
        { key:'date',      type:'string',   size:50    },
        { key:'imageUrl',  type:'string',   size:1024  },
        { key:'published', type:'boolean'              },
      ],
    };
    const INDEX_DEFS = {
      donors:               [{ key:'district_idx',  fields:['district'],  orders:['ASC']  }, { key:'status_idx',    fields:['status'],    orders:['ASC']  }],
      notification_history: [{ key:'sentAt_idx',    fields:['sentAt'],    orders:['DESC'] }],
      leaders:              [{ key:'active_idx',    fields:['active'],    orders:['ASC']  }, { key:'slug_idx',      fields:['slug'],      orders:['ASC']  }],
      alerts:               [{ key:'active_idx',    fields:['active'],    orders:['ASC']  }, { key:'district_idx',  fields:['district'],  orders:['ASC']  }],
      members:              [{ key:'district_idx',  fields:['district'],  orders:['ASC']  }, { key:'active_idx',    fields:['active'],    orders:['ASC']  }],
      press_releases:       [{ key:'published_idx', fields:['published'], orders:['ASC']  }, { key:'date_idx',      fields:['date'],      orders:['DESC'] }],
    };

    const targetCol = (body && body.collection) || 'all';

    // "all" mode — return collection list only, no SDK calls (instant response)
    if (targetCol === 'all') {
      return { statusCode:200, headers, body: JSON.stringify({
        ok: true,
        collections: Object.keys(SCHEMAS),
        message: 'Call validate-schema with each collection name to patch attributes + indexes',
      })};
    }

    const attrDefs = SCHEMAS[targetCol];
    if (!attrDefs) {
      return { statusCode:400, headers, body: JSON.stringify({ error: 'Unknown collection: ' + targetCol }) };
    }

    const result = {
      collection: targetCol,
      checked: attrDefs.length,
      patched: [], attrErrors: [],
      indexPatched: [], indexSkipped: [], indexErrors: [],
    };

    // ── Attributes ──────────────────────────────────────────────────────────
    let existing = [];
    try {
      const res = await db.listAttributes(DB_ID, targetCol);
      existing = (res.attributes || []).map(a => a.key);
    } catch(e) {
      return { statusCode:200, headers, body: JSON.stringify({
        ok:false, ...result, attrErrors: ['listAttributes: ' + e.message.slice(0,100)]
      })};
    }

    for (const attr of attrDefs) {
      if (existing.includes(attr.key)) continue;
      try {
        if      (attr.type === 'string')  await db.createStringAttribute(DB_ID, targetCol, attr.key, attr.size || 255, false, '', false);
        else if (attr.type === 'boolean') await db.createBooleanAttribute(DB_ID, targetCol, attr.key, false, false);
        else if (attr.type === 'integer') await db.createIntegerAttribute(DB_ID, targetCol, attr.key, false, null, null, 0);
        else if (attr.type === 'float')   await db.createFloatAttribute(DB_ID, targetCol, attr.key, false, null, null, 0);
        result.patched.push(attr.key);
        await new Promise(r => setTimeout(r, 250)); // Appwrite needs brief gap
      } catch(e) {
        if (e.code !== 409) result.attrErrors.push(attr.key + ': ' + e.message.slice(0,80));
      }
    }

    // ── Indexes ──────────────────────────────────────────────────────────────
    const idxDefs = INDEX_DEFS[targetCol] || [];
    let existingIdxs = [];
    try {
      const res = await db.listIndexes(DB_ID, targetCol);
      existingIdxs = (res.indexes || []).map(i => i.key);
    } catch(e) { result.indexErrors.push('listIndexes: ' + e.message.slice(0,80)); }

    for (const idx of idxDefs) {
      if (existingIdxs.includes(idx.key)) { result.indexSkipped.push(idx.key); continue; }
      try {
        await db.createIndex(DB_ID, targetCol, idx.key, 'key', idx.fields, idx.orders);
        result.indexPatched.push(idx.key);
        await new Promise(r => setTimeout(r, 400));
      } catch(e) {
        if (e.code !== 409) result.indexErrors.push(idx.key + ': ' + e.message.slice(0,80));
        else result.indexSkipped.push(idx.key);
      }
    }

    return { statusCode:200, headers, body: JSON.stringify({ ok:true, ...result }) };
  }

  return { statusCode:400, headers, body: JSON.stringify({ error:'Unknown action. Use: validate | dry-run | fetch-counts | migrate-collection | validate-schema' }) };
};

// NOTE: The handler above is the canonical export.
// validate-schema action is injected via monkey-patch below.
