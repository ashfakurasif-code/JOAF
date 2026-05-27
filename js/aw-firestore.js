const AW_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT = '6a11b6cd000b59f318eb';
const AW_DB = 'joaf';
const DEFAULT_DOC_PERMISSIONS = ['read("any")', 'update("any")', 'delete("any")'];

let _sdkPromise;
let _apps = [];

function ensureApps() {
  if (!_apps) _apps = [];
  return _apps;
}

export function initializeApp(config = {}) {
  const apps = ensureApps();
  if (!apps.length) apps.push({ config });
  return apps[0];
}

export function getApps() {
  return ensureApps();
}

export function getFirestore() {
  return { __type: 'aw-db' };
}

export function collection(_db, name) {
  return { __type: 'collection', name };
}

export function doc(_db, name, id) {
  return { __type: 'doc', name, id };
}

export function query(colRef, ...constraints) {
  return { __type: 'query', colRef, constraints };
}

export function orderBy(field, direction = 'asc') {
  return { __type: 'orderBy', field, direction };
}

export function limit(n) {
  return { __type: 'limit', n };
}

export function where(field, op, value) {
  return { __type: 'where', field, op, value };
}

export function serverTimestamp() {
  return new Date().toISOString();
}

function isIsoDate(value) {
  return typeof value === 'string' && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value);
}

function makeTimestamp(iso) {
  const d = new Date(iso);
  return {
    toDate: () => d,
    toMillis: () => d.getTime(),
    toString: () => iso,
    _iso: iso,
  };
}

function looksJson(value) {
  if (typeof value !== 'string') return false;
  const t = value.trim();
  if (!t) return false;
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'));
}

const TIMESTAMP_FIELDS = new Set(['createdAt', 'updatedAt', 'sentAt', 'ts']);

function normalizeValue(key, value) {
  if (value == null) return value;
  if (typeof value === 'string') {
    if (TIMESTAMP_FIELDS.has(key) && isIsoDate(value)) return makeTimestamp(value);
    if (looksJson(value)) {
      try {
        return JSON.parse(value);
      } catch (e) {
        return value;
      }
    }
  }
  return value;
}

function normalizeData(doc) {
  const data = { ...doc };
  delete data.$id;
  delete data.$createdAt;
  delete data.$updatedAt;
  delete data.$permissions;
  Object.keys(data).forEach(key => {
    data[key] = normalizeValue(key, data[key]);
  });
  return data;
}

function encodeValue(value) {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') {
    if (value._iso) return value._iso;
    if (typeof value.toDate === 'function' && typeof value.toMillis === 'function') {
      return value.toDate().toISOString();
    }
    return JSON.stringify(value);
  }
  return value;
}

function encodeData(data) {
  const out = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    const encoded = encodeValue(value);
    if (encoded !== undefined) out[key] = encoded;
  });
  return out;
}

function sanitizeId(id) {
  let s = String(id).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 36);
  if (!s || /^_+$/.test(s) || !/^[a-zA-Z0-9]/.test(s)) {
    s = 'doc_' + String(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
  }
  if (!s || s.length < 4) s = 'doc_' + Math.random().toString(36).slice(2, 12);
  return s.slice(0, 36);
}

function safeDocId(id) {
  if (!id || id === 'unique()') return id;
  return sanitizeId(id);
}

let _sessionReady = null;

async function ensureSession(client) {
  if (_sessionReady) return _sessionReady;
  _sessionReady = (async () => {
    try {
      const { Account } = await import('https://cdn.jsdelivr.net/npm/appwrite@13.0.1/+esm');
      const acc = new Account(client);
      try { await acc.get(); } catch(e) {
        if (e.code === 401) { try { await acc.createAnonymousSession(); } catch(e2) {} }
      }
    } catch(e) {}
  })();
  return _sessionReady;
}

async function getSdk() {
  if (!_sdkPromise) {
    _sdkPromise = (async () => {
      const { Client, Databases, Query, ID } = await import('https://cdn.jsdelivr.net/npm/appwrite@13.0.1/+esm');
      const client = new Client();
      client.setEndpoint(AW_ENDPOINT).setProject(AW_PROJECT);
      await ensureSession(client);
      const db = new Databases(client);
      return { client, db, Query, ID };
    })();
  }
  return _sdkPromise;
}

function buildQuery(ref) {
  if (ref.__type === 'collection') {
    return { collection: ref.name, constraints: [] };
  }
  if (ref.__type === 'query') {
    return { collection: ref.colRef.name, constraints: ref.constraints || [] };
  }
  throw new Error('Invalid query reference');
}

