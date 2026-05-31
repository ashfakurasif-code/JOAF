/**
 * appwrite-db.js — Appwrite Database Client (Browser)
 * Drop-in replacement for the Firebase Firestore API surface.
 * All data goes directly to Appwrite — no Firebase dependency.
 *
 * Supported API:
 *   initializeApp, getApps, getFirestore,
 *   collection, doc, query, where, orderBy, limit,
 *   addDoc, getDoc, getDocs, setDoc, updateDoc, deleteDoc,
 *   onSnapshot, serverTimestamp, trackPageview
 */

const AW_ENDPOINT = globalThis.JOAF_ENDPOINT || globalThis.JOAF_CONFIG?.endpoint || '';
const AW_PROJECT  = globalThis.JOAF_PROJECT_ID || globalThis.JOAF_CONFIG?.projectId || '';
const AW_DB       = globalThis.JOAF_DATABASE_ID || globalThis.JOAF_CONFIG?.databaseId || '';

const DEFAULT_PERMS = ['read("any")', 'update("any")', 'delete("any")'];

let _sdkPromise = null;
let _apps       = [];

// ── App lifecycle (no-ops — kept for API compat) ─────────────────────────────
export function initializeApp(config = {}) {
  if (!_apps.length) _apps.push({ config });
  return _apps[0];
}
export function getApps() { return _apps; }
export function getFirestore() { return { __type: 'aw-db' }; }

// ── Query builders ────────────────────────────────────────────────────────────
export function collection(_db, name) { return { __type: 'col', name }; }
export function doc(_db, name, id)    { return { __type: 'doc', name, id }; }
export function query(colRef, ...constraints) { return { __type: 'query', colRef, constraints }; }
export function orderBy(field, dir = 'asc')  { return { __type: 'orderBy', field, dir }; }
export function limit(n)                     { return { __type: 'limit', n }; }
export function where(field, op, value)      { return { __type: 'where', field, op, value }; }
export function serverTimestamp()            { return new Date().toISOString(); }

// ── Internal helpers ──────────────────────────────────────────────────────────
function sanitizeId(id) {
  if (!id || id === 'unique()') return id;
  let s = String(id).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 36);
  if (!s || /^_+$/.test(s) || !/^[a-zA-Z0-9]/.test(s))
    s = 'doc_' + String(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
  if (!s || s.length < 4) s = 'doc_' + Math.random().toString(36).slice(2, 12);
  return s.slice(0, 36);
}

const TS_FIELDS = new Set(['createdAt', 'updatedAt', 'sentAt', 'ts', 'date']);

function normalizeValue(key, value) {
  if (value == null) return value;
  if (typeof value !== 'string') return value;
  const t = value.trim();
  // ISO date string → timestamp-like object (Firestore compat)
  if (TS_FIELDS.has(key) && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(t)) {
    const d = new Date(t);
    return { toDate: () => d, toMillis: () => d.getTime(), toString: () => t, _iso: t };
  }
  // JSON string → parsed object
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try { return JSON.parse(t); } catch (_) {}
  }
  return value;
}

function normalizeDoc(raw) {
  const data = { ...raw };
  ['$id','$createdAt','$updatedAt','$permissions','$databaseId','$collectionId'].forEach(k => delete data[k]);
  Object.keys(data).forEach(k => { data[k] = normalizeValue(k, data[k]); });
  return data;
}

function encodeValue(v) {
  if (v === undefined) return undefined;
  if (v instanceof Date) return v.toISOString();
  if (v && typeof v === 'object') {
    if (v._iso) return v._iso;
    if (typeof v.toDate === 'function') return v.toDate().toISOString();
    return JSON.stringify(v);
  }
  return v;
}

function encodeData(data) {
  const out = {};
  for (const [k, v] of Object.entries(data || {})) {
    const enc = encodeValue(v);
    if (enc !== undefined) out[k] = enc;
  }
  return out;
}

function makeDocRef(raw) {
  return {
    id:   raw.$id,
    data: () => normalizeDoc(raw),
    exists: () => true,
  };
}

// ── Appwrite SDK loader (lazy, singleton) ─────────────────────────────────────
function getSdk() {
  if (!_sdkPromise) {
    _sdkPromise = import('https://cdn.jsdelivr.net/npm/appwrite@13.0.1/+esm').then(
      ({ Client, Databases, Query, ID }) => {
        const client = new Client().setEndpoint(AW_ENDPOINT).setProject(AW_PROJECT);
        const db     = new Databases(client);
        return { client, db, Query, ID };
      }
    );
  }
  return _sdkPromise;
}

