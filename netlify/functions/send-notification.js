// netlify/functions/send-notification.js
// সব subscriber দের notification পাঠায়
// Admin panel থেকে manual + GitHub Actions থেকে scheduled

const admin = require('firebase-admin');
const webpush = require('web-push');

function initAdmin() {
  if (admin.apps.length) return;
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
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

  // Admin key check — GitHub Actions বা Admin panel থেকে আসলে verify করো
  const adminKey = event.headers['x-admin-key'] || '';
  const isScheduled = adminKey === process.env.ADMIN_SECRET_KEY;
  if (!isScheduled) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    initAdmin();
    initWebPush();
    const db = admin.firestore();

    const body = JSON.parse(event.body);
    const { type, title: customTitle, body: customBody, url: customUrl } = body;

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
    const snapshot = await db.collection('push_subscriptions')
      .where('active', '==', true)
      .get();

    if (snapshot.empty) {
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
    const failedIds = [];

    const promises = snapshot.docs.map(async (doc) => {
      const { subscription } = doc.data();
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        failed++;
        failedIds.push(doc.id);
        // 404 বা 410 মানে subscription expired — delete করো
        if (err.statusCode === 404 || err.statusCode === 410) {
          await db.collection('push_subscriptions').doc(doc.id).update({ active: false });
        }
      }
    });

    await Promise.all(promises);

    // Log notification history
    await db.collection('notification_history').add({
      type: type || 'custom',
      title: notifData.title,
      body: notifData.body,
      url: notifData.url,
      sent,
      failed,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, sent, failed, total: snapshot.size }),
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
