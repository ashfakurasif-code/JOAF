const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const appwritePath = path.join(root, 'appwrite.json');
const spec = JSON.parse(fs.readFileSync(appwritePath, 'utf8'));

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
const project = process.env.APPWRITE_PROJECT_ID || process.env.APPWRITE_PROJECT || process.env.APPWRITE_FUNCTION_PROJECT_ID || spec.projectId;
const apiKey = process.env.APPWRITE_API_KEY || process.env.APPWRITE_FUNCTION_API_KEY;
const databaseId = process.env.APPWRITE_DATABASE_ID || spec.databaseId || 'joaf';

function cleanTargets() {
  for (const rel of ['.netlify', 'netlify.toml', '.cache', 'dist', 'build']) {
    const full = path.join(root, rel);
    try { fs.rmSync(full, { recursive: true, force: true }); } catch (_) {}
  }
}

async function appwriteRequest(method, apiPath, body) {
  const res = await fetch(`${endpoint.replace(/\/$/, '')}${apiPath}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': project,
      'X-Appwrite-Key': apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (_) {}
  if (!res.ok) {
    const msg = (json && (json.message || json.error)) || text || `${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }
  return json ?? {};
}

async function ensureDatabase() {
  try {
    await appwriteRequest('GET', `/databases/${databaseId}`);
  } catch (err) {
    if (err.status === 404) {
      await appwriteRequest('POST', '/databases', { databaseId, name: 'JOAF' });
      return;
    }
    throw err;
  }
}

async function ensureCollection(col) {
  const colId = col.$id;
  let exists = false;
  try {
    await appwriteRequest('GET', `/databases/${databaseId}/collections/${colId}`);
    exists = true;
  } catch (err) {
    if (err.status === 404) {
      await appwriteRequest('POST', `/databases/${databaseId}/collections`, {
        collectionId: colId,
        name: col.name,
        documentSecurity: !!col.documentSecurity,
        permissions: col.permissions || ['create("any")', 'read("any")', 'update("any")', 'delete("any")'],
      });
      exists = true;
    } else {
      throw err;
    }
  }

  if (exists) {
    try {
      await appwriteRequest('PATCH', `/databases/${databaseId}/collections/${colId}`, {
        name: col.name,
        documentSecurity: !!col.documentSecurity,
        permissions: col.permissions || ['create("any")', 'read("any")', 'update("any")', 'delete("any")'],
      });
    } catch (err) {
      if (err.status !== 400 && err.status !== 403 && err.status !== 404) throw err;
    }
  }

  for (const attr of col.attributes || []) {
    const attrPath = `/databases/${databaseId}/collections/${colId}/attributes/${attr.type}`;
    try {
      await appwriteRequest('POST', attrPath, {
        key: attr.key,
        size: attr.size,
        required: !!attr.required,
        array: !!attr.array,
        default: attr.default,
      });
    } catch (err) {
      if (!/already exists|attribute/i.test(err.message)) throw err;
    }
  }

  for (const idx of col.indexes || []) {
    try {
      await appwriteRequest('POST', `/databases/${databaseId}/collections/${colId}/indexes`, {
        indexId: idx.key,
        key: idx.key,
        type: idx.type,
        attributes: idx.attributes,
        orders: idx.orders || [],
      });
    } catch (err) {
      if (!/already exists|index/i.test(err.message)) throw err;
    }
  }
}

async function seedSystemConfig() {
  const systemConfig = 'system_config';
  const defaults = [
    { key: 'canvas_dimensions', value: JSON.stringify({ reel: { w: 1080, h: 1920, ratio: '9:16' }, feed_4_5: { w: 1080, h: 1350, ratio: '4:5' }, square: { w: 1080, h: 1080, ratio: '1:1' } }) },
    { key: 'studio_enabled', value: 'true' },
  ];

  const list = await appwriteRequest('GET', `/databases/${databaseId}/collections/${systemConfig}/documents?limit=1`);
  if (Array.isArray(list.documents) && list.documents.length) return;

  for (const item of defaults) {
    await appwriteRequest('POST', `/databases/${databaseId}/collections/${systemConfig}/documents`, {
      documentId: 'unique()',
      data: {
        key: item.key,
        value: item.value,
        updated_at: new Date().toISOString(),
      },
      permissions: ['read("any")', 'update("any")', 'delete("any")'],
    });
  }
}

(async () => {
  cleanTargets();

  if (!endpoint || !project || !apiKey) {
    console.log('[bootstrap] missing APPWRITE env; skipping remote sync');
    console.log('[bootstrap] expected vars: APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, APPWRITE_DATABASE_ID');
    process.exit(0);
  }

  try {
    await ensureDatabase();
    for (const col of spec.collections || []) {
      await ensureCollection(col);
    }
    await seedSystemConfig();
    console.log('[bootstrap] complete');
  } catch (err) {
    console.error('[bootstrap] failed:', err.message || err);
    process.exit(1);
  }
})();
