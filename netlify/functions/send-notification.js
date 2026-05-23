// netlify/functions/send-notification.js
// Appwrite থেকে subscriptions পড়ে, web-push দিয়ে পাঠায়

const webpush = require('web-push');

const AW_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const AW_PROJECT  = '6a11b6cd000b59f318eb';
const AW_KEY      = process.env.APPWRITE_API_KEY;
const DB_ID       = 'joaf';
const COL_SUBS    = 'push_subscriptions';
const COL_HIST    = 'notification_history';

// ── Appwrite helpers ──────────────────────────────────────────
async function awList(collection, queries = []) {
  let url = `${AW_ENDPOINT}/databases/${DB_ID}/collections/${collection}/documents?limit=500`;
  if (queries.length) url += '&' + queries.map(q => `queries[]=${encodeURIComponent(q)}`).join('&');
  const r = await fetch(url, {
    headers: { 'X-Appwrite-Project': AW_PROJECT, 'X-Appwrite-Key': AW_KEY }
  });
  if (!r.ok) throw new Error('AW LIST failed: ' + r.status);
  const d = await r.json();
  return d.documents || [];
}

async function awCreate(collection, data) {
  const r = await fetch(`${AW_ENDPOINT}/databases/${DB_ID}/collections/${collection}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': AW_PROJECT,
      'X-Appwrite-Key': AW_KEY
    },
    body: JSON.stringify({ documentId: 'unique()', data, permissions: [] })
  });
  if (!r.ok) console.error('AW CREATE failed:', r.status);
}

async function awPatch(collection, docId, data) {
  const r = await fetch(`${AW_ENDPOINT}/databases/${DB_ID}/collections/${collection}/documents/${docId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'X-Appwrite-Project': AW_PROJECT,
      'X-Appwrite-Key': AW_KEY
    },
    body: JSON.stringify({ data })
  });
  if (!r.ok) console.error('AW PATCH failed:', r.status);
}

// ── Notification type defaults ────────────────────────────────
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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  const adminKey = event.headers['x-admin-key'] || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    webpush.setVapidDetails(
      'mailto:admin@julyforum.com',
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const body = JSON.parse(event.body);
    const { type, title: customTitle, body: customBody, url: customUrl, _verify, district: filterDistrict } = body;

    if (_verify) return { statusCode: 200, headers, body: JSON.stringify({ verified: true }) };

    // Notification data
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

    // Appwrite থেকে active subscriptions নাও
    let docs = await awList(COL_SUBS, ['equal("active", [true])']);

    // district filter
    if (filterDistrict && ['blood','alert','weather'].includes(type)) {
      const filtered = docs.filter(d => d.district === filterDistrict);
      if (filtered.length > 0) docs = filtered;
    }

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

    await Promise.all(docs.map(async (doc) => {
      if (!doc.subscriptionJson) return;
      try {
        const sub = JSON.parse(doc.subscriptionJson);
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        failed++;
        // Expired → inactive করো
        if (err.statusCode === 404 || err.statusCode === 410) {
          await awPatch(COL_SUBS, doc.$id, { active: false }).catch(() => {});
        }
      }
    }));

    // History save করো Appwrite এ
    await awCreate(COL_HIST, {
      type:   type || 'custom',
      title:  notifData.title,
      body:   notifData.body,
      url:    notifData.url,
      sent,
      failed,
      sentAt: new Date().toISOString(),
    }).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sent, failed, total: docs.length }),
    };
  } catch (err) {
    console.error('send-notification error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
