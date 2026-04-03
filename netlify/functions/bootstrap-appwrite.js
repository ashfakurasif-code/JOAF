// netlify/functions/bootstrap-appwrite.js
// Admin-key protected — creates all required Appwrite collections, attributes, indexes, and permissions
// Call once at setup: POST /.netlify/functions/bootstrap-appwrite with X-Admin-Key header

const { Client, Databases, Permission, Role, IndexType } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT  || 'https://fra.cloud.appwrite.io/v1';
const PROJECT  = process.env.APPWRITE_PROJECT_ID;
const DATABASE = process.env.APPWRITE_DATABASE_ID;
const API_KEY  = process.env.APPWRITE_API_KEY;

function getDb() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT)
    .setKey(API_KEY);
  return new Databases(client);
}

// ── Collection schemas ──────────────────────────────────────────
const COLLECTIONS = {
  push_subscriptions: {
    name: 'push_subscriptions',
    permissions: [Permission.read(Role.any()), Permission.write(Role.any())],
    attributes: [
      { type: 'string', key: 'subscription',  size: 2000, required: true },
      { type: 'string', key: 'endpoint',       size: 1000, required: true },
      { type: 'string', key: 'deviceInfo',     size: 500,  required: false },
      { type: 'string', key: 'createdAt',      size: 30,   required: false },
      { type: 'string', key: 'updatedAt',      size: 30,   required: false },
      { type: 'bool',   key: 'active',                     required: false, default: true },
    ],
    indexes: [
      { key: 'idx_active', type: IndexType.Key, attributes: ['active'] },
    ],
  },

  notification_history: {
    name: 'notification_history',
    permissions: [Permission.read(Role.any())],
    attributes: [
      { type: 'string',  key: 'type',    size: 50,  required: false },
      { type: 'string',  key: 'title',   size: 200, required: false },
      { type: 'string',  key: 'body',    size: 500, required: false },
      { type: 'string',  key: 'url',     size: 200, required: false },
      { type: 'integer', key: 'sent',               required: false },
      { type: 'integer', key: 'failed',             required: false },
      { type: 'string',  key: 'sentAt',  size: 30,  required: false },
    ],
    indexes: [
      { key: 'idx_sentAt', type: IndexType.Key, attributes: ['sentAt'], orders: ['DESC'] },
    ],
  },

  poll_results_daily: {
    name: 'poll_results_daily',
    permissions: [Permission.read(Role.any())],
    attributes: [
      { type: 'string', key: 'pollId',    size: 100, required: true },
      { type: 'string', key: 'day',       size: 10,  required: true },
      { type: 'string', key: 'counts',    size: 2000, required: false },
      { type: 'integer',key: 'total',                required: false },
      { type: 'string', key: 'createdAt', size: 30,  required: false },
      { type: 'string', key: 'updatedAt', size: 30,  required: false },
    ],
    indexes: [
      { key: 'idx_day',    type: IndexType.Key, attributes: ['day'],    orders: ['DESC'] },
      { key: 'idx_pollId', type: IndexType.Key, attributes: ['pollId'] },
    ],
  },

  poll_dedupe_daily: {
    name: 'poll_dedupe_daily',
    permissions: [],
    attributes: [
      { type: 'string', key: 'pollId',    size: 100, required: true },
      { type: 'string', key: 'ipHash',    size: 64,  required: true },
      { type: 'string', key: 'day',       size: 10,  required: true },
      { type: 'string', key: 'createdAt', size: 30,  required: false },
    ],
    indexes: [
      { key: 'idx_day',    type: IndexType.Key, attributes: ['day'] },
      { key: 'idx_pollId', type: IndexType.Key, attributes: ['pollId'] },
    ],
  },

  alerts: {
    name: 'alerts',
    permissions: [Permission.read(Role.any()), Permission.write(Role.any())],
    attributes: [
      { type: 'string',  key: 'title',       size: 200,  required: true },
      { type: 'string',  key: 'description', size: 2000, required: true },
      { type: 'string',  key: 'location',    size: 200,  required: true },
      { type: 'string',  key: 'reporter',    size: 100,  required: false },
      { type: 'string',  key: 'type',        size: 20,   required: false },
      { type: 'string',  key: 'imageUrl',    size: 1000, required: false },
      { type: 'double',  key: 'lat',                     required: false },
      { type: 'double',  key: 'lng',                     required: false },
      { type: 'string',  key: 'ipHash',      size: 64,   required: false },
      { type: 'string',  key: 'createdAt',   size: 30,   required: true },
    ],
    indexes: [
      { key: 'idx_createdAt', type: IndexType.Key, attributes: ['createdAt'], orders: ['DESC'] },
      { key: 'idx_type',      type: IndexType.Key, attributes: ['type'] },
      { key: 'idx_ip_created', type: IndexType.Key, attributes: ['ipHash', 'createdAt'] },
    ],
  },
};

