// Appwrite Function: send-notification
// HTTP trigger — POST only (admin key required)
// Dispatches web push notifications to all active subscribers

import webpush from 'web-push';
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

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  let _pb = {};
  try { _pb = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch(_) {}
  const adminKey = req.headers['x-admin-key'] || _pb._adminKey || '';
  if (adminKey !== process.env.ADMIN_SECRET_KEY) return res.json({ error: 'Unauthorized' }, 401);

  try {
    const vapidPriv = (process.env.VAPID_PRIVATE_KEY || '').replace(/\\n/g, '').replace(/\n/g, '');
    const vapidPub  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/\\n/g, '').replace(/\n/g, '');
    webpush.setVapidDetails('mailto:admin@julyforum.com', vapidPub, vapidPriv);

    const requestBody = _pb;
    const { type, title: customTitle, body: customBody, url: customUrl, _verify, district: filterDistrict } = requestBody;

    if (_verify) return res.json({ verified: true });

    const notifData = type && NOTIFICATION_TYPES[type]
      ? { ...NOTIFICATION_TYPES[type], ...(customTitle ? { title: customTitle } : {}), ...(customBody ? { body: customBody } : {}), ...(customUrl ? { url: customUrl } : {}) }
      : { title: customTitle || '🔥 JOAF', body: customBody || 'নতুন আপডেট এসেছে', url: customUrl || '/' };

    let docs;
    try {
      docs = await awListAll(COL_SUBS, [], 500);
      log(`send-notification: awListAll returned ${(docs||[]).length} raw docs`);
    } catch (fetchErr) {
      error('send-notification: awListAll FAILED — ' + fetchErr.message);
      return res.json({ success: false, error: 'DB fetch failed: ' + fetchErr.message }, 500);
    }
    let activeDocs = (docs || [])
      .map(doc => ({ id: doc.id, ...doc.data }))
      .filter(doc => doc.active !== false && !!(doc.endpoint || doc.subscriptionJson));

    if (filterDistrict && ['blood', 'alert', 'weather'].includes(type)) {
      activeDocs = activeDocs.filter(doc => doc.district === filterDistrict);
    }

    if (!activeDocs.length) return res.json({ success: true, sent: 0, failed: 0, total: 0, message: 'No active subscribers' });

    const payload = JSON.stringify({ title: notifData.title, body: notifData.body, url: notifData.url, type: type || 'custom', tag: `joaf-${type || 'custom'}-${Date.now()}` });

    let sent = 0, failed = 0;
    await Promise.allSettled(activeDocs.map(async (doc) => {
      const docId = doc.$id || doc.id;
      try {
        const sub = typeof doc.subscriptionJson === 'string' ? safeJsonParse(doc.subscriptionJson) : doc.subscriptionJson;
        if (!sub || !sub.endpoint) {
          await awUpdate(COL_SUBS, docId, { active: false, updatedAt: new Date().toISOString() }).catch(() => {});
          failed++; return;
        }
        await webpush.sendNotification(sub, payload);
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 404 || err.statusCode === 410) {
          await awUpdate(COL_SUBS, docId, { active: false, updatedAt: new Date().toISOString() }).catch(() => {});
        }
      }
    }));

    await awCreate(COL_HIST, { type: type || 'custom', title: notifData.title, body: notifData.body, url: notifData.url, sent, failed, total: activeDocs.length, sentAt: new Date().toISOString() }).catch(() => {});

    log(`send-notification: sent=${sent} failed=${failed} total=${activeDocs.length}`);
    return res.json({ success: true, sent, failed, total: activeDocs.length });
  } catch (err) {
    error('send-notification fatal: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
