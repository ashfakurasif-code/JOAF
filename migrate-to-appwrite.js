// ══════════════════════════════════════════════════════════════
// JOAF — Firestore → Appwrite Full Migration Script
// চালাও: node migrate-to-appwrite.js
// ══════════════════════════════════════════════════════════════

const FB_KEY  = 'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk';
const FB_PROJ = 'joaf-app-45753';
const FB_BASE = `https://firestore.googleapis.com/v1/projects/${FB_PROJ}/databases/(default)/documents`;

const AW_BASE = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJ = '6a11b6cd000b59f318eb';
const AW_KEY  = 'standard_4b67a7b75a3aea21254c6c866601aad3f30784f8818e5f9ec024ff27f64956f967814886192e7ce5079e67e557988e53840de1bdc2d503d39f1d3aebeccab47a30df90af576b0d91ae362203d644599f3c0b7d42277f10a3c264fc3be5ab6f04d770d959d1d318315a1cdc19f7d041a911fcb0208c3cb37f52bad824535e9b4b';
const AW_DB   = 'joaf';

const DEFAULT_COLLECTION_PERMISSIONS = ['read("any")', 'create("any")', 'update("any")', 'delete("any")'];
const DEFAULT_DOC_PERMISSIONS = ['read("any")', 'update("any")', 'delete("any")'];
const PRIVATE_DOC_PERMISSIONS = [];

const COLLECTIONS = [
  {
    fs_col: 'push_subscriptions', aw_col: 'push_subscriptions',
    fields: { endpoint:'string', subscriptionJson:'string', district:'string', active:'boolean', updatedAt:'string' },
    collectionPermissions: [],
    docPermissions: PRIVATE_DOC_PERMISSIONS
  },
  {
    fs_col: 'leaders', aw_col: 'leaders',
    fields: {
      name:'string', party:'string', role:'string', approval:'integer', cat:'string', promises:'string65535',
      statements:'string65535', controversies:'string65535', virals:'string65535',
      viral:'boolean', isDeceased:'boolean', active:'boolean', createdAt:'string'
    }
  },
  {
    fs_col: 'warriors', aw_col: 'warriors',
    fields: { name:'string', dist:'string', role:'string', type:'string', story:'string', icon:'string', approved:'boolean', createdAt:'string' }
  },
  {
    fs_col: 'members', aw_col: 'members',
    fields: { name:'string', designation:'string', cat:'string', img:'string', facebook:'string', createdAt:'string' }
  },
  {
    fs_col: 'alerts', aw_col: 'alerts',
    fields: {
      title:'string', description:'string', body:'string', type:'string', location:'string', area:'string',
      level:'string', reporter:'string', imageUrl:'string', lat:'string', lng:'string', active:'boolean', createdAt:'string'
    }
  },
  {
    fs_col: 'press_releases', aw_col: 'press_releases',
    fields: { title:'string', summary:'string', content:'string65535', date:'string', img:'string', createdAt:'string' }
  },
  {
    fs_col: 'medicines', aw_col: 'medicines',
    fields: { name:'string', generic:'string', mrp:'string', company:'string', createdAt:'string' }
  },
  {
    fs_col: 'donors', aw_col: 'donors',
    fields: { name:'string', phone:'string', blood:'string', district:'string', area:'string', lastDonate:'string', lat:'string', lng:'string', createdAt:'string' }
  },
  {
    fs_col: 'bajar_override', aw_col: 'bajar_override',
    fields: { data:'string' }, dynamic: true
  },
  {
    fs_col: 'notification_history', aw_col: 'notification_history',
    fields: { type:'string', title:'string', body:'string', url:'string', sent:'string', failed:'string', sentAt:'string' }
  },
  {
    fs_col: 'pageviews', aw_col: 'pageviews',
    fields: { page:'string', device:'string', source:'string', referrer:'string', ts:'string' }
  },
  {
    fs_col: 'notifications', aw_col: 'notifications',
    fields: { title:'string', body:'string', url:'string', image:'string', type:'string', tag:'string', createdAt:'string' }
  },
  {
    fs_col: 'leader_votes', aw_col: 'leader_votes',
    fields: { lid:'string', type:'string', ts:'string' }
  },
  {
    fs_col: 'issue_reacts', aw_col: 'issue_reacts',
    fields: { iid:'string', emoji:'string', ts:'string' }
  },
  {
    fs_col: 'poll_users', aw_col: 'poll_users',
    fields: {
      name:'string', phone:'string', streak:'integer', maxStreak:'integer', lastVote:'string',
      voteDays:'string65535', totalVotes:'integer', cycles:'integer', claimedCycles:'integer',
      votes:'string65535', rewardClaimed:'boolean', fbVerified:'boolean', updatedAt:'string'
    }
  },
  {
    fs_col: 'forum_messages', aw_col: 'forum_messages',
    fields: { roomId:'string', name:'string', text:'string', uid:'string', ts:'string' }
  },
  {
    fs_col: 'med_cache', aw_col: 'med_cache',
    fields: { data:'string65535', fetchedAt:'string' }
  },
  {
    fs_col: 'bajar_cache', aw_col: 'bajar_cache',
    fields: { data:'string65535', fetchedAt:'string' }
  },
];

