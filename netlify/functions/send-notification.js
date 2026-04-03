// netlify/functions/send-notification.js
// সব subscriber দের notification পাঠায়
// Admin panel থেকে manual + GitHub Actions থেকে scheduled

const { Client, Databases, ID, Query } = require('node-appwrite');
const webpush = require('web-push');

const ENDPOINT = process.env.APPWRITE_ENDPOINT  || 'https://fra.cloud.appwrite.io/v1';
const PROJECT  = process.env.APPWRITE_PROJECT_ID;
const DATABASE = process.env.APPWRITE_DATABASE_ID;
const API_KEY  = process.env.APPWRITE_API_KEY;

function getDb() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT)
    .setKey(API_KEY);
  return new Databases(client);
}

function initWebPush() {
  webpush.setVapidDetails(
    'mailto:admin@julyforum.com',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

// Notification types — সব predefined messages
const NOTIFICATION_TYPES = {
  bajar:      { title: '🛒 আজকের বাজার দর', body: 'চাল, ডাল, সবজির দাম আপডেট হয়েছে। জানুন কোথায় কত সস্তা।', url: '/bajar.html' },
  poll:       { title: '🗳️ আজকের জনমত', body: '৩০টি প্রশ্নে ভোট দিন, streak বজায় রাখুন — পুরস্কার আপনার জন্য!', url: '/joaf-polls.html' },
  streak:     { title: '🔥 Streak মিস করবেন না!', body: 'আজকের ভোট এখনো বাকি। এখনই দিন — streak ভাঙলে শুরু থেকে!', url: '/joaf-polls.html' },
  weather:    { title: '🌦️ আবহাওয়া সতর্কতা', body: 'আজ আপনার এলাকায় বিশেষ আবহাওয়া পূর্বাভাস। কৃষক ও জেলেরা সতর্ক থাকুন।', url: '/weather.html' },
  blood:      { title: '🩸 জরুরি রক্ত দরকার!', body: 'আপনার এলাকায় কেউ রক্তের জন্য অনুরোধ করেছেন। একটু সাহায্য করুন।', url: '/rokto.html' },
  alert:      { title: '🚨 জরুরি সতর্কতা!', body: 'আপনার এলাকায় একটি জরুরি পরিস্থিতি জানানো হয়েছে। এখনই দেখুন।', url: '/alert.html' },
  live:       { title: '📡 JOAF Live শুরু হয়েছে!', body: 'এখনই দেখুন — সরাসরি সম্প্রচার চলছে।', url: '/live.html' },
  warrior:    { title: '🏆 নতুন জুলাই যোদ্ধা!', body: 'একজন নতুন বীর সৈনিক আমাদের directory তে যোগ দিয়েছেন।', url: '/july-warriors.html' },
  corruption: { title: '🚫 দুর্নীতির রিপোর্ট', body: 'একটি নতুন দুর্নীতির অভিযোগ দাখিল হয়েছে। জানুন বিস্তারিত।', url: '/leader-tracker.html' },
  leader:     { title: '🏛️ নেতা ট্র্যাকার আপডেট', body: 'প্রতিশ্রুতি vs বাস্তবতা — সাপ্তাহিক আপডেট এসেছে।', url: '/leader-tracker.html' },
  medicine:   { title: '💊 ওষুধের দাম আপডেট', body: 'এই সপ্তাহের ওষুধের দামের তালিকা আপডেট হয়েছে।', url: '/medicine.html' },
  agriculture:{ title: '🌾 কৃষি আপডেট', body: 'এই মৌসুমের কৃষি পরামর্শ ও বাজার দর আপডেট হয়েছে।', url: '/agriculture.html' },
  jobs:       { title: '💼 নতুন চাকরির সুযোগ', body: 'আপনার পছন্দের ক্যাটাগরিতে নতুন চাকরি এসেছে। এখনই দেখুন।', url: '/jobs.html' },
  news:       { title: '📢 JOAF বিবৃতি', body: 'JOAF এর পক্ষ থেকে একটি গুরুত্বপূর্ণ বিবৃতি প্রকাশিত হয়েছে।', url: '/news.html' },
  breaking:   { title: '🚨 ব্রেকিং নিউজ', body: 'এইমাত্র একটি গুরুত্বপূর্ণ খবর এসেছে। এখনই দেখুন।', url: '/news.html' },
  reward:     { title: '🎉 পুরস্কার অর্জন!', body: 'অভিনন্দন! আপনি ৩০ দিনের streak সম্পন্ন করেছেন।', url: '/joaf-polls.html' },
  welcome:    { title: '🔥 JOAF-এ স্বাগতম!', body: 'আপনি এখন বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চের অংশ।', url: '/' },
};

async function fetchAllActiveSubscriptions(db) {
  const docs = [];
  let cursor = null;

  while (true) {
    const queries = [Query.equal('active', true), Query.limit(100)];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await db.listDocuments(DATABASE, 'push_subscriptions', queries);
    docs.push(...res.documents);

    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }

  return docs;
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

  // Required env vars check
  if (!PROJECT || !DATABASE || !API_KEY) {
    const missing = [!PROJECT && 'APPWRITE_PROJECT_ID', !DATABASE && 'APPWRITE_DATABASE_ID', !API_KEY && 'APPWRITE_API_KEY'].filter(Boolean).join(', ');
    console.error('Missing required env vars:', missing);
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Server misconfiguration: missing env vars: ${missing}` }) };
  }

  // Admin key check — GitHub Actions বা Admin panel থেকে আসলে verify করো
  const adminKey = event.headers['x-admin-key'] || '';
  const isScheduled = adminKey === process.env.ADMIN_SECRET_KEY;
  if (!isScheduled) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    initWebPush();
    const db = getDb();

    const body = JSON.parse(event.body);
    const { type, title: customTitle, body: customBody, url: customUrl, _verify } = body;

    // শুধু key verify করতে চাইলে — notification পাঠাবে না
    if (_verify) {
      return { statusCode: 200, headers, body: JSON.stringify({ verified: true }) };
    }

    // Predefined type বা custom message
    let notifData;
    if (type && NOTIFICATION_TYPES[type]) {
      notifData = { ...NOTIFICATION_TYPES[type] };
      // custom override allow করো
      if (customTitle) notifData.title = customTitle;
      if (customBody)  notifData.body  = customBody;
      if (customUrl)   notifData.url   = customUrl;
    } else {
      // সম্পূর্ণ custom notification
      notifData = {
        title: customTitle || '🔥 JOAF',
        body:  customBody  || 'নতুন আপডেট এসেছে',
        url:   customUrl   || '/',
      };
    }

    // সব active subscriptions নাও
    const docs = await fetchAllActiveSubscriptions(db);

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
      let subscription;
      try {
        subscription = typeof doc.subscription === 'string'
          ? JSON.parse(doc.subscription)
          : doc.subscription;
      } catch (_) {
        failed++;
        return;
      }

      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        failed++;
        // 404 বা 410 মানে subscription expired — inactive mark করো
        if (err.statusCode === 404 || err.statusCode === 410) {
          try {
            await db.updateDocument(DATABASE, 'push_subscriptions', doc.$id, { active: false });
          } catch (_) {}
        }
      }
    });

    await Promise.all(promises);

    // Log notification history
    try {
      await db.createDocument(DATABASE, 'notification_history', ID.unique(), {
        type: type || 'custom',
        title: notifData.title,
        body: notifData.body,
        url: notifData.url,
        sent,
        failed,
        sentAt: new Date().toISOString(),
      });
    } catch (_) {}

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
