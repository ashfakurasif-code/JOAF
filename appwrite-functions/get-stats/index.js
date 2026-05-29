// Appwrite Function: get-stats
// HTTP trigger — GET only (admin key required)
// Returns subscriber count, notification history, donor and alert counts

import { awListAll } from './aw-utils.js';

const COL_SUBS   = 'push_subscriptions';
const COL_HIST   = 'notification_history';
const COL_DONORS = 'donors';
const COL_ALERTS = 'alerts';

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'GET') return res.json({ error: 'Method not allowed' }, 405);

  let _sb = {};
  try { _sb = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch(_) {}
  const adminKey = req.headers['x-admin-key'] || _sb._adminKey || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) return res.json({ error: 'Unauthorized' }, 401);

  try {
    const [subDocs, histDocs, donorDocs, alertDocs] = await Promise.all([
      awListAll(COL_SUBS,   [], 500).catch(() => []),
      awListAll(COL_HIST,   [], 50 ).catch(() => []),
      awListAll(COL_DONORS, [], 500).catch(() => []),
      awListAll(COL_ALERTS, [], 200).catch(() => []),
    ]);

    const activeSubs   = subDocs.filter(d => d.data && d.data.active !== false).length;
    const totalDonors  = donorDocs.length;
    const totalAlerts  = alertDocs.length;
    const activeAlerts = alertDocs.filter(d => d.data && d.data.active !== false).length;

    const history = histDocs
      .map(d => ({ id: d.id, ...d.data }))
      .sort((a, b) => (b.sentAt ? new Date(b.sentAt).getTime() : 0) - (a.sentAt ? new Date(a.sentAt).getTime() : 0))
      .slice(0, 20);

    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayCount = history.filter(d => d.sentAt && new Date(d.sentAt) >= todayStart).length;

    log(`get-stats: ${activeSubs} active subs, ${histDocs.length} notifs, ${totalDonors} donors`);

    return res.json({
      ok: true, activeSubs, totalSubs: subDocs.length,
      totalNotifs: histDocs.length, todayNotifs: todayCount,
      totalDonors, totalAlerts, activeAlerts,
      bloodAPos: donorDocs.filter(d => d.data && (d.data.blood === 'A+' || d.data.bloodGroup === 'A+')).length,
      bloodOPos: donorDocs.filter(d => d.data && (d.data.blood === 'O+' || d.data.bloodGroup === 'O+')).length,
      syncStatus: {
        push_subscriptions: subDocs.length > 0 ? 'synced' : 'empty',
        notification_history: histDocs.length > 0 ? 'synced' : 'empty',
        donors: totalDonors > 0 ? 'synced' : 'empty',
        alerts: totalAlerts > 0 ? 'synced' : 'empty',
      },
      history,
      recentDonors: donorDocs.slice(0, 5).map(d => ({ id: d.id, ...d.data })),
    });
  } catch (err) {
    error('get-stats fatal: ' + err.message);
    return res.json({ ok: false, error: err.message }, 500);
  }
};
