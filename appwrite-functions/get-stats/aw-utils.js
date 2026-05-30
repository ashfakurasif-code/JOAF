// aw-utils.js — Appwrite 1.9.5 compatible
import { Client, Databases, Query, ID } from 'node-appwrite';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || process.env.APPWRITE_FUNCTION_PROJECT_ID;
export const AW_ENDPOINT = APPWRITE_ENDPOINT;
export const AW_PROJECT = APPWRITE_PROJECT;
export const DB_ID = process.env.APPWRITE_DATABASE_ID || process.env.APPWRITE_FUNCTION_DATABASE_ID || 'joaf';
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
  delete data.$id; delete data.$createdAt; delete data.$updatedAt;
  delete data.$permissions; delete data.$collectionId; delete data.$databaseId;
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

export function encodeData(data) {
  const out = {};
  Object.entries(data || {}).forEach(([k, v]) => {
    if (v === undefined) return;
    if (v instanceof Date) { out[k] = v.toISOString(); return; }
    if (v && typeof v === 'object') { out[k] = JSON.stringify(v); return; }
    out[k] = v;
  });
  return out;
}

// Query helpers using node-appwrite SDK Query class
export function qEqual(field, value) {
  if (!field || value === undefined || value === null || value === '') return null;
  return Query.equal(field, value);
}
export function qOrderDesc(field) { return field ? Query.orderDesc(field) : null; }
export function qOrderAsc(field)  { return field ? Query.orderAsc(field)  : null; }
export function qLimit(n)         { const l = Number(n); return (Number.isFinite(l) && l > 0) ? Query.limit(Math.min(l, 5000)) : null; }
export function qCursorAfter(id)  { const s = safeDocId(id); return s ? Query.cursorAfter(s) : null; }

export async function awGet(collection, docId) {
  try {
    const db  = getDatabases();
    const doc = await db.getDocument(DB_ID, collection, safeDocId(docId));
    return { id: doc.$id, data: normalizeDoc(doc) };
  } catch (_) { return null; }
}

export async function awList(collection, queries = [], limit = 200) {
  const db = getDatabases();
  const q  = [Query.limit(Math.min(limit, 5000)), ...queries.filter(Boolean)];
  const data = await db.listDocuments(DB_ID, collection, q);
  return (data.documents || []).map(doc => ({ id: doc.$id, data: normalizeDoc(doc) }));
}

export async function awListAll(collection, queries = [], limit = 200) {
  const db  = getDatabases();
  const all = [];
  let cursor = null;

  while (true) {
    const q = [Query.limit(Math.min(limit, 5000)), ...queries.filter(Boolean)];
    if (cursor) q.push(Query.cursorAfter(cursor));

    const data = await db.listDocuments(DB_ID, collection, q);
    const docs = data.documents || [];
    all.push(...docs.map(doc => ({ id: doc.$id, data: normalizeDoc(doc) })));

    if (docs.length < limit) break;
    cursor = docs[docs.length - 1]?.$id || null;
    if (!cursor) break;
  }
  return all;
}

export async function awCreate(collection, data, docId = 'unique()', permissions = DEFAULT_DOC_PERMISSIONS) {
  const db = getDatabases();
  const id = docId === 'unique()' ? ID.unique() : safeDocId(docId);
  return db.createDocument(DB_ID, collection, id, encodeData(data), permissions);
}

export async function awUpdate(collection, docId, data) {
  const db = getDatabases();
  return db.updateDocument(DB_ID, collection, safeDocId(docId), encodeData(data));
}

export async function awUpsert(collection, docId, data, permissions = DEFAULT_DOC_PERMISSIONS) {
  const existing = await awGet(collection, docId);
  if (existing) { await awUpdate(collection, docId, data); return 'updated'; }
  await awCreate(collection, data, docId, permissions);
  return 'created';
}