// ── helpers ─────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function sanitizeId(id) {
  let s = id.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 36);
  // Must start with alphanumeric, must not be all underscores
  if (!s || /^_+$/.test(s) || !/^[a-zA-Z0-9]/.test(s)) {
    s = 'doc_' + id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
  }
  if (!s || s.length < 4) s = 'doc_' + Math.random().toString(36).slice(2, 12);
  return s.slice(0, 36);
}

// ── Firestore ────────────────────────────────────────────────
function parseDoc(doc) {
  const id = doc.name.split('/').pop();
  const fields = doc.fields || {};
  const obj = { _id: id };
  for (const [k, v] of Object.entries(fields)) {
    if      (v.stringValue   !== undefined) obj[k] = v.stringValue;
    else if (v.booleanValue  !== undefined) obj[k] = v.booleanValue;
    else if (v.integerValue  !== undefined) obj[k] = String(v.integerValue);
    else if (v.doubleValue   !== undefined) obj[k] = String(v.doubleValue);
    else if (v.timestampValue!== undefined) obj[k] = v.timestampValue;
    else if (v.mapValue) {
      const m = {};
      for (const [mk,mv] of Object.entries(v.mapValue.fields||{}))
        m[mk] = mv.stringValue ?? String(mv.integerValue ?? mv.doubleValue ?? mv.booleanValue ?? '');
      obj[k] = JSON.stringify(m);
    } else obj[k] = '';
  }
  return obj;
}

async function fsGetAll(col) {
  let docs=[], pageToken=null;
  do {
    let url = `${FB_BASE}/${col}?key=${FB_KEY}&pageSize=300`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    const r = await fetch(url);
    const d = await r.json();
    if (d.error) throw new Error(`${d.error.code}: ${d.error.message}`);
    if (d.documents) docs = docs.concat(d.documents.map(parseDoc));
    pageToken = d.nextPageToken || null;
  } while (pageToken);
  return docs;
}

// ── Appwrite ─────────────────────────────────────────────────
const AW_H = { 'Content-Type':'application/json', 'X-Appwrite-Project':AW_PROJ, 'X-Appwrite-Key':AW_KEY };

async function awColExists(col) {
  const r = await fetch(`${AW_BASE}/databases/${AW_DB}/collections/${col}`, { headers: AW_H });
  if (!r.ok) return null;
  return await r.json();
}

