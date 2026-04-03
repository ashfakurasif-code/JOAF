// netlify/functions/send-notification.js
// সব subscriber দের notification পাঠায়
// firebase-admin বাদ — Firestore REST API ব্যবহার করা হচ্ছে
// web-push SDK বহাল আছে (এটার কোনো REST alternative নেই)

const webpush = require('web-push');

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BASE = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents`;

function toField(v) {
  if (typeof v === 'string')  return { stringValue: v };
  if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'object' && v !== null && !Array.isArray(v)) {
    return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, vv]) => [k, toField(vv)])) } };
  }
  return { nullValue: null };
}

// Firestore: active subscriptions পড়া
async function getActiveSubscriptions() {
  // REST API-তে where clause সীমিত, তাই সব এনে JS-এ filter
  const url = `${BASE}/push_subscriptions?key=${FB_CONFIG.apiKey}&pageSize=500`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Firestore GET failed: ' + r.status);
  const data = await r.json();
  return (data.documents || []).map(doc => {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const obj = { id, _name: doc.name };
    for (const [k, v] of Object.entries(fields)) {
      if (v.stringValue !== undefined)  obj[k] = v.stringValue;
      else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
      else if (v.mapValue) {
        const m = {};
        for (const [mk, mv] of Object.entries(v.mapValue.fields || {})) {
          if (mv.stringValue !== undefined) m[mk] = mv.stringValue;
          else if (mv.mapValue) {
            // nested map (keys object)
            const inner = {};
            for (const [ik, iv] of Object.entries(mv.mapValue.fields || {})) {
              inner[ik] = iv.stringValue ?? '';
            }
            m[mk] = inner;
          }
        }
        obj[k] = m;
      }
    }
    return obj;
  }).filter(doc => doc.active !== false);
}

// Firestore: subscription inactive mark করা (expired)
async function markInactive(docName) {
  const url = `https://firestore.googleapis.com/v1/${docName}?key=${FB_CONFIG.apiKey}&updateMask.fieldPaths=active`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields: { active: { booleanValue: false } } }),
  });
}

// Firestore: notification history save
async function saveHistory(data) {
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toField(v)]));
  const url = `${BASE}/notification_history?key=${FB_CONFIG.apiKey}`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

