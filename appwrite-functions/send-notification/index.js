// Appwrite Function: send-notification
// OPTIMIZED BUILD — Free Tier Safe
// Uses lazy singletons, concurrent send batching (20 at a time), dead-sub cleanup

import webpush from 'web-push';
import { Client, Databases, Query, ID } from 'node-appwrite';

const DB_ID      = process.env.APPWRITE_DATABASE_ID || 'joaf';
const COL_SUBS   = 'push_subscriptions';
const COL_HIST   = 'notification_history';
const BATCH_SIZE = 20; // concurrent push sends

// ── Lazy singletons ───────────────────────────────────────────────────────────
let _db = null;
let _vapidSet = false;

function getDb() {
  if (_db) return _db;
  const ep  = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const prj = process.env.APPWRITE_PROJECT  || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const key = process.env.APPWRITE_API_KEY  || process.env.APPWRITE_FUNCTION_API_KEY || '';
  _db = new Databases(new Client().setEndpoint(ep).setProject(prj).setKey(key));
  return _db;
}

function initVapid() {
  if (_vapidSet) return;
  const pub  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/\\n|\n/g, '').trim();
  const priv = (process.env.VAPID_PRIVATE_KEY || '').replace(/\\n|\n/g, '').trim();
  if (!pub || !priv) throw new Error('Missing VAPID keys');
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@julyforum.com',
    pub, priv
  );
  _vapidSet = true;
}

const NOTIFICATION_TYPES = {
  bajar:      { title: '🛒 আজকের বাজার দর',        body: 'চাল, ডাল, সবজির দাম আপডেট হয়েছে।',           url: '/bajar.html' },
  poll:       { title: '🗳️ আজকের জনমত',            body: '৩০টি প্রশ্নে ভোট দিন, streak বজায় রাখুন!',   url: '/joaf-polls.html' },
  streak:     { title: '🔥 Streak মিস করবেন না!',  body: 'আজকের ভোট এখনো বাকি।',                       url: '/joaf-polls.html' },
  weather:    { title: '🌦️ আবহাওয়া সতর্কতা',      body: 'আজ বিশেষ আবহাওয়া পূর্বাভাস।',               url: '/weather.html' },
  blood:      { title: '🩸 জরুরি রক্ত দরকার!',    body: 'আপনার এলাকায় রক্তের অনুরোধ।',                url: '/rokto.html' },
  alert:      { title: '🚨 জরুরি সতর্কতা!',        body: 'একটি জরুরি পরিস্থিতি জানানো হয়েছে।',         url: '/alert.html' },
  live:       { title: '📡 JOAF Live শুরু!',        body: 'সরাসরি সম্প্রচার চলছে।',                     url: '/live.html' },
  warrior:    { title: '🏆 নতুন জুলাই যোদ্ধা!',   body: 'একজন নতুন বীর যোগ দিয়েছেন।',                url: '/july-warriors.html' },
  corruption: { title: '🚫 দুর্নীতির রিপোর্ট',    body: 'নতুন অভিযোগ দাখিল হয়েছে।',                  url: '/leader-tracker.html' },
  leader:     { title: '🏛️ নেতা ট্র্যাকার আপডেট', body: 'সাপ্তাহিক আপডেট এসেছে।',                    url: '/leader-tracker.html' },
  medicine:   { title: '💊 ওষুধের দাম আপডেট',     body: 'এই সপ্তাহের দামের তালিকা।',                  url: '/medicine.html' },
  breaking:   { title: '🚨 ব্রেকিং নিউজ',          body: 'এইমাত্র গুরুত্বপূর্ণ খবর।',                 url: '/news.html' },
  welcome:    { title: '🔥 JOAF-এ স্বাগতম!',       body: 'বাংলাদেশের সবচেয়ে সক্রিয় মঞ্চে যোগ দিন।', url: '/' },
};

function resolveSubscription(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  try { return JSON.parse(raw); } catch { return null; }
}

function isValidSub(sub) {
  return sub && typeof sub.endpoint === 'string' && sub.endpoint.startsWith('https://') &&
    sub.keys?.p256dh && sub.keys?.auth;
}