async function ensureCollection(db, collId, schema) {
  const log = [];

  // Create collection if needed
  let collExists = false;
  try {
    await db.getCollection(DATABASE, collId);
    collExists = true;
    log.push(`collection ${collId}: already exists`);
  } catch (e) {
    if (e.code !== 404) throw e;
  }

  if (!collExists) {
    await db.createCollection(DATABASE, collId, schema.name, schema.permissions || []);
    log.push(`collection ${collId}: created`);
    // Small delay to let Appwrite settle
    await new Promise(r => setTimeout(r, 500));
  }

  // Attributes
  let existingAttrs = [];
  try {
    const res = await db.listAttributes(DATABASE, collId);
    existingAttrs = res.attributes.map(a => a.key);
  } catch (_) {}

  for (const attr of schema.attributes || []) {
    if (existingAttrs.includes(attr.key)) {
      log.push(`  attr ${attr.key}: exists`);
      continue;
    }

    try {
      switch (attr.type) {
        case 'string':
          await db.createStringAttribute(DATABASE, collId, attr.key, attr.size, attr.required || false, attr.default);
          break;
        case 'integer':
          await db.createIntegerAttribute(DATABASE, collId, attr.key, attr.required || false, attr.min, attr.max, attr.default);
          break;
        case 'double':
          await db.createFloatAttribute(DATABASE, collId, attr.key, attr.required || false, attr.min, attr.max, attr.default);
          break;
        case 'bool':
          await db.createBooleanAttribute(DATABASE, collId, attr.key, attr.required || false, attr.default);
          break;
      }
      log.push(`  attr ${attr.key}: created`);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      log.push(`  attr ${attr.key}: ERROR — ${err.message}`);
    }
  }

  // Indexes — wait a bit longer for attributes to be ready
  await new Promise(r => setTimeout(r, 1000));

  let existingIndexes = [];
  try {
    const res = await db.listIndexes(DATABASE, collId);
    existingIndexes = res.indexes.map(i => i.key);
  } catch (_) {}

  for (const idx of schema.indexes || []) {
    if (existingIndexes.includes(idx.key)) {
      log.push(`  index ${idx.key}: exists`);
      continue;
    }

    try {
      await db.createIndex(DATABASE, collId, idx.key, idx.type, idx.attributes, idx.orders || []);
      log.push(`  index ${idx.key}: created`);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      log.push(`  index ${idx.key}: ERROR — ${err.message}`);
    }
  }

  return log;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!PROJECT || !DATABASE || !API_KEY) {
    const missing = [!PROJECT && 'APPWRITE_PROJECT_ID', !DATABASE && 'APPWRITE_DATABASE_ID', !API_KEY && 'APPWRITE_API_KEY'].filter(Boolean).join(', ');
    console.error('Missing required env vars:', missing);
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Server misconfiguration: missing env vars: ${missing}` }) };
  }

  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    const db = getDb();
    const report = {};

    for (const [collId, schema] of Object.entries(COLLECTIONS)) {
      report[collId] = await ensureCollection(db, collId, schema);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, report }),
    };
  } catch (err) {
    console.error('bootstrap-appwrite error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
