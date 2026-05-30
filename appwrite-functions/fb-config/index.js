// Appwrite Function: fb-config
// HTTP trigger — GET/POST
// Serves non-sensitive config OR manages system_config collection
// system_config collection schema: { key: string, value: string, updated_at: string }

import { Client, Databases, Query, ID } from 'node-appwrite';

const AW_DB = process.env.APPWRITE_DATABASE_ID || process.env.APPWRITE_FUNCTION_DATABASE_ID || 'joaf';
const COL_CFG  = 'system_config';
const FB_BASE  = 'https://graph.facebook.com';

const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const APPWRITE_PROJECT = process.env.APPWRITE_PROJECT || process.env.APPWRITE_FUNCTION_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY || '';

async function getDbClient(apiKey = '') {
  const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT);
  if (apiKey) client.setKey(apiKey);
  return client;
}

function resolveRuntimeApiKey(req) {
  return req?.headers?.['x-appwrite-key'] || req?.headers?.['X-Appwrite-Key'] || APPWRITE_API_KEY;
}

async function fetchConfig(db, key) {
  try {
    const res = await db.listDocuments(AW_DB, COL_CFG, [Query.equal('key', key), Query.limit(1)]);
    return res.documents[0]?.value ?? null;
  } catch { return null; }
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();

  // ── GET: return public config (appId, apiVersion, canvas_dimensions) ──
  if (req.method === 'GET') {
    const fbAppId = process.env.FB_APP_ID;
    if (!fbAppId) return res.json({ error: 'Facebook configuration not available' }, 500);

    // Try to load canvas dims from system_config
    let canvasDims = {
      reel:     { w: 1080, h: 1920, ratio: '9:16' },
      feed_4_5: { w: 1080, h: 1350, ratio: '4:5' },
      square:   { w: 1080, h: 1080, ratio: '1:1' },
    };
    try {
      const client = await getDbClient();
      const db = new Databases(client);
      const raw = await fetchConfig(db, 'canvas_dimensions');
      if (raw) canvasDims = JSON.parse(raw);
    } catch { /* use defaults */ }

    return res.json({ appId: fbAppId, apiVersion: 'v22.0', canvasDimensions: canvasDims });
  }

  // ── POST: admin CRUD for system_config ─────────────────────────────────
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || process.env.INTERNAL_API_KEY;
  if (ADMIN_KEY) {
    const provided = req.headers['x-joaf-key'] || req.headers['x-admin-key'];
    if (!provided || provided !== ADMIN_KEY) return res.json({ error: 'Unauthorized' }, 401);
  }

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch { }

  const { action, key, value } = body;

  const client = await getDbClient();
  const db = new Databases(client);

  // ── list: return all config keys ──
  if (action === 'list') {
    try {
      const result = await db.listDocuments(AW_DB, COL_CFG, [Query.limit(100)]);
      return res.json({ ok: true, configs: result.documents.map(d => ({ key: d.key, value: d.value, updated_at: d.updated_at })) });
    } catch (e) { return res.json({ error: e.message }, 500); }
  }

  // ── get: fetch single key ──
  if (action === 'get') {
    if (!key) return res.json({ error: 'key required' }, 400);
    const val = await fetchConfig(db, key);
    return res.json({ ok: true, key, value: val });
  }

  // ── set: upsert a config key ──
  if (action === 'set') {
    if (!key) return res.json({ error: 'key required' }, 400);
    try {
      const existing = await db.listDocuments(AW_DB, COL_CFG, [Query.equal('key', key), Query.limit(1)]);
      const payload  = { key, value: String(value ?? ''), updated_at: new Date().toISOString() };
      if (existing.documents.length > 0) {
        await db.updateDocument(AW_DB, COL_CFG, existing.documents[0].$id, payload);
      } else {
        await db.createDocument(AW_DB, COL_CFG, ID.unique(), payload);
      }
      log(`system_config SET: ${key}`);
      return res.json({ ok: true, key, value: String(value ?? '') });
    } catch (e) { error('set error: ' + e.message); return res.json({ error: e.message }, 500); }
  }

  // ── delete: remove a config key ──
  if (action === 'delete') {
    if (!key) return res.json({ error: 'key required' }, 400);
    try {
      const existing = await db.listDocuments(AW_DB, COL_CFG, [Query.equal('key', key), Query.limit(1)]);
      if (existing.documents.length > 0) {
        await db.deleteDocument(AW_DB, COL_CFG, existing.documents[0].$id);
      }
      return res.json({ ok: true, deleted: key });
    } catch (e) { return res.json({ error: e.message }, 500); }
  }

  return res.json({ error: 'Unknown action' }, 400);
};
