#!/usr/bin/env node
// scripts/appwrite-setup.js
// Reads scripts/appwrite-schema.json and auto-creates all Appwrite collections,
// attributes, and indexes in the configured project/database.
//
// Usage:
//   APPWRITE_ENDPOINT=... APPWRITE_PROJECT_ID=... APPWRITE_API_KEY=... \
//     APPWRITE_DATABASE_ID=... node scripts/appwrite-setup.js
//
// Or set vars in a .env file and run with: node -r dotenv/config scripts/appwrite-setup.js

const { Client, Databases, Permission, Role, IndexType } = require('node-appwrite');
const path = require('path');

const ENDPOINT   = process.env.APPWRITE_ENDPOINT    || 'https://fra.cloud.appwrite.io/v1';
const PROJECT    = process.env.APPWRITE_PROJECT_ID;
const DATABASE   = process.env.APPWRITE_DATABASE_ID;
const API_KEY    = process.env.APPWRITE_API_KEY;

if (!PROJECT || !DATABASE || !API_KEY) {
  const missing = [!PROJECT && 'APPWRITE_PROJECT_ID', !DATABASE && 'APPWRITE_DATABASE_ID', !API_KEY && 'APPWRITE_API_KEY'].filter(Boolean).join(', ');
  console.error(`ERROR: Required env var(s) missing: ${missing}`);
  process.exit(1);
}

const schema = require(path.join(__dirname, 'appwrite-schema.json'));

const client = new Client()
  .setEndpoint(ENDPOINT)
  .setProject(PROJECT)
  .setKey(API_KEY);

const db = new Databases(client);

const TYPE_MAP = {
  string:  'string',
  integer: 'integer',
  double:  'double',
  float:   'double',
  boolean: 'bool',
  bool:    'bool',
};

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function ensureCollection(coll) {
  const collId = coll.id;
  console.log(`\n── Collection: ${collId}`);

  // Check / create collection
  let exists = false;
  try {
    await db.getCollection(DATABASE, collId);
    exists = true;
    console.log(`   ✓ exists`);
  } catch (e) {
    if (e.code !== 404) throw e;
  }

  if (!exists) {
    await db.createCollection(
      DATABASE,
      collId,
      coll.name,
      [Permission.read(Role.any()), Permission.write(Role.any())]
    );
    console.log(`   ✓ created`);
    await sleep(600);
  }

  // Attributes
  let existingKeys = [];
  try {
    const res = await db.listAttributes(DATABASE, collId);
    existingKeys = res.attributes.map(a => a.key);
  } catch (_) {}

  for (const attr of coll.attributes || []) {
    if (existingKeys.includes(attr.key)) {
      console.log(`   - attr "${attr.key}": skip (exists)`);
      continue;
    }

    const t = TYPE_MAP[attr.type] || attr.type;

    try {
      switch (t) {
        case 'string':
          await db.createStringAttribute(DATABASE, collId, attr.key, attr.size || 255, attr.required || false, attr.default);
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
        default:
          console.warn(`   ⚠ unknown attr type "${t}" for key "${attr.key}"`);
      }
      console.log(`   + attr "${attr.key}" (${t}): created`);
      await sleep(350);
    } catch (err) {
      console.error(`   ✗ attr "${attr.key}": ${err.message}`);
    }
  }

  // Wait for attributes to become available before creating indexes
  await sleep(1200);

  // Indexes
  let existingIndexKeys = [];
  try {
    const res = await db.listIndexes(DATABASE, collId);
    existingIndexKeys = res.indexes.map(i => i.key);
  } catch (_) {}

  for (const idx of coll.indexes || []) {
    if (existingIndexKeys.includes(idx.key)) {
      console.log(`   - index "${idx.key}": skip (exists)`);
      continue;
    }

    const idxType = idx.type === 'fulltext' ? IndexType.Fulltext
                  : idx.type === 'unique'   ? IndexType.Unique
                  : IndexType.Key;

    try {
      await db.createIndex(DATABASE, collId, idx.key, idxType, idx.attributes, idx.orders || []);
      console.log(`   + index "${idx.key}": created`);
      await sleep(350);
    } catch (err) {
      console.error(`   ✗ index "${idx.key}": ${err.message}`);
    }
  }
}

(async () => {
  console.log(`Appwrite Setup — project: ${PROJECT}, database: ${DATABASE}`);
  console.log(`Endpoint: ${ENDPOINT}`);

  for (const coll of schema.collections) {
    await ensureCollection(coll);
  }

  console.log('\n✅ Setup complete.');
})().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
