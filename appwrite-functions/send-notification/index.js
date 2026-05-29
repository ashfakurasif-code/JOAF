// Appwrite Function: send-notification
// Handles both FCM (legacy Firebase) and Web Push (VAPID) subscriptions

import webpush from 'web-push';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { awListAll, awCreate, awUpdate, sanitizeId } from './aw-utils.js';

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
  breaking:   { title: '🚨 ব্রেকিং নিউজ',          body: 'এইমাত্র গুরুত্বপূর্ণ খবর।',                    url: '/news.html' },
  welcome:    { title: '🔥 JOAF-এ স্বাগতম!',       body: 'বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চে যোগ দিন।',    url: '/' },
};

function safeJsonParse(str) {
  if (!str || typeof str !== 'string') return null;
  try { return JSON.parse(str); } catch { return null; }
}

function initFirebase() {
  if (getApps().length > 0) return;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
  initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

// FCM endpoint detect করো
function isFCMEndpoint(endpoint) {
  return endpoint && endpoint.includes('fcm.googleapis.com');
}

// FCM token extract করো endpoint থেকে
function extractFCMToken(endpoint) {
  // https://fcm.googleapis.com/fcm/send/TOKEN
  // https://fcm.googleapis.com/wp/TOKEN
  const parts = endpoint.split('/');
  return parts[parts.length - 1];
}

async function sendFCM(token, notifData, url) {
  initFirebase();
  const messaging = getMessaging();
  await messaging.send({
    token,
    notification: {
      title: notifData.title,
      body:  notifData.body,
    },
    webpush: {
      notification: {
        title: notifData.title,
        body:  notifData.body,
        icon:  '/logoc7c3.png',
        click_action: url,
      },
      fcmOptions: { link: url },
    },
  });
}

async function sendVAPID(sub, payload, vapidPub, vapidPriv) {
  webpush.setVapidDetails('mailto:admin@julyforum.com', vapidPub, vapidPriv);
  await webpush.sendNotification(sub, payload);
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  // Auth — headers অথবা body._adminKey থেকে
  let _pb = {};
  try { _pb = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch(_) {}
  const adminKey = req.headers['x-admin-key'] || _pb._adminKey || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) return res.json({ error: 'Unauthorized' }, 401);

  try {
    const vapidPriv = (process.env.VAPID_PRIVATE_KEY || '').replace(/\\n/g, '').replace(/\n/g, '');
    const vapidPub  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/\\n/g, '').replace(/\n/g, '');

    const requestBody = _pb;
    const { type, title: customTitle, body: customBody, url: customUrl, _verify, district: filterDistrict } = requestBody;

    if (_verify) return res.json({ verified: true });

    const notifData = type && NOTIFICATION_TYPES[type]
      ? { ...NOTIFICATION_TYPES[type], ...(customTitle ? { title: customTitle } : {}), ...(customBody ? { body: customBody } : {}), ...(customUrl ? { url: customUrl } : {}) }
      : { title: customTitle || '🔥 JOAF', body: customBody || 'নতুন আপডেট এসেছে', url: customUrl || '/' };

    const notifUrl = notifData.url || '/';

    let docs = [];
    try {
      docs = await awListAll(COL_SUBS, [], 500);
      log(`send-notification: fetched ${(docs||[]).length} raw docs`);
    } catch (fetchErr) {
      error('send-notification: awListAll FAILED — ' + fetchErr.message);
      return res.json({ success: false, error: 'DB fetch failed: ' + fetchErr.message }, 500);
    }

    let activeDocs = (docs || [])
      .map(doc => ({ id: doc.id, $id: doc.id, ...doc.data }))
      .filter(doc => doc.active !== false && !!(doc.endpoint || doc.subscriptionJson));

    if (filterDistrict && ['blood', 'alert', 'weather'].includes(type)) {
      activeDocs = activeDocs.filter(doc => doc.district === filterDistrict);
    }

    log(`send-notification: ${activeDocs.length} active subscribers`);
    if (!activeDocs.length) return res.json({ success: true, sent: 0, failed: 0, total: 0, message: 'No active subscribers' });

    const vapidPayload = JSON.stringify({
      title: notifData.title,
      body:  notifData.body,
      url:   notifUrl,
      type:  type || 'custom',
      tag:   `joaf-${type || 'custom'}-${Date.now()}`
    });

    let sent = 0, failed = 0, fcmSent = 0, vapidSent = 0;

    await Promise.allSettled(activeDocs.map(async (doc) => {
      const docId = doc.$id || doc.id;
      const endpoint = doc.endpoint || '';

      try {
        if (isFCMEndpoint(endpoint)) {
          // FCM path — Firebase Admin SDK
          const token = extractFCMToken(endpoint);
          if (!token) { failed++; return; }
          await sendFCM(token, notifData, notifUrl);
          fcmSent++; sent++;
        } else {
          // VAPID path — web-push
          const sub = typeof doc.subscriptionJson === 'string'
            ? safeJsonParse(doc.subscriptionJson)
            : doc.subscriptionJson;
          if (!sub || !sub.endpoint) {
            await awUpdate(COL_SUBS, docId, { active: false, updatedAt: new Date().toISOString() }).catch(() => {});
            failed++; return;
          }
          await sendVAPID(sub, vapidPayload, vapidPub, vapidPriv);
          vapidSent++; sent++;
        }
      } catch (err) {
        failed++;
        log(`failed docId=${docId} err=${err.message}`);
        if (err.statusCode === 404 || err.statusCode === 410 ||
            err.code === 'messaging/registration-token-not-registered' ||
            err.code === 'messaging/invalid-registration-token') {
          await awUpdate(COL_SUBS, docId, { active: false, updatedAt: new Date().toISOString() }).catch(() => {});
        }
      }
    }));

    await awCreate(COL_HIST, {
      type: type || 'custom', title: notifData.title, body: notifData.body,
      url: notifUrl, sent, failed, total: activeDocs.length,
      sentAt: new Date().toISOString()
    }).catch(() => {});

    log(`send-notification: sent=${sent} (fcm=${fcmSent} vapid=${vapidSent}) failed=${failed} total=${activeDocs.length}`);
    return res.json({ success: true, sent, failed, total: activeDocs.length, fcmSent, vapidSent });

  } catch (err) {
    error('send-notification fatal: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
