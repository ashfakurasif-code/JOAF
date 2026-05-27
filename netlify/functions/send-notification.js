const webpush = require('web-push');
const {
  awListAll,
  awCreate,
  awUpdate,
  
} = require('./aw-utils');

const COL_SUBS = 'push_subscriptions';
const COL_HIST = 'notification_history';

const NOTIFICATION_TYPES = {
  bajar:      { title: '🛒 আজকের বাজার দর',        body: 'চাল, ডাল, সবজির দাম আপডেট হয়েছে।',              url: '/bajar.html' },
  poll:       { title: '🗳️ আজকের জনমত',            body: '৩০টি প্রশ্নে ভোট দিন, streak বজায় রাখুন!',      url: '/joaf-polls.html' },
  streak:     { title: '🔥 Streak মিস করবেন না!',  body: 'আজকের ভোট এখনো বাকি।',                          url: '/joaf-polls.html' },
  weather:    { title: '🌦️ আবহাওয়া সতর্কতা',      body: 'আজ বিশেষ আবহাওয়া পূর্বাভাস।',                  url: '/weather.html' },
  blood:      { title: '🩸 জরুরি রক্ত দরকার!',    body: 'আপনার এলাকায় রক্তের অনুরোধ।',                   url: '/rokto.html' },
  alert:      { title: '🚨 জরুরি সতর্কতা!',        body: 'একটি জরুরি পরিস্থিতি জানানো হয়েছে।',            url: '/alert.html' },
  live:       { title: '📡 JOAF Live শুরু!',        body: 'সরাসরি সম্প্রচার চলছে।',                        url: '/live.html' },
  warrior:    { title: '🏆 নতুন জুলাই যোদ্ধা!',   body: 'একজন নতুন বীর যোগ দিয়েছেন।',                   url: '/july-warriors.html' },
  corruption: { title: '🚫 দুর্নীতির রিপোর্ট',    body: 'নতুন অভিযোগ দাখিল হয়েছে।',                     url: '/leader-tracker.html' },
  leader:     { title: '🏛️ নেতা ট্র্যাকার আপডেট', body: 'সাপ্তাহিক আপডেট এসেছে।',                       url: '/leader-tracker.html' },
  medicine:   { title: '💊 ওষুধের দাম আপডেট',     body: 'এই সপ্তাহের দামের তালিকা।',                     url: '/medicine.html' },
  agriculture:{ title: '🌾 কৃষি আপডেট',           body: 'মৌসুমী পরামর্শ আপডেট হয়েছে।',                  url: '/agriculture.html' },
  jobs:       { title: '💼 নতুন চাকরির সুযোগ',    body: 'নতুন চাকরি এসেছে।',                              url: '/jobs.html' },
  news:       { title: '📢 JOAF বিবৃতি',           body: 'গুরুত্বপূর্ণ বিবৃতি প্রকাশিত।',                url: '/news.html' },
  breaking:   { title: '🚨 ব্রেকিং নিউজ',          body: 'এইমাত্র গুরুত্বপূর্ণ খবর।',                    url: '/news.html' },
  reward:     { title: '🎉 পুরস্কার অর্জন!',       body: 'অভিনন্দন! streak সম্পন্ন।',                     url: '/joaf-polls.html' },
  welcome:    { title: '🔥 JOAF-এ স্বাগতম!',       body: 'বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চে যোগ দিন।',    url: '/' },
};


function safeJsonParse(str) {
  if (!str || typeof str !== 'string' || str.trim() === '') {
    return null;
  }

  try {
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const adminKey = event.headers['x-admin-key'] || '';

  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    // Sanitize VAPID keys — Netlify env vars can inject literal \n strings
    const vapidPublic  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/\\n/g, '').trim();
    const vapidPrivate = (process.env.VAPID_PRIVATE_KEY || '').replace(/\\n/g, '').trim();
    webpush.setVapidDetails('mailto:admin@julyforum.com', vapidPublic, vapidPrivate);

    const requestBody = JSON.parse(event.body || '{}');

    const {
      type,
      title: customTitle,
      body: customBody,
      url: customUrl,
      _verify,
      district: filterDistrict,
    } = requestBody;

    if (_verify) {
      return { statusCode: 200, headers, body: JSON.stringify({ verified: true }) };
    }

    const notifData = type && NOTIFICATION_TYPES[type]
      ? {
          ...NOTIFICATION_TYPES[type],
          ...(customTitle ? { title: customTitle } : {}),
          ...(customBody ? { body: customBody } : {}),
          ...(customUrl ? { url: customUrl } : {}),
        }
      : {
          title: customTitle || '🔥 JOAF',
          body: customBody || 'নতুন আপডেট এসেছে',
          url: customUrl || '/',
        };

    // Appwrite 1.9.5 boolean query parser workaround:
    // fetch all subscriptions and filter in-memory.
    let docs = await awListAll(COL_SUBS, [], 500);

    docs = (docs || [])
      .map((doc) => ({
        id: doc.id,
        ...doc.data,
      }))
      .filter((doc) => {
        if (doc.active === false) return false;

        const hasEndpoint =
          !!doc.endpoint ||
          !!doc.subscriptionJson;

        return hasEndpoint;
      });

    if (filterDistrict && ['blood', 'alert', 'weather'].includes(type)) {
      docs = docs.filter((doc) => doc.district === filterDistrict);
    }

    if (!docs.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, sent: 0, failed: 0, total: 0, message: 'No subscribers' }),
      };
    }

    const payload = JSON.stringify({
      title: notifData.title,
      body: notifData.body,
      url: notifData.url,
      type: type || 'custom',
      tag: `joaf-${type || 'custom'}-${Date.now()}`,
    });

    let sent = 0;
    let failed = 0;

    await Promise.allSettled(
      docs.map(async (doc) => {
        try {
          let sub = typeof doc.subscriptionJson === 'string'
            ? safeJsonParse(doc.subscriptionJson)
            : doc.subscriptionJson;

          // If JSON parse failed but we have a raw endpoint, reconstruct minimal sub
          if ((!sub || !sub?.endpoint) && doc.endpoint) {
            sub = { endpoint: doc.endpoint };
          }

          if (!sub || !sub?.endpoint) {
            console.warn('Skipping truly corrupted subscriber ID: ' + (doc.$id || doc.id));
            // Do NOT mark inactive — may be a transient parse issue; just skip this send
            failed += 1;
            return;
          }

          await webpush.sendNotification(sub, payload);
          sent += 1;
        } catch (err) {
          failed += 1;
          console.error('Push send failure:', err.statusCode || 'UNKNOWN', err.message);

          if (err.statusCode === 404 || err.statusCode === 410) {
            await awUpdate(COL_SUBS, doc.id, {
              active: false,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});

            console.log('Disabled stale subscription:', doc.id);
          }
        }
      })
    );

    await awCreate(COL_HIST, {
      type: type || 'custom',
      title: notifData.title,
      body: notifData.body,
      url: notifData.url,
      sent,
      failed,
      total: docs.length,
      sentAt: new Date().toISOString(),
    }).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sent,
        failed,
        total: docs.length,
      }),
    };
  } catch (err) {
    console.error('send-notification fatal:', err);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: err.message,
      }),
    };
  }
};
