const sdk = require('node-appwrite');

const AW_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT = '6a11b6cd000b59f318eb';
const AW_KEY = process.env.APPWRITE_API_KEY;
const DB_ID = 'joaf';
const COLLECTION_ID = 'push_subscriptions';
const DEFAULT_DOC_PERMISSIONS = ['read("any")', 'update("any")', 'delete("any")'];

const client = new sdk.Client()
  .setEndpoint(AW_ENDPOINT)
  .setProject(AW_PROJECT)
  .setKey(AW_KEY);

const databases = new sdk.Databases(client);

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
    } catch (_) {
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

  Object.keys(data).forEach((k) => {
    data[k] = parseValue(data[k]);
  });

  return data;
}

function sanitizeId(id) {
  let s = String(id).replace(/[^a-zA-Z0-9]/g, '_').slice(0, 36);

  if (!s || /^_+$/.test(s) || !/^[a-zA-Z0-9]/.test(s)) {
    s = 'doc_' + String(id).replace(/[^a-zA-Z0-9]/g, '').slice(0, 28);
  }

  if (!s || s.length < 4) {
    s = 'doc_' + Math.random().toString(36).slice(2, 12);
  }

  return s.slice(0, 36);
}

function safeDocId(id) {
  if (!id || id === 'unique()') return id;
  return sanitizeId(id);
}

function isValidQuery(query) {
  if (typeof query !== 'string') return false;

  const trimmed = query.trim();

  return (
    trimmed.length > 0 &&
    !trimmed.includes('undefined') &&
    !trimmed.includes('null') &&
    /^[a-zA-Z]+\(.+\)$/.test(trimmed)
  );
}

function sanitizeQueries(queries = []) {
  if (!Array.isArray(queries)) return [];

  return [...new Set(
    queries
      .flat(Infinity)
      .filter(Boolean)
      .map((q) => (typeof q === 'string' ? q.trim() : ''))
      .filter(isValidQuery)
  )];
}

function buildQueryParams(queries = [], limit = 200) {
  const params = new URLSearchParams();
  const safeQueries = sanitizeQueries(queries);
  const safeLimit = Number.isFinite(Number(limit))
    ? Math.min(Math.max(Number(limit), 1), 5000)
    : 200;

  safeQueries.forEach((query) => {
    params.append('queries[]', query);
  });

  params.set('limit', String(safeLimit));

  return { params, safeLimit, safeQueries };
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
    throw new Error(`Appwrite ${res.status}: ${text.slice(0, 500)}`);
  }

  return res.json();
}

async function awGet(collection, docId) {
  const id = safeDocId(docId);

  try {
    const doc = await awRequest(`/databases/${DB_ID}/collections/${collection}/documents/${id}`, {
      method: 'GET',
    });

    return { id: doc.$id, data: normalizeDoc(doc) };
  } catch (_) {
    return null;
  }
}

async function awList(collection, queries = [], limit = 200) {
  const { params } = buildQueryParams(queries, limit);

  const data = await awRequest(
    `/databases/${DB_ID}/collections/${collection}/documents?${params.toString()}`,
    { method: 'GET' }
  );

  return (data.documents || []).map((doc) => ({ id: doc.$id, data: normalizeDoc(doc) }));
}

async function awListAll(collection, queries = [], limit = 200) {
  const baseQueries = sanitizeQueries(queries);
  const all = [];
  let cursor = null;
  let keepPaging = true;

  while (keepPaging) {
    try {
      const pageQueries = [...baseQueries];

      if (cursor) {
        const cursorQuery = qCursorAfter(cursor);
        if (cursorQuery) pageQueries.push(cursorQuery);
      }

      const { params, safeLimit } = buildQueryParams(pageQueries, limit);

      const data = await awRequest(
        `/databases/${DB_ID}/collections/${collection}/documents?${params.toString()}`,
        { method: 'GET' }
      );

      const docs = Array.isArray(data.documents) ? data.documents : [];

      all.push(...docs.map((doc) => ({ id: doc.$id, data: normalizeDoc(doc) })));

      if (docs.length < safeLimit) {
        keepPaging = false;
        break;
      }

      cursor = docs[docs.length - 1]?.$id || null;

      if (!cursor) {
        keepPaging = false;
      }
    } catch (error) {
      console.error('awListAll query failure:', {
        collection,
        queries: baseQueries,
        error: error.message,
      });

      if (baseQueries.length > 0) {
        console.warn('awListAll fallback: retrying without queries');
        return awListAll(collection, [], limit);
      }

      return [];
    }
  }

  return all;
}

