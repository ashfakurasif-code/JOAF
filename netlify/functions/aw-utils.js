const AW_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT = '6a11b6cd000b59f318eb';
const AW_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'joaf';
const DEFAULT_DOC_PERMISSIONS = ['read("any")', 'update("any")', 'delete("any")'];

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  'X-Appwrite-Project': AW_PROJECT,
  'X-Appwrite-Key': AW_KEY,
};

function encodeValue(value) {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value;
}

function encodeData(data) {
  const out = {};
  Object.entries(data || {}).forEach(([k, v]) => {
    const encoded = encodeValue(v);
    if (encoded !== undefined) out[k] = encoded;
  });
  return out;
}

function parseValue(value) {
  if (typeof value !== 'string') return value;
  const t = value.trim();
  if (!t) return value;
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) {
    try {
      return JSON.parse(t);
    } catch (e) {
      return value;
    }
  }
  return value;
}

function normalizeDoc(doc) {
  const data = { ...doc };
  delete data.$id;
  delete data.$createdAt;
  delete data.$updatedAt;
  delete data.$permissions;
  Object.keys(data).forEach(k => { data[k] = parseValue(data[k]); });
  return data;
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

function isValidQuery(query) {
  return typeof query === 'string' && query.trim().length > 0 && !/undefined|null/.test(query);
}

function sanitizeQueries(queries = []) {
  if (!Array.isArray(queries)) return [];

  return queries
    .flat(Infinity)
    .filter(isValidQuery)
    .map(q => q.trim());
}

function qEqual(field, value) {
  if (!field || value === undefined || value === null || value === '') return null;
  return `equal("${field}", [${JSON.stringify(value)}])`;
}

function qOrderDesc(field) {
  if (!field) return null;
  return `orderDesc("${field}")`;
}

function qOrderAsc(field) {
  if (!field) return null;
  return `orderAsc("${field}")`;
}

function qLimit(n) {
  const limit = Number(n);
  if (!Number.isFinite(limit) || limit <= 0) return null;
  return `limit(${Math.min(limit, 5000)})`;
}

function qCursorAfter(cursor) {
  const id = safeDocId(cursor);
  if (!id) return null;
  return `cursorAfter("${id}")`;
}

async function awRequest(path, options = {}) {
  const res = await fetch(`${AW_ENDPOINT}${path}`, {
    ...options,
    headers: { ...BASE_HEADERS, ...(options.headers || {}) },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Appwrite ${res.status}: ${text.slice(0, 200)}`);
  }

  return res.json();
}

async function awGet(collection, docId) {
  const id = safeDocId(docId);
  try {
    const doc = await awRequest(`/databases/${DB_ID}/collections/${collection}/documents/${id}`, { method: 'GET' });
    return { id: doc.$id, data: normalizeDoc(doc) };
  } catch (e) {
    return null;
  }
}

async function awList(collection, queries = [], limit = 200) {
  const params = new URLSearchParams();
  params.set('limit', String(limit));

  sanitizeQueries(queries).forEach(q => params.append('queries[]', q));

  const data = await awRequest(`/databases/${DB_ID}/collections/${collection}/documents?${params.toString()}`, { method: 'GET' });
  return (data.documents || []).map(doc => ({ id: doc.$id, data: normalizeDoc(doc) }));
}

async function awListAll(collection, queries = [], limit = 200) {
  let cursor = null;
  let all = [];
  const baseQueries = sanitizeQueries(queries);

  while (true) {
    const params = new URLSearchParams();
    const pageQueries = [...baseQueries];

    if (cursor) {
      const cursorQuery = qCursorAfter(cursor);
      if (cursorQuery) pageQueries.push(cursorQuery);
    }

    sanitizeQueries(pageQueries).forEach(q => params.append('queries[]', q));

    const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 5000) : 200;
    params.set('limit', String(safeLimit));

    const data = await awRequest(`/databases/${DB_ID}/collections/${collection}/documents?${params.toString()}`, {
      method: 'GET',
    });

    const docs = Array.isArray(data.documents) ? data.documents : [];

    all = all.concat(docs.map(doc => ({ id: doc.$id, data: normalizeDoc(doc) })));

    if (docs.length < safeLimit) break;

    cursor = docs[docs.length - 1]?.$id || null;

    if (!cursor) break;
  }

  return all;
}

async function awCreate(collection, data, docId = 'unique()', permissions = DEFAULT_DOC_PERMISSIONS) {
  const payload = { documentId: safeDocId(docId) || 'unique()', data: encodeData(data), permissions };
  return awRequest(`/databases/${DB_ID}/collections/${collection}/documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function awUpdate(collection, docId, data) {
  const id = safeDocId(docId);
  return awRequest(`/databases/${DB_ID}/collections/${collection}/documents/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ data: encodeData(data) }),
  });
}

async function awUpsert(collection, docId, data, permissions = DEFAULT_DOC_PERMISSIONS) {
  const existing = await awGet(collection, docId);
  if (existing) {
    return awUpdate(collection, docId, data);
  }
  return awCreate(collection, data, docId, permissions);
}

module.exports = {
  AW_ENDPOINT,
  AW_PROJECT,
  DB_ID,
  encodeData,
  normalizeDoc,
  sanitizeId,
  safeDocId,
  sanitizeQueries,
  qEqual,
  qOrderAsc,
  qOrderDesc,
  qLimit,
  qCursorAfter,
  awGet,
  awList,
  awListAll,
  awCreate,
  awUpdate,
  awUpsert,
  DEFAULT_DOC_PERMISSIONS,
};