async function fetchAllSubs(db, district) {
  const all = [];
  let cursor = null;
  const limit = 200;
  while (true) {
    const queries = [Query.equal('active', true), Query.limit(limit)];
    if (district) queries.push(Query.equal('district', district));
    if (cursor)   queries.push(Query.cursorAfter(cursor));
    const page = await db.listDocuments(DB_ID, COL_SUBS, queries);
    all.push(...page.documents);
    if (page.documents.length < limit) break;
    cursor = page.documents[page.documents.length - 1].$id;
  }
  return all;
}

async function sendBatch(subs, payload, db, log) {
  let sent = 0, failed = 0;
  const expired = [];

  for (let i = 0; i < subs.length; i += BATCH_SIZE) {
    const chunk = subs.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async (doc) => {
        const sub = resolveSubscription(doc.subscriptionJson ?? doc.data?.subscriptionJson);
        if (!isValidSub(sub)) { expired.push(doc.$id || doc.id); return; }
        try {
          await webpush.sendNotification(sub, JSON.stringify(payload), { TTL: 86400 });
          sent++;
        } catch (e) {
          if (e.statusCode === 410 || e.statusCode === 404) {
            expired.push(doc.$id || doc.id);
          } else {
            failed++;
          }
        }
      })
    );
  }

  // Mark expired subs inactive (non-blocking)
  if (expired.length > 0) {
    Promise.all(
      expired.map(id => db.updateDocument(DB_ID, COL_SUBS, id, { active: false }).catch(() => {}))
    ).catch(() => {});
    log(`send-notification: marked ${expired.length} subs inactive`);
  }

  return { sent, failed, expired: expired.length };
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();

  // ── Auth ───────────────────────────────────────────────────────────────────
  const ADMIN_KEY = process.env.ADMIN_SECRET_KEY;
  if (ADMIN_KEY) {
    const provided = req.headers['x-joaf-key'] || req.headers['x-admin-key'];
    if (!provided || provided !== ADMIN_KEY) {
      error('send-notification: unauthorized');
      return res.json({ error: 'Unauthorized' }, 401);
    }
  }

  try { initVapid(); }
  catch (e) { return res.json({ error: e.message }, 500); }

  // Unwrap Appwrite execution envelope if present
  let rawBody = req.body;
  if (rawBody && typeof rawBody === 'object' && typeof rawBody.body === 'string') {
    try { rawBody = JSON.parse(rawBody.body); } catch (_) {}
  } else if (typeof rawBody === 'string') {
    try { rawBody = JSON.parse(rawBody); } catch (_) { rawBody = {}; }
  }
  const body = rawBody || {};

  const { type = 'welcome', title, bodyText, url, icon, district } = body;

  const template = NOTIFICATION_TYPES[type] || NOTIFICATION_TYPES.welcome;
  const payload = {
    title:  title || template.title,
    body:   bodyText || template.body,
    icon:   icon || '/logoc7c3.png',
    badge:  '/logoc7c3.png',
    url:    url || template.url,
    data:   { type, url: url || template.url, openUrl: url || template.url },
    requireInteraction: type === 'alert' || type === 'breaking',
  };

  const db = getDb();
  let subDocs;
  try {
    subDocs = await fetchAllSubs(db, district);
  } catch (e) {
    error('send-notification: fetchAllSubs failed — ' + e.message);
    return res.json({ error: 'DB error: ' + e.message }, 500);
  }

  if (!subDocs.length) {
    return res.json({ ok: true, sent: 0, failed: 0, expired: 0, total: 0, message: 'No active subscribers' });
  }

  log(`send-notification: sending ${payload.title} to ${subDocs.length} subs`);
  const { sent, failed, expired } = await sendBatch(subDocs, payload, db, log);

  // ── Record history (non-blocking) ─────────────────────────────────────────
  db.createDocument(DB_ID, COL_HIST, ID.unique(), {
    type,
    title: payload.title,
    body: payload.body,
    sentAt: new Date().toISOString(),
    totalSent: sent,
    totalFailed: failed,
    district: district || '',
  }, ['read("any")']).catch(() => {});

  log(`send-notification: done — sent=${sent} failed=${failed} expired=${expired}`);
  return res.json({ ok: true, sent, failed, expired, total: subDocs.length });
};