async function awCreate(collection, data, docId = 'unique()', permissions = DEFAULT_DOC_PERMISSIONS) {
  const payload = {
    documentId: safeDocId(docId) || 'unique()',
    data: encodeData(data),
    permissions,
  };

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
    await awUpdate(collection, docId, data);
    return 'updated';
  }

  await awCreate(collection, data, docId, permissions);
  return 'created';
}

async function ensureCollection() {
  try {
    return await databases.getCollection(DB_ID, COLLECTION_ID);
  } catch (error) {
    if (error.code !== 404) throw error;

    return databases.createCollection(
      DB_ID,
      COLLECTION_ID,
      'Push Subscriptions',
      ['read("any")', 'create("any")', 'update("any")', 'delete("any")'],
      true,
      true
    );
  }
}

async function ensureAttribute(key, type, options = {}) {
  try {
    const existing = await databases.listAttributes(DB_ID, COLLECTION_ID);
    if ((existing.attributes || []).some((attr) => attr.key === key)) return;

    switch (type) {
      case 'boolean':
        return databases.createBooleanAttribute(DB_ID, COLLECTION_ID, key, true, options.default ?? false);
      case 'string':
        return databases.createStringAttribute(DB_ID, COLLECTION_ID, key, options.size || 65535, false, options.default || '', false);
      case 'datetime':
        return databases.createDatetimeAttribute(DB_ID, COLLECTION_ID, key, false, options.default || null);
      default:
        throw new Error(`Unsupported attribute type: ${type}`);
    }
  } catch (error) {
    if (error.code !== 409) {
      console.error(`ensureAttribute(${key}) failed`, error.message);
    }
  }
}

async function ensureIndex(key, fields, orders) {
  try {
    const existing = await databases.listIndexes(DB_ID, COLLECTION_ID);
    if ((existing.indexes || []).some((idx) => idx.key === key)) return;

    await databases.createIndex(DB_ID, COLLECTION_ID, key, 'key', fields, orders);
  } catch (error) {
    if (error.code !== 409) {
      console.error(`ensureIndex(${key}) failed`, error.message);
    }
  }
}

async function repairSubscriptions() {
  const docs = await awListAll(COLLECTION_ID, [], 5000);
  const repaired = [];

  for (const doc of docs) {
    const payload = doc.data || {};
    const hasEndpoint = Boolean(payload.endpoint || payload.subscriptionJson);

    if (!hasEndpoint) continue;

    if (payload.active !== true) {
      await awUpdate(COLLECTION_ID, doc.id, {
        ...payload,
        active: true,
        updatedAt: new Date().toISOString(),
      });

      repaired.push(doc.id);
    }
  }

  return repaired;
}

async function initDatabase() {
  const startedAt = Date.now();

  await ensureCollection();

  // Track if any new attributes were actually created (need a brief settle wait before indexing)
  const existingAttrs = await databases.listAttributes(DB_ID, COLLECTION_ID).then(
    r => new Set((r.attributes || []).map(a => a.key)),
    () => new Set()
  );

  await Promise.all([
    ensureAttribute('active', 'boolean', { default: true }),
    ensureAttribute('endpoint', 'string', { size: 65535 }),
    ensureAttribute('subscriptionJson', 'string', { size: 65535 }),
    ensureAttribute('district', 'string', { size: 255 }),
    ensureAttribute('updatedAt', 'datetime'),
  ]);

  const newAttrsCreated = ['active', 'endpoint', 'subscriptionJson', 'district', 'updatedAt']
    .some(k => !existingAttrs.has(k));

  // Only wait if we just created new attributes — Appwrite needs them to be 'available'
  // before indexes can reference them. 800ms is enough; 3000ms was way too conservative.
  if (newAttrsCreated) {
    await new Promise((resolve) => setTimeout(resolve, 800));
  }

  await Promise.all([
    ensureIndex('active_index', ['active'], ['ASC']),
    ensureIndex('district_index', ['district'], ['ASC']),
    ensureIndex('updatedAt_index', ['updatedAt'], ['DESC']),
  ]);

  const repaired = await repairSubscriptions();

  return {
    ok: true,
    repairedDocuments: repaired.length,
    repairedIds: repaired,
    durationMs: Date.now() - startedAt,
  };
}

module.exports = {
  AW_ENDPOINT,
  AW_PROJECT,
  DB_ID,
  COLLECTION_ID,
  databases,
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
  initDatabase,
  repairSubscriptions,
  DEFAULT_DOC_PERMISSIONS,
};