// Notification types
const NOTIFICATION_TYPES = {
  bajar:      { title: '🛒 আজকের বাজার দর',        body: 'চাল, ডাল, সবজির দাম আপডেট হয়েছে। জানুন কোথায় কত সস্তা।',              url: '/bajar.html' },
  poll:       { title: '🗳️ আজকের জনমত',            body: '৩০টি প্রশ্নে ভোট দিন, streak বজায় রাখুন — পুরস্কার আপনার জন্য!',      url: '/joaf-polls.html' },
  streak:     { title: '🔥 Streak মিস করবেন না!',  body: 'আজকের ভোট এখনো বাকি। এখনই দিন — streak ভাঙলে শুরু থেকে!',            url: '/joaf-polls.html' },
  weather:    { title: '🌦️ আবহাওয়া সতর্কতা',      body: 'আজ আপনার এলাকায় বিশেষ আবহাওয়া পূর্বাভাস। কৃষক ও জেলেরা সতর্ক থাকুন।', url: '/weather.html' },
  blood:      { title: '🩸 জরুরি রক্ত দরকার!',    body: 'আপনার এলাকায় কেউ রক্তের জন্য অনুরোধ করেছেন।',                         url: '/rokto.html' },
  alert:      { title: '🚨 জরুরি সতর্কতা!',        body: 'আপনার এলাকায় একটি জরুরি পরিস্থিতি জানানো হয়েছে।',                    url: '/alert.html' },
  live:       { title: '📡 JOAF Live শুরু হয়েছে!', body: 'এখনই দেখুন — সরাসরি সম্প্রচার চলছে।',                                url: '/live.html' },
  warrior:    { title: '🏆 নতুন জুলাই যোদ্ধা!',   body: 'একজন নতুন বীর সৈনিক আমাদের directory তে যোগ দিয়েছেন।',                url: '/july-warriors.html' },
  corruption: { title: '🚫 দুর্নীতির রিপোর্ট',    body: 'একটি নতুন দুর্নীতির অভিযোগ দাখিল হয়েছে।',                            url: '/leader-tracker.html' },
  leader:     { title: '🏛️ নেতা ট্র্যাকার আপডেট', body: 'প্রতিশ্রুতি vs বাস্তবতা — সাপ্তাহিক আপডেট এসেছে।',                   url: '/leader-tracker.html' },
  medicine:   { title: '💊 ওষুধের দাম আপডেট',     body: 'এই সপ্তাহের ওষুধের দামের তালিকা আপডেট হয়েছে।',                        url: '/medicine.html' },
  agriculture:{ title: '🌾 কৃষি আপডেট',           body: 'এই মৌসুমের কৃষি পরামর্শ ও বাজার দর আপডেট হয়েছে।',                     url: '/agriculture.html' },
  jobs:       { title: '💼 নতুন চাকরির সুযোগ',    body: 'আপনার পছন্দের ক্যাটাগরিতে নতুন চাকরি এসেছে।',                         url: '/jobs.html' },
  news:       { title: '📢 JOAF বিবৃতি',           body: 'JOAF এর পক্ষ থেকে একটি গুরুত্বপূর্ণ বিবৃতি প্রকাশিত হয়েছে।',         url: '/news.html' },
  breaking:   { title: '🚨 ব্রেকিং নিউজ',          body: 'এইমাত্র একটি গুরুত্বপূর্ণ খবর এসেছে।',                               url: '/news.html' },
  reward:     { title: '🎉 পুরস্কার অর্জন!',       body: 'অভিনন্দন! আপনি ৩০ দিনের streak সম্পন্ন করেছেন।',                      url: '/joaf-polls.html' },
  welcome:    { title: '🔥 JOAF-এ স্বাগতম!',       body: 'আপনি এখন বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চের অংশ।',                     url: '/' },
};

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    // web-push setup
    webpush.setVapidDetails(
      'mailto:admin@julyforum.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const body = JSON.parse(event.body);
    const { type, title: customTitle, body: customBody, url: customUrl, _verify } = body;

    // শুধু key verify
    if (_verify) {
      return { statusCode: 200, headers, body: JSON.stringify({ verified: true }) };
    }

    // Notification data নির্ধারণ
    let notifData;
    if (type && NOTIFICATION_TYPES[type]) {
      notifData = { ...NOTIFICATION_TYPES[type] };
      if (customTitle) notifData.title = customTitle;
      if (customBody)  notifData.body  = customBody;
      if (customUrl)   notifData.url   = customUrl;
    } else {
      notifData = {
        title: customTitle || '🔥 JOAF',
        body:  customBody  || 'নতুন আপডেট এসেছে',
        url:   customUrl   || '/',
      };
    }

    // Active subscriptions নাও
    const docs = await getActiveSubscriptions();
    if (!docs.length) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, sent: 0, message: 'No subscribers' }) };
    }

    const payload = JSON.stringify({
      title: notifData.title,
      body:  notifData.body,
      url:   notifData.url,
      type:  type || 'custom',
      tag:   `joaf-${type || 'custom'}-${Date.now()}`,
    });

    let sent = 0, failed = 0;

    const promises = docs.map(async (doc) => {
      if (!doc.subscription) return;
      try {
        await webpush.sendNotification(doc.subscription, payload);
        sent++;
      } catch (err) {
        failed++;
        // Expired subscription — inactive করো
        if (err.statusCode === 404 || err.statusCode === 410) {
          await markInactive(doc._name).catch(() => {});
        }
      }
    });

    await Promise.all(promises);

    // History save
    await saveHistory({
      type:     type || 'custom',
      title:    notifData.title,
      body:     notifData.body,
      url:      notifData.url,
      sent,
      failed,
      sentAt:   new Date().toISOString(),
    }).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sent, failed, total: docs.length }),
    };

  } catch (err) {
    console.error('send-notification error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
