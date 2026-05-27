const webpush = require('web-push');
const {
  awListAll,
  awCreate,
  awUpdate,
  qEqual,
  sanitizeQueries,
} = require('./aw-utils');

const COL_SUBS = process.env.APPWRITE_SUBSCRIPTIONS_COLLECTION || 'push_subscriptions';
const COL_HIST = process.env.APPWRITE_NOTIFICATION_HISTORY_COLLECTION || 'notification_history';

const NOTIFICATION_TYPES = {
  bajar:{ title:'🛒 আজকের বাজার দর', body:'চাল, ডাল, সবজির দাম আপডেট হয়েছে।', url:'/bajar.html' },
  poll:{ title:'🗳️ আজকের জনমত', body:'৩০টি প্রশ্নে ভোট দিন, streak বজায় রাখুন!', url:'/joaf-polls.html' },
  streak:{ title:'🔥 Streak মিস করবেন না!', body:'আজকের ভোট এখনো বাকি।', url:'/joaf-polls.html' },
  weather:{ title:'🌦️ আবহাওয়া সতর্কতা', body:'আজ বিশেষ আবহাওয়া পূর্বাভাস।', url:'/weather.html' },
  blood:{ title:'🩸 জরুরি রক্ত দরকার!', body:'আপনার এলাকায় রক্তের অনুরোধ।', url:'/rokto.html' },
  alert:{ title:'🚨 জরুরি সতর্কতা!', body:'একটি জরুরি পরিস্থিতি জানানো হয়েছে।', url:'/alert.html' },
  jobs:{ title:'💼 নতুন চাকরির সুযোগ', body:'নতুন চাকরি এসেছে।', url:'/jobs.html' },
  breaking:{ title:'🚨 ব্রেকিং নিউজ', body:'এইমাত্র গুরুত্বপূর্ণ খবর।', url:'/news.html' },
  welcome:{ title:'🔥 JOAF-এ স্বাগতম!', body:'বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চে যোগ দিন।', url:'/' },
};

function response(statusCode, body = {}) {
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return response(200, {});
  if (event.httpMethod !== 'POST') return response(405, { error: 'Method not allowed' });

  if (!process.env.APPWRITE_API_KEY) {
    return response(500, { error: 'APPWRITE_API_KEY missing' });
  }

  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    return response(500, { error: 'VAPID keys missing' });
  }

  const adminKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key'];
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return response(401, { error: 'Unauthorized' });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (err) {
    return response(400, { error: 'Invalid JSON body' });
  }

  if (payload._verify) return response(200, { verified: true });

  try {
    webpush.setVapidDetails(
      'mailto:admin@julyforum.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );

    const preset = NOTIFICATION_TYPES[payload.type] || {};
    const notification = {
      title: payload.title || preset.title || '🔥 JOAF',
      body: payload.body || preset.body || 'নতুন আপডেট এসেছে',
      url: payload.url || preset.url || '/',
      type: payload.type || 'custom',
      tag: `joaf-${payload.type || 'custom'}-${Date.now()}`,
    };

    const queries = [];

    queries.push(qEqual('active', true));

    if (['blood', 'alert', 'weather'].includes(payload.type)) {
      const district = typeof payload.district === 'string' ? payload.district.trim() : '';

      if (!district) {
        return response(400, { error: 'district is required for localized notifications' });
      }

      queries.push(qEqual('district', district));
    }

    const docs = await awListAll(COL_SUBS, sanitizeQueries(queries));

    if (!docs.length) {
      return response(200, { success: true, sent: 0, failed: 0, total: 0 });
    }

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(docs.map(async ({ id, data }) => {
      const subscription = data.subscription || data.subscriptionJson;
      if (!subscription) return;

      try {
        const parsedSub = typeof subscription === 'string' ? JSON.parse(subscription) : subscription;
        await webpush.sendNotification(parsedSub, JSON.stringify(notification));
        sent += 1;
      } catch (err) {
        failed += 1;
        console.error(`Push failed for ${id}:`, err.message);

        if ([404, 410].includes(err.statusCode)) {
          await awUpdate(COL_SUBS, id, { active: false, invalidatedAt: new Date().toISOString() });
        }
      }
    }));

    await awCreate(COL_HIST, {
      ...notification,
      sent,
      failed,
      total: docs.length,
      sentAt: new Date().toISOString(),
    });

    return response(200, { success: true, sent, failed, total: docs.length });
  } catch (err) {
    console.error('send-notification fatal:', err);
    return response(500, {
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    });
  }
};
