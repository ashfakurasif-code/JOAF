// migrate-to-appwrite — Firestore → Appwrite chunked migration
import { Client, Databases, Query, ID } from 'node-appwrite';

const DB_ID = 'joaf';

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  
  const adminKey = req.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_KEY) return res.json({ error: 'Unauthorized' }, 401);

  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch(_) {}

  const { action, collection, docs, isDry } = body;

  const client = new Client()
    .setEndpoint(process.env.APPWRITE_FUNCTION_API_ENDPOINT)
    .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);
  const db = new Databases(client);

  // ── Validate: check DB connectivity ──────────────────────────
  if (action === 'validate') {
    try {
      await db.listDocuments(DB_ID, 'push_subscriptions', [Query.limit(1)]);
      return res.json({ ok: true, message: 'Appwrite DB connected' });
    } catch(e) {
      return res.json({ ok: false, error: e.message }, 500);
    }
  }

  // ── Dry Run: count collections ────────────────────────────────
  if (action === 'dry') {
    try {
      const result = {};
      const cols = ['push_subscriptions','notification_history','leaders','donors',
        'alerts','members','press_releases','warriors','forum_messages'];
      for (const col of cols) {
        try {
          const r = await db.listDocuments(DB_ID, col, [Query.limit(1)]);
          result[col] = { exists: true, total: r.total };
        } catch(_) { result[col] = { exists: false, total: 0 }; }
      }
      return res.json({ ok: true, collections: result });
    } catch(e) { return res.json({ ok: false, error: e.message }, 500); }
  }

  // ── Upsert chunk ──────────────────────────────────────────────
  if (action === 'upsert' && collection && Array.isArray(docs)) {
    let created=0, updated=0, skipped=0, failed=0, failures=[];
    for (const doc of docs) {
      const { $id, ...data } = doc;
      try {
        if (isDry) { skipped++; continue; }
        try {
          await db.getDocument(DB_ID, collection, $id);
          await db.updateDocument(DB_ID, collection, $id, data);
          updated++;
        } catch(_) {
          await db.createDocument(DB_ID, collection, $id || ID.unique(), data);
          created++;
        }
      } catch(e) { failed++; failures.push({ id: $id, error: e.message }); }
    }
    log(`${collection}: +${created} ↺${updated} ~${skipped} ✗${failed}`);
    return res.json({ ok: true, collection, created, updated, skipped, failed, failures });
  }

  return res.json({ error: 'Unknown action' }, 400);
};