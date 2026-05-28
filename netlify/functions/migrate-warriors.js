const {
  awUpsert,
  sanitizeId,
  withRetryBackoff,
} = require('./aw-utils');

const COLLECTION = 'warriors';
const CHUNK_SIZE = 20;
const CONCURRENCY = 6;

const sanitizeString = (v, max = 65535) => (v == null ? '' : String(v).slice(0, max));

function hashString(value = '') {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36);
}

function normalizeWarrior(item = {}) {
  const name = sanitizeString(item.name, 255);
  const dist = sanitizeString(item.dist || item.district, 255);
  const type = sanitizeString(item.type, 40);
  const date = sanitizeString(item.date, 120);
  const role = sanitizeString(item.role, 255);
  const story = sanitizeString(item.story, 5000);
  const icon = sanitizeString(item.icon || '👤', 8);
  const preferredId = `${name}|${dist}|${date}|${hashString(story).slice(0, 8)}`.replace(/^\|+|\|+$/g, '');
  const fallbackId = sanitizeString(item.id, 64) || Math.random().toString(36).slice(2);
  const docId = sanitizeId(preferredId || fallbackId);

  if (!name) return null;

  return {
    id: docId,
    payload: {
      name,
      role,
      dist,
      district: dist,
      type,
      date,
      story,
      icon,
      source: sanitizeString(item.source || 'july-warriors-inline', 100),
      updatedAt: new Date().toISOString(),
    },
  };
}

async function upsertBatch(batch) {
  const settled = await Promise.allSettled(
    batch.map(async (item) => {
      const normalized = normalizeWarrior(item);
      if (!normalized) return { skipped: true };

      const status = await withRetryBackoff(
        () => awUpsert(COLLECTION, normalized.id, normalized.payload),
        { maxAttempts: 4, baseDelayMs: 250 }
      );

      return { status };
    })
  );

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failures = [];

  settled.forEach((result, idx) => {
    if (result.status === 'fulfilled') {
      const value = result.value || {};
      if (value.skipped) skipped += 1;
      else if (value.status === 'created') created += 1;
      else updated += 1;
      return;
    }
    failures.push({
      index: idx,
      message: String(result.reason?.message || result.reason || 'Unknown error').slice(0, 200),
    });
  });

  return { created, updated, skipped, failures };
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ ok: false, error: 'Method not allowed' }) };
  }

  const adminKey = event.headers['x-admin-key'] || '';
  if (!process.env.ADMIN_SECRET_KEY || adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ ok: false, error: 'Unauthorized' }) };
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch (_) {}

  if (body.action === 'health') {
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true, collection: COLLECTION }) };
  }

  const warriors = Array.isArray(body.warriors) ? body.warriors : [];
  if (!warriors.length) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ ok: false, error: 'warriors[] is required' }),
    };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const failures = [];

  for (let i = 0; i < warriors.length; i += CHUNK_SIZE) {
    const chunk = warriors.slice(i, i + CHUNK_SIZE);
    for (let j = 0; j < chunk.length; j += CONCURRENCY) {
      const part = chunk.slice(j, j + CONCURRENCY);
      const result = await upsertBatch(part);
      created += result.created;
      updated += result.updated;
      skipped += result.skipped;
      failures.push(...result.failures.map((f) => ({ ...f, chunk: i, offset: j })));
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      ok: failures.length === 0,
      total: warriors.length,
      created,
      updated,
      skipped,
      failed: failures.length,
      failures: failures.slice(0, 50),
    }),
  };
};