async function awUpdateCollectionPermissions(col, existing, permissions) {
  const body = {
    name: existing?.name || col,
    permissions,
    documentSecurity: existing?.documentSecurity ?? true,
    enabled: existing?.enabled ?? true,
  };
  const r = await fetch(`${AW_BASE}/databases/${AW_DB}/collections/${col}`, {
    method: 'PUT',
    headers: AW_H,
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const e = await r.text();
    console.log(`  ⚠️  Permissions update failed: ${(e || '').slice(0, 120)}`);
    return false;
  }
  return true;
}

async function awCreateAttr(col, key, type, size=500) {
  let url = `${AW_BASE}/databases/${AW_DB}/collections/${col}/attributes/`;
  let body = { key, required: false };
  if      (type === 'string65535') { url += 'string'; body.size = 65535; body.default = ''; }
  else if (type === 'string')  { url += 'string';  body.size = size; body.default = ''; }
  else if (type === 'integer') { url += 'integer'; body.default = 0; }
  else if (type === 'boolean') { url += 'boolean'; body.default = false; }
  const r = await fetch(url, { method:'POST', headers:AW_H, body:JSON.stringify(body) });
  if (!r.ok) { const e=await r.text(); console.log(`    ⚠️  attr ${key}: ${JSON.parse(e).message||e}`); }
}

// Critical fix: poll until ALL attributes are 'available'
async function awWaitAttrsReady(col, expectedKeys, maxWait=30000) {
  const start = Date.now();
  while (Date.now() - start < maxWait) {
    const r = await fetch(`${AW_BASE}/databases/${AW_DB}/collections/${col}`, { headers: AW_H });
    const d = await r.json();
    const attrs = d.attributes || [];
    const ready = attrs.filter(a => a.status === 'available').map(a => a.key);
    const pending = expectedKeys.filter(k => !ready.includes(k));
    if (pending.length === 0) { console.log(`    ✅ All attributes ready`); return true; }
    console.log(`    ⏳ Waiting for attrs: ${pending.join(', ')}`);
    await sleep(2000);
  }
  console.log(`    ⚠️  Timeout waiting for attributes`);
  return false;
}

async function awGetAttrs(col) {
  const r = await fetch(`${AW_BASE}/databases/${AW_DB}/collections/${col}`, { headers: AW_H });
  if (!r.ok) return [];
  const d = await r.json();
  return d.attributes || [];
}

async function awDeleteAttr(col, key) {
  const r = await fetch(`${AW_BASE}/databases/${AW_DB}/collections/${col}/attributes/${key}`, {
    method: 'DELETE', headers: AW_H
  });
  if (r.ok) console.log(`    🗑️  Deleted attr: ${key}`);
  await sleep(800);
}

// type map: script type → Appwrite type string
function awExpectedType(t) {
  if (t === 'boolean') return 'boolean';
  if (t === 'integer') return 'integer';
  return 'string'; // string, string65535
}

async function awSetupCollection(col, fields, dynamic, collectionPermissions = DEFAULT_COLLECTION_PERMISSIONS) {
  const existing = await awColExists(col);
  const exists = !!existing;

  if (!exists) {
    console.log(`  🔨 Creating collection: ${col}`);
    const r = await fetch(`${AW_BASE}/databases/${AW_DB}/collections`, {
      method:'POST', headers:AW_H,
      body: JSON.stringify({ collectionId:col, name:col, permissions: collectionPermissions })
    });
    if (!r.ok) { console.log(`  ❌ Create failed: ${(await r.text()).slice(0,100)}`); return false; }
    await sleep(1000);
  } else {
    const targetPerms = (collectionPermissions || []).slice().sort();
    const currentPerms = (existing.permissions || []).slice().sort();
    if (JSON.stringify(targetPerms) !== JSON.stringify(currentPerms)) {
      console.log(`  🔐 Updating collection permissions`);
      await awUpdateCollectionPermissions(col, existing, collectionPermissions);
    }
    console.log(`  ℹ️  Collection exists — checking schema...`);
    // ── Schema audit: delete attrs with wrong type so they get recreated ──
    const existingAttrs = await awGetAttrs(col);
    const attrMap = {};
    for (const a of existingAttrs) attrMap[a.key] = a;

    const targetFields = dynamic ? { data: 'string65535' } : fields;
    let deleted = 0;
    for (const [k, t] of Object.entries(targetFields)) {
      const existing = attrMap[k];
      if (!existing) continue; // will be created below
      const expectedType = awExpectedType(t);
      const actualType = existing.type;
      // size mismatch for string65535
      const sizeMismatch = (t === 'string65535' && existing.size && existing.size < 65535);
      if (actualType !== expectedType || sizeMismatch) {
        console.log(`    ⚠️  Schema mismatch on "${k}": expected ${expectedType}${t==='string65535'?'(65535)':''}, got ${actualType}(${existing.size||''}). Fixing...`);
        await awDeleteAttr(col, k);
        deleted++;
      }
    }
    if (deleted === 0) {
      console.log(`  ✅ Schema OK`);
      // check if all attrs already exist and are available — if so, skip wait
      const ready = existingAttrs.filter(a => a.status === 'available').map(a => a.key);
      const needed = dynamic ? ['data'] : Object.keys(fields);
      const missing = needed.filter(k => !ready.includes(k));
      if (missing.length === 0) return true;
    }
  }

  // Create missing / re-create deleted attributes
  const existingAttrs2 = await awGetAttrs(col);
  const existingKeys = existingAttrs2.map(a => a.key);

  const attrKeys = dynamic ? ['data'] : Object.keys(fields);
  if (dynamic) {
    if (!existingKeys.includes('data')) { await awCreateAttr(col, 'data', 'string', 65535); await sleep(200); }
  } else {
    for (const [k, t] of Object.entries(fields)) {
      if (!existingKeys.includes(k)) { await awCreateAttr(col, k, t); await sleep(200); }
    }
  }

  return await awWaitAttrsReady(col, attrKeys);
}

async function awInsert(col, docId, data, permissions = DEFAULT_DOC_PERMISSIONS) {
  const r = await fetch(`${AW_BASE}/databases/${AW_DB}/collections/${col}/documents`, {
    method:'POST', headers:AW_H,
    body: JSON.stringify({ documentId:docId, data, permissions })
  });
  if (r.status === 409) return 'exists';
  if (!r.ok) { const e=await r.text(); return 'fail:' + (JSON.parse(e).message||e).slice(0,80); }
  return 'ok';
}

// ── Per-collection migration ─────────────────────────────────
async function migrateCollection(config) {
  const { fs_col, aw_col, fields, dynamic } = config;
  const collectionPermissions = config.collectionPermissions ?? DEFAULT_COLLECTION_PERMISSIONS;
  const docPermissions = config.docPermissions ?? DEFAULT_DOC_PERMISSIONS;
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`📦 ${fs_col} → ${aw_col}`);

  // Layer 1: Read Firestore
  let fsDocs;
  try {
    fsDocs = await fsGetAll(fs_col);
    console.log(`  ✅ Firestore: ${fsDocs.length} docs`);
  } catch(e) {
    console.log(`  ❌ Firestore read: ${e.message}`);
    return { col:fs_col, ok:0, skip:0, fail:0, error:e.message };
  }
  if (!fsDocs.length) { console.log(`  ⚠️  Empty — skip`); return { col:fs_col, ok:0, skip:0, fail:0 }; }

  // Layer 2: Setup Appwrite collection + wait for attrs
  const ready = await awSetupCollection(aw_col, fields, dynamic, collectionPermissions);
  if (!ready) return { col:fs_col, ok:0, skip:0, fail:fsDocs.length, error:'attr setup failed' };

  // Layer 3: Insert docs
  let ok=0, skip=0, fail=0, idChanges=0;
  for (const doc of fsDocs) {
    const { _id, ...rest } = doc;
    const docId = sanitizeId(_id);
    if (docId !== _id) {
      idChanges++;
      if (idChanges <= 5) console.log(`    ⚠️  ID sanitized: ${_id} → ${docId}`);
    }

    let data;
    if (dynamic) {
      data = { data: JSON.stringify(rest) };
    } else {
      data = {};
      for (const [f, type] of Object.entries(fields)) {
        const val = rest[f];
        if (type === 'boolean') data[f] = Boolean(val);
        else if (type === 'integer') data[f] = val !== undefined && val !== null ? parseInt(val, 10) || 0 : 0;
        else data[f] = val !== undefined && val !== null ? String(val).slice(0, type === 'string65535' ? 65535 : 500) : '';
      }
    }

    const res = await awInsert(aw_col, docId, data, docPermissions);
    if      (res === 'ok')     ok++;
    else if (res === 'exists') skip++;
    else                       { fail++; console.log(`    ❌ ${docId}: ${res}`); }

    await sleep(150);
  }

  if (idChanges > 0) console.log(`  🧭 ID sanitized: ${idChanges}`);
  console.log(`  📊 ok=${ok} skip(exists)=${skip} fail=${fail}`);
  return { col:fs_col, ok, skip, fail };
}

