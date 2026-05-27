/**
 * get-stats.js  v2
 * Returns subscriber count + recent notification history + donor/alert counts
 * exclusively from Appwrite. Firebase is never read.
 */
const { awListAll, qEqual } = require('./aw-utils');

const COL_SUBS   = 'push_subscriptions';
const COL_HIST   = 'notification_history';
const COL_DONORS = 'donors';
const COL_ALERTS = 'alerts';

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    // Fetch all four collections in parallel — Appwrite only, no Firebase
    const [subDocs, histDocs, donorDocs, alertDocs] = await Promise.all([
      awListAll(COL_SUBS,   [], 500).catch(() => []),
      awListAll(COL_HIST,   [], 50 ).catch(() => []),
      awListAll(COL_DONORS, [], 500).catch(() => []),
      awListAll(COL_ALERTS, [], 200).catch(() => []),
    ]);

    const activeSubs   = subDocs.filter(d => d.data && d.data.active !== false).length;
    const totalSubs    = subDocs.length;
    const totalDonors  = donorDocs.length;
    const totalAlerts  = alertDocs.length;
    const activeAlerts = alertDocs.filter(d => d.data && d.data.active !== false).length;

    // Blood-group quick stats
    const bloodAPos = donorDocs.filter(d => d.data && (d.data.blood === 'A+' || d.data.bloodGroup === 'A+')).length;
    const bloodOPos = donorDocs.filter(d => d.data && (d.data.blood === 'O+' || d.data.bloodGroup === 'O+')).length;

    // Sort history newest-first
    const history = histDocs
      .map(d => ({ id: d.id, ...d.data }))
      .sort((a, b) => {
        const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 20);

    // Count today's notifications (server-side)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = history.filter(d => d.sentAt && new Date(d.sentAt) >= todayStart).length;

    // Sync status: a collection is "synced" if it has at least 1 document
    const syncStatus = {
      push_subscriptions:   totalSubs   > 0 ? 'synced' : 'empty',
      notification_history: histDocs.length > 0 ? 'synced' : 'empty',
      donors:               totalDonors > 0 ? 'synced' : 'empty',
      alerts:               totalAlerts > 0 ? 'synced' : 'empty',
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        activeSubs,
        totalSubs,
        totalNotifs:  histDocs.length,
        todayNotifs:  todayCount,
        totalDonors,
        totalAlerts,
        activeAlerts,
        bloodAPos,
        bloodOPos,
        syncStatus,
        history,
        // Shallow donor list for dashboard preview (first 5)
        recentDonors: donorDocs.slice(0, 5).map(d => ({ id: d.id, ...d.data })),
      }),
    };
  } catch (err) {
    console.error('get-stats fatal:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ ok: false, error: err.message }),
    };
  }
};
