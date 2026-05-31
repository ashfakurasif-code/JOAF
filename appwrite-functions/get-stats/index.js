// Appwrite Function: get-stats
// OPTIMIZED BUILD — Free Tier Safe
// Uses parallel queries with reasonable limits, no full table scans

import { Client, Databases, Query } from 'node-appwrite';

const DB_ID      = process.env.APPWRITE_DATABASE_ID || 'joaf';
const COL_SUBS   = 'push_subscriptions';
const COL_HIST   = 'notification_history';
const COL_DONORS = 'donors';
const COL_ALERTS = 'alerts';

let _db = null;
function getDb() {
  if (_db) return _db;
  const ep  = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const prj = process.env.APPWRITE_PROJECT  || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const key = process.env.APPWRITE_API_KEY  || process.env.APPWRITE_FUNCTION_API_KEY || '';
  _db = new Databases(new Client().setEndpoint(ep).setProject(prj).setKey(key));
  return _db;
}

async function safeCount(db, col, queries = []) {
  try {
    const r = await db.listDocuments(DB_ID, col, [...queries, Query.limit(1)]);
    return r.total ?? r.documents?.length ?? 0;
  } catch { return 0; }
}

async function safeFetch(db, col, queries = [], limit = 25) {
  try {
    const r = await db.listDocuments(DB_ID, col, [...queries, Query.limit(limit)]);
    return r.documents || [];
  } catch { return []; }
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'GET') return res.json({ error: 'Method not allowed' }, 405);

  const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;
  if (ADMIN_KEY) {
    const provided = req.headers['x-joaf-key'] || req.headers['x-admin-key'];
    if (!provided || provided !== ADMIN_KEY) {
      error('get-stats: unauthorized');
      return res.json({ error: 'Unauthorized' }, 401);
    }
  }

  const db = getDb();

  try {
    const [
      totalSubs, activeSubs, inactiveSubs,
      histDocs, totalDonors, totalAlerts, activeAlerts
    ] = await Promise.all([
      safeCount(db, COL_SUBS),
      safeCount(db, COL_SUBS, [Query.equal('active', true)]),
      safeCount(db, COL_SUBS, [Query.equal('active', false)]),
      safeFetch(db, COL_HIST, [Query.orderDesc('$createdAt')], 20),
      safeCount(db, COL_DONORS),
      safeCount(db, COL_ALERTS),
      safeCount(db, COL_ALERTS, [Query.notEqual('active', false)]),
    ]);

    const history = histDocs.map(d => ({
      id: d.$id, type: d.type, title: d.title, body: d.body,
      sentAt: d.sentAt, totalSent: d.totalSent, totalFailed: d.totalFailed,
    }));

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCount = history.filter(d => d.sentAt && new Date(d.sentAt) >= todayStart).length;

    log(`get-stats: ${activeSubs} active subs, ${totalDonors} donors`);

    return res.json({
      ok: true, activeSubs, inactiveSubs, totalSubs,
      totalNotifs: histDocs.length, todayNotifs: todayCount,
      totalDonors, totalAlerts, activeAlerts,
      syncStatus: {
        push_subscriptions:   totalSubs > 0 ? 'synced' : 'empty',
        notification_history: histDocs.length > 0 ? 'synced' : 'empty',
        donors:  totalDonors > 0 ? 'synced' : 'empty',
        alerts:  totalAlerts > 0 ? 'synced' : 'empty',
      },
      history,
    });
  } catch (err) {
    error('get-stats: ' + err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