// ── Main ─────────────────────────────────────────────────────
async function main() {
  console.log('🚀 JOAF Firestore → Appwrite Migration');
  console.log('═'.repeat(50));
  console.log(`Collections: ${COLLECTIONS.length}`);
  console.log('');

  const results = [];
  for (const config of COLLECTIONS) {
    const result = await migrateCollection(config);
    results.push(result);
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log('📊 FINAL SUMMARY:');
  let totalOk=0, totalFail=0;
  for (const r of results) {
    const icon = r.error ? '❌' : r.fail > 0 ? '⚠️ ' : '✅';
    console.log(`  ${icon} ${r.col}: ok=${r.ok} skip=${r.skip} fail=${r.fail}${r.error?' ERR:'+r.error:''}`);
    totalOk   += r.ok;
    totalFail += r.fail;
  }
  console.log(`\n  ✅ Migrated: ${totalOk}  ❌ Failed: ${totalFail}`);
  if (totalFail === 0) console.log('\n  🎉 Perfect migration!');
  else console.log('\n  ⚠️  Re-run script for failed collections (idempotent — safe to re-run)');
}

main().catch(e => { console.error('💥 Fatal:', e.message); process.exit(1); });


<script>
document.addEventListener('DOMContentLoaded',()=>{
  const ids=['batchPostBtn','postSelectedBtn','qmPostBtn'];
  ids.forEach(id=>{
    const b=document.getElementById(id);
    if(b){
      b.disabled=false;
      b.style.pointerEvents='auto';
      b.style.opacity='1';
      b.style.zIndex='99999';
    }
  });
});
</script>