// ── Query compiler ────────────────────────────────────────────────────────────
async function compileQuery(ref) {
  const { Query } = await getSdk();
  let colName, constraints;

  if (ref.__type === 'col')   { colName = ref.name;         constraints = []; }
  else if (ref.__type === 'query') { colName = ref.colRef.name; constraints = ref.constraints || []; }
  else throw new Error('Invalid ref type: ' + ref.__type);

  const awQueries = [];
  for (const c of constraints) {
    if (!c) continue;
    if (c.__type === 'orderBy') awQueries.push(c.dir === 'desc' ? Query.orderDesc(c.field) : Query.orderAsc(c.field));
    else if (c.__type === 'limit') awQueries.push(Query.limit(c.n));
    else if (c.__type === 'where' && c.op === '==') awQueries.push(Query.equal(c.field, [c.value]));
  }
  return { colName, awQueries };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getDoc(docRef) {
  const { db } = await getSdk();
  const id = sanitizeId(docRef.id);
  try {
    const raw = await db.getDocument(AW_DB, docRef.name, id);
    return makeDocRef(raw);
  } catch (_) {
    return { exists: () => false, id, data: () => undefined };
  }
}

export async function getDocs(ref) {
  const { db, Query } = await getSdk();
  const { colName, awQueries } = await compileQuery(ref);
  const hasLimit = awQueries.some(q => typeof q === 'string' && q.startsWith('limit('));

  const makeSnap = (docs) => ({
    docs, empty: docs.length === 0, size: docs.length,
    forEach: fn => docs.forEach(fn),
    docChanges: () => [],
  });

  if (hasLimit) {
    const res  = await db.listDocuments(AW_DB, colName, awQueries);
    return makeSnap((res.documents || []).map(makeDocRef));
  }

  // Paginate all docs (Appwrite default page = 25)
  const PAGE = 100;
  const all  = [];
  let cursor = null;
  while (true) {
    const q = [...awQueries, Query.limit(PAGE)];
    if (cursor) q.push(Query.cursorAfter(cursor));
    let res;
    try { res = await db.listDocuments(AW_DB, colName, q); }
    catch (_) { break; }
    const page = res.documents || [];
    all.push(...page.map(makeDocRef));
    if (page.length < PAGE) break;
    cursor = page[page.length - 1].$id;
  }
  return makeSnap(all);
}

export async function addDoc(colRef, data) {
  const { db, ID } = await getSdk();
  return db.createDocument(AW_DB, colRef.name, ID.unique(), encodeData(data), DEFAULT_PERMS);
}

export async function setDoc(docRef, data, options = {}) {
  const { db } = await getSdk();
  const id      = sanitizeId(docRef.id);
  const payload = encodeData(data);
  if (options.merge) {
    let existing = {};
    try { existing = normalizeDoc(await db.getDocument(AW_DB, docRef.name, id)); } catch (_) {}
    const merged = encodeData({ ...existing, ...data });
    try { return await db.updateDocument(AW_DB, docRef.name, id, merged); }
    catch (_) { return db.createDocument(AW_DB, docRef.name, id, merged, DEFAULT_PERMS); }
  }
  try { return await db.updateDocument(AW_DB, docRef.name, id, payload); }
  catch (_) { return db.createDocument(AW_DB, docRef.name, id, payload, DEFAULT_PERMS); }
}

export async function updateDoc(docRef, data) {
  const { db } = await getSdk();
  return db.updateDocument(AW_DB, docRef.name, sanitizeId(docRef.id), encodeData(data));
}

export async function deleteDoc(docRef) {
  const { db } = await getSdk();
  return db.deleteDocument(AW_DB, docRef.name, sanitizeId(docRef.id));
}

export function onSnapshot(ref, callback) {
  let active = true;
  let unsub   = null;
  let prevIds = new Set();

  const emit = async () => {
    if (!active) return;
    const snap    = await getDocs(ref);
    const newIds  = new Set(snap.docs.map(d => d.id));
    const changes = [];
    if (prevIds.size) {
      snap.docs.forEach(d => { if (!prevIds.has(d.id)) changes.push({ type: 'added', doc: d }); });
    }
    prevIds = newIds;
    callback({ ...snap, docChanges: () => changes });
  };

  getSdk().then(({ client }) => {
    const colName = ref.__type === 'col' ? ref.name : ref.colRef?.name;
    if (colName) unsub = client.subscribe(`databases.${AW_DB}.collections.${colName}.documents`, emit);
  });

  emit().catch(() => {});
  return () => { active = false; if (unsub) unsub(); };
}

export async function trackPageview() {
  const ua  = navigator.userAgent;
  const dev = /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop';
  const ref = document.referrer || '';
  const src = ref.includes('google') ? 'Google' : ref.includes('facebook') ? 'Facebook'
    : ref.includes('t.co') || ref.includes('twitter') ? 'Twitter' : ref ? 'Referral' : 'Direct';
  try {
    await addDoc(collection(getFirestore, 'pageviews'), {
      page: location.pathname, device: dev, source: src, referrer: ref, ts: serverTimestamp(),
    });
  } catch (_) {}
}

export { AW_ENDPOINT, AW_PROJECT, AW_DB };
