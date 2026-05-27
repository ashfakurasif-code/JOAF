/**
 * get-stats.js
 * Returns subscriber count + recent notification history from Appwrite.
 * Called by the admin dashboard instead of Firestore so the KPIs reflect
 * the live Appwrite state (where push_subscriptions now live).
 */
const { awListAll } = require('./aw-utils');

const COL_SUBS = 'push_subscriptions';
const COL_HIST = 'notification_history';

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
    // Fetch in parallel — cap history at 50 docs to keep response fast
    const [subDocs, histDocs] = await Promise.all([
      awListAll(COL_SUBS,  [], 500).catch(() => []),
      awListAll(COL_HIST,  [], 50 ).catch(() => []),
    ]);

    const activeSubs = subDocs.filter(d => d.data && d.data.active !== false).length;
    const totalSubs  = subDocs.length;

    // Sort history newest-first
    const history = histDocs
      .map(d => ({ id: d.id, ...d.data }))
      .sort((a, b) => {
        const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return tb - ta;
      })
      .slice(0, 20);

    // Count today's notifications (server-side, avoids timezone guesswork on client)
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayCount = history.filter(d => d.sentAt && new Date(d.sentAt) >= todayStart).length;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        activeSubs,
        totalSubs,
        totalNotifs: histDocs.length,
        todayNotifs: todayCount,
        history,
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
