// aw-utils.js — Shared Appwrite utility (ESM, copied into functions that need it)
import { Client, Databases } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || process.env.APPWRITE_FUNCTION_PROJECT_ID;
export const AW_ENDPOINT = APPWRITE_ENDPOINT;
export const AW_PROJECT = APPWRITE_PROJECT;
export const DB_ID = process.env.APPWRITE_DATABASE_ID || process.env.APPWRITE_FUNCTION_DATABASE_ID || '69cef52f0018a2a7b05a';
export const COLLECTION_ID = 'push_subscriptions';
export const DEFAULT_DOC_PERMISSIONS = ['read("any")', 'update("any")', 'delete("any")'];

const RUNTIME_APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || AW_ENDPOINT;
const RUNTIME_APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || process.env.APPWRITE_FUNCTION_PROJECT_ID || AW_PROJECT;
const RUNTIME_APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

const getClient = () => new Client()
  .setEndpoint(RUNTIME_APPWRITE_ENDPOINT)
  .setProject(RUNTIME_APPWRITE_PROJECT)
  .setKey(RUNTIME_APPWRITE_API_KEY);

export const getDatabases = () => new Databases(getClient());

const BASE_HEADERS = () => ({
  'Content-Type': 'application/json',
  'X-Appwrite-Project': RUNTIME_APPWRITE_PROJECT,
  'X-Appwrite-Key': RUNTIME_APPWRITE_API_KEY,
});

function encodeValue(value) {
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === 'object') return JSON.stringify(value);
  return value;
}

export function encodeData(data) {
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
    try { return JSON.parse(t); } catch (_) { return value; }
  }
  return value;
}

export function normalizeDoc(doc) {
  const data = { ...doc };
  delete data.$id; delete data.$createdAt; delete data.$updatedAt; delete data.$permissions;
  Object.keys(data).forEach(k => { data[k] = parseValue(data[k]); });
  return data;
}

export function sanitizeId(id) {
  let s = String(id).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 36);
  if (!s || /^_+$/.test(s) || !/^[a-zA-Z0-9]/.test(s)) s = 'doc_' + String(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
  if (!s || s.length < 4) s = 'doc_' + Math.random().toString(36).slice(2, 12);
  return s.slice(0, 36);
}

export function safeDocId(id) {
  if (!id || id === 'unique()') return id;
  return sanitizeId(id);
}

function isValidQuery(query) {
  if (typeof query !== 'string') return false;
  const trimmed = query.trim();
  return trimmed.length > 0 && !trimmed.includes('undefined') && !trimmed.includes('null') && /^[a-zA-Z]+\(.+\)$/.test(trimmed);
}

export function sanitizeQueries(queries = []) {
  if (!Array.isArray(queries)) return [];
  return [...new Set(queries.flat(Infinity).filter(Boolean).map(q => (typeof q === 'string' ? q.trim() : '')).filter(isValidQuery))];
}

function buildQueryParams(queries = [], limit = 200) {
  const params = new URLSearchParams();
  const safeQueries = sanitizeQueries(queries);
  const safeLimit = Number.isFinite(Number(limit)) ? Math.min(Math.max(Number(limit), 1), 5000) : 200;
  safeQueries.forEach(query => { params.append('queries[]', query); });
  params.set('limit', String(safeLimit));
  return { params, safeLimit, safeQueries };
}

export function qEqual(field, value) {
  if (!field || value === undefined || value === null || value === '') return null;
  return `equal("${field}", [${JSON.stringify(value)}])`;
}
export function qOrderDesc(field) { return field ? `orderDesc("${field}")` : null; }
export function qOrderAsc(field)  { return field ? `orderAsc("${field}")` : null; }
export function qLimit(n) { const limit = Number(n); if (!Number.isFinite(limit) || limit <= 0) return null; return `limit(${Math.min(limit, 5000)})`; }
export function qCursorAfter(cursor) { const id = safeDocId(cursor); return id ? `cursorAfter("${id}")` : null; }

async function awRequest(path, options = {}) {
  const res = await fetch(`${AW_ENDPOINT}${path}`, { ...options, headers: { ...BASE_HEADERS(), ...(options.headers || {}) } });
  if (!res.ok) { const text = await res.text(); throw new Error(`Appwrite ${res.status}: ${text.slice(0, 500)}`); }
  return res.json();
}

export async function awGet(collection, docId) {
  const id = safeDocId(docId);
  try {
    const doc = await awRequest(`/databases/${DB_ID}/collections/${collection}/documents/${id}`, { method: 'GET' });
    return { id: doc.$id, data: normalizeDoc(doc) };
  } catch (_) { return null; }
}

export async function awList(collection, queries = [], limit = 200) {
  const { params } = buildQueryParams(queries, limit);
  const data = await awRequest(`/databases/${DB_ID}/collections/${collection}/documents?${params.toString()}`, { method: 'GET' });
  return (data.documents || []).map(doc => ({ id: doc.$id, data: normalizeDoc(doc) }));
}

export async function awListAll(collection, queries = [], limit = 200) {
  const baseQueries = sanitizeQueries(queries);
  const all = [];
  let cursor = null;
  let keepPaging = true;
  while (keepPaging) {
    try {
      const pageQueries = [...baseQueries];
      if (cursor) { const cq = qCursorAfter(cursor); if (cq) pageQueries.push(cq); }
      const { params, safeLimit } = buildQueryParams(pageQueries, limit);
      const data = await awRequest(`/databases/${DB_ID}/collections/${collection}/documents?${params.toString()}`, { method: 'GET' });
      const docs = Array.isArray(data.documents) ? data.documents : [];
      all.push(...docs.map(doc => ({ id: doc.$id, data: normalizeDoc(doc) })));
      if (docs.length < safeLimit) { keepPaging = false; break; }
      cursor = docs[docs.length - 1]?.$id || null;
      if (!cursor) keepPaging = false;
    } catch (error) {
      if (baseQueries.length > 0) return awListAll(collection, [], limit);
      return [];
    }
  }
  return all;
}

export async function awCreate(collection, data, docId = 'unique()', permissions = DEFAULT_DOC_PERMISSIONS) {
  const payload = { documentId: safeDocId(docId) || 'unique()', data: encodeData(data), permissions };
  return awRequest(`/databases/${DB_ID}/collections/${collection}/documents`, { method: 'POST', body: JSON.stringify(payload) });
}

export async function awUpdate(collection, docId, data) {
  const id = safeDocId(docId);
  return awRequest(`/databases/${DB_ID}/collections/${collection}/documents/${id}`, { method: 'PATCH', body: JSON.stringify({ data: encodeData(data) }) });
}

export async function awUpsert(collection, docId, data, permissions = DEFAULT_DOC_PERMISSIONS) {
  const existing = await awGet(collection, docId);
  if (existing) { await awUpdate(collection, docId, data); return 'updated'; }
  await awCreate(collection, data, docId, permissions);
  return 'created';
}