async function buildQueries(constraints) {
  const { Query } = await getSdk();
  const queries = [];
  (constraints || []).forEach(c => {
    if (!c) return;
    if (c.__type === 'orderBy') {
      queries.push(c.direction === 'desc' ? Query.orderDesc(c.field) : Query.orderAsc(c.field));
    } else if (c.__type === 'limit') {
      queries.push(Query.limit(c.n));
    } else if (c.__type === 'where') {
      if (c.op === '==') queries.push(Query.equal(c.field, [c.value]));
    }
  });
  return queries;
}

function makeDoc(doc) {
  return {
    id: doc.$id,
    data: () => normalizeData(doc),
  };
}

function makeSnapshot(docs, changes = []) {
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: fn => docs.forEach(fn),
    docChanges: () => changes,
  };
}

export async function getDoc(docRef) {
  const { db } = await getSdk();
  const id = safeDocId(docRef.id);
  try {
    const doc = await db.getDocument(AW_DB, docRef.name, id);
    const data = normalizeData(doc);
    return {
      exists: () => true,
      id: doc.$id,
      data: () => data,
    };
  } catch (err) {
    return { exists: () => false, data: () => undefined };
  }
}

export async function getDocs(ref) {
  const { db, Query } = await getSdk();
  const { collection, constraints } = buildQuery(ref);
  const queries = await buildQueries(constraints);
  // Force fresh fetch — prevent Appwrite SDK response caching
  const freshQueries = [...queries];
  const result = await db.listDocuments(AW_DB, collection, freshQueries);
  const docs = (result.documents || []).map(makeDoc);
  return makeSnapshot(docs);
}

export async function addDoc(colRef, data) {
  const { db, ID } = await getSdk();
  const payload = encodeData(data);
  return db.createDocument(AW_DB, colRef.name, ID.unique(), payload, DEFAULT_DOC_PERMISSIONS);
}

export async function setDoc(docRef, data, options = {}) {
  const { db } = await getSdk();
  const id = safeDocId(docRef.id);
  const payload = encodeData(data);
  if (options.merge) {
    let existing = {};
    try {
      const current = await db.getDocument(AW_DB, docRef.name, id);
      existing = normalizeData(current);
    } catch (e) {
      existing = {};
    }
    const merged = encodeData({ ...existing, ...data });
    try {
      return await db.updateDocument(AW_DB, docRef.name, id, merged);
    } catch (err) {
      return await db.createDocument(AW_DB, docRef.name, id, merged, DEFAULT_DOC_PERMISSIONS);
    }
  }
  try {
    return await db.updateDocument(AW_DB, docRef.name, id, payload);
  } catch (err) {
    return await db.createDocument(AW_DB, docRef.name, id, payload, DEFAULT_DOC_PERMISSIONS);
  }
}

export async function updateDoc(docRef, data) {
  const { db } = await getSdk();
  const id = safeDocId(docRef.id);
  return db.updateDocument(AW_DB, docRef.name, id, encodeData(data));
}

export async function deleteDoc(docRef) {
  const { db } = await getSdk();
  const id = safeDocId(docRef.id);
  return db.deleteDocument(AW_DB, docRef.name, id);
}

export function onSnapshot(ref, callback) {
  let active = true;
  let unsubscribe = null;
  let prevIds = new Set();

  const emit = async () => {
    if (!active) return;
    const snapshot = await getDocs(ref);
    const newIds = new Set(snapshot.docs.map(d => d.id));
    const changes = [];
    if (prevIds.size) {
      snapshot.docs.forEach(d => {
        if (!prevIds.has(d.id)) changes.push({ type: 'added', doc: d });
      });
    }
    prevIds = newIds;
    callback(makeSnapshot(snapshot.docs, changes));
  };

  getSdk().then(({ client }) => {
    const { collection } = buildQuery(ref);
    unsubscribe = client.subscribe(`databases.${AW_DB}.collections.${collection}.documents`, () => emit());
  });

  emit().catch(() => {});

  return () => {
    active = false;
    if (unsubscribe) unsubscribe();
  };
}

export async function trackPageview() {
  const ua = navigator.userAgent;
  const device = /Mobile|Android|iPhone/i.test(ua) ? 'mobile' : /iPad|Tablet/i.test(ua) ? 'tablet' : 'desktop';
  const ref = document.referrer || '';
  const src = ref.includes('google') ? 'Google' : ref.includes('facebook') ? 'Facebook' : ref.includes('t.co') || ref.includes('twitter') ? 'Twitter' : ref ? 'Referral' : 'Direct';
  try {
    await addDoc(collection(getFirestore(), 'pageviews'), {
      page: location.pathname,
      device,
      source: src,
      referrer: ref,
      ts: serverTimestamp(),
    });
  } catch (e) {
    // ignore
  }
}

export { AW_ENDPOINT, AW_PROJECT, AW_DB };
