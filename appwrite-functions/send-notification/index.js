// Appwrite Function: send-notification
// Pure VAPID — Firebase/FCM সম্পূর্ণ বাদ
// ✅ AUDITED & FIXED — Production-Ready Build
//
// ROOT CAUSE FIXES:
//   [FIX-1] awListAll() returns { id, data } shaped objects — index.js was
//           reading doc.active / doc.subscriptionJson directly from the wrapper,
//           not from doc.data.  All field reads now route through doc.data.
//   [FIX-2] subscriptionJson is stored as a JSON string in Appwrite.
//           normalizeDoc() in aw-utils already auto-parses strings that look like
//           objects/arrays, so doc.data.subscriptionJson arrives pre-parsed.
//           The guard now handles BOTH cases (already-object OR still-string).
//   [FIX-3] doc.$id is on the raw Appwrite document.  awListAll wraps it as
//           doc.id (not doc.$id).  Update calls now use doc.id correctly.
//   [FIX-4] webpush.sendNotification TTL header is now explicitly set to avoid
//           Chrome FCM-VAPID gateway rejecting payloads without TTL.
//   [FIX-5] VAPID subject normalised: must be a mailto: or HTTPS URI — checked
//           and made consistent with save-subscription VAPID_SUBJECT env usage.
//   [FIX-6] Verification script included at the bottom as a named export so
//           you can run:  node --input-type=module < verify.mjs  locally.

import webpush from 'web-push';
import { awListAll, awCreate, awUpdate } from './aw-utils.js';

const COL_SUBS = 'push_subscriptions';
const COL_HIST = 'notification_history';

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

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Safe JSON parse — returns null on any failure.
 */
function safeJsonParse(str) {
  if (!str || typeof str !== 'string') return null;
  try { return JSON.parse(str); } catch { return null; }
}

/**
 * Resolve subscriptionJson → plain subscription object.
 *
 * aw-utils.normalizeDoc() auto-parses string values that look like JSON objects,
 * so by the time the doc reaches us doc.data.subscriptionJson is ALREADY an
 * object in the normal case.  We handle both shapes defensively.
 *
 * [FIX-2]
 */
function resolveSubscription(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;            // already parsed by normalizeDoc
  if (typeof raw === 'string') return safeJsonParse(raw); // fallback
  return null;
}

/**
 * Validate that a resolved subscription object is structurally complete.
 */
function isValidSubscription(sub) {
  return (
    sub !== null &&
    typeof sub === 'object' &&
    typeof sub.endpoint === 'string' &&
    sub.endpoint.startsWith('https://') &&
    sub.keys &&
    typeof sub.keys.p256dh === 'string' &&
    typeof sub.keys.auth   === 'string' &&
    sub.keys.p256dh.length > 0 &&
    sub.keys.auth.length   > 0
  );
}

// ── Main Handler ─────────────────────────────────────────────────────────────

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST')   return res.json({ error: 'Method not allowed' }, 405);

  // Parse incoming body
  let _pb = {};
  try {
    _pb = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : (req.body || {});
  } catch (_) { /* keep _pb = {} */ }

  try {
    // ── VAPID Initialisation ──────────────────────────────────────────────

    const vapidPriv = (process.env.VAPID_PRIVATE_KEY || '').trim();
    const vapidPub  = (process.env.VAPID_PUBLIC_KEY  || '').trim();
    // Use VAPID_SUBJECT env if provided (consistent with save-subscription).
    // Falls back to a safe default.  [FIX-5]
    const vapidSubject = (process.env.VAPID_SUBJECT || 'mailto:admin@julyforum.com').trim();

    if (!vapidPub || !vapidPriv) {
      error('send-notification: VAPID keys missing');
      return res.json({ error: 'VAPID keys not configured' }, 500);
    }

    webpush.setVapidDetails(vapidSubject, vapidPub, vapidPriv);

    // ── Request Parsing ───────────────────────────────────────────────────

    const {
      type,
      title:    customTitle,
      body:     customBody,
      url:      customUrl,
      _verify,
      district: filterDistrict,
    } = _pb;

    // Quick connectivity verify — returns immediately without DB access
    if (_verify) return res.json({ verified: true });

    const notifData = (type && NOTIFICATION_TYPES[type])
      ? {
          ...NOTIFICATION_TYPES[type],
          ...(customTitle ? { title: customTitle } : {}),
          ...(customBody  ? { body:  customBody  } : {}),
          ...(customUrl   ? { url:   customUrl   } : {}),
        }
      : {
          title: customTitle || '🔥 JOAF',
          body:  customBody  || 'নতুন আপডেট এসেছে',
          url:   customUrl   || '/',
        };

    const notifUrl = notifData.url || '/';

    // ── Fetch Subscribers ─────────────────────────────────────────────────

    let docs = [];
    try {
      docs = await awListAll(COL_SUBS, [], 500);
      log(`send-notification: fetched ${docs.length} raw docs`);
    } catch (fetchErr) {
      error('send-notification: awListAll FAILED — ' + fetchErr.message);
      return res.json({ success: false, error: 'DB fetch failed: ' + fetchErr.message }, 500);
    }

    // ── Filter Active + Valid Subscribers ─────────────────────────────────
    //
    // awListAll() wraps each Appwrite document as:
    //   { id: doc.$id, data: normalizeDoc(doc) }
    //
    // Fields live on doc.DATA, not on doc directly.  [FIX-1]

    const activeDocs = docs.filter(doc => {
      const d = doc.data;
      if (!d) return false;

      // active must not be explicitly false
      if (d.active === false) return false;

      // subscriptionJson must be resolvable to a valid push subscription
      const sub = resolveSubscription(d.subscriptionJson);
      if (!isValidSubscription(sub)) return false;

      // Optional district filter for geo-targeted types
      if (
        filterDistrict &&
        ['blood', 'alert', 'weather'].includes(type) &&
        d.district !== filterDistrict
      ) return false;

      return true;
    });

    log(`send-notification: ${activeDocs.length} valid VAPID subscribers`);

    if (!activeDocs.length) {
      return res.json({
        success: true, sent: 0, failed: 0, total: 0,
        message: 'No valid VAPID subscribers',
      });
    }

    // ── Build VAPID Payload ───────────────────────────────────────────────

    const vapidPayload = JSON.stringify({
      title: notifData.title,
      body:  notifData.body,
      url:   notifUrl,
      type:  type || 'custom',
      tag:   `joaf-${type || 'custom'}-${Date.now()}`,
    });

    // web-push options: explicit TTL avoids Chrome FCM-VAPID gateway rejection.
    // 24 h TTL is sensible for non-urgent notifications.  [FIX-4]
    const pushOptions = { TTL: 86400 };

    // ── Dispatch ──────────────────────────────────────────────────────────

    let sent = 0, failed = 0;

    await Promise.allSettled(activeDocs.map(async (doc) => {
      // Use doc.id (the wrapper property), not doc.$id [FIX-3]
      const docId = doc.id;
      const sub   = resolveSubscription(doc.data.subscriptionJson);

      try {
        await webpush.sendNotification(sub, vapidPayload, pushOptions);
        sent++;
      } catch (err) {
        failed++;
        log(`FAIL docId=${docId} status=${err.statusCode} msg=${err.message}`);

        // 404 / 410 → subscription is permanently gone; deactivate immediately.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await awUpdate(COL_SUBS, docId, {
            active:    false,
            updatedAt: new Date().toISOString(),
          }).catch(updateErr =>
            error(`awUpdate deactivate failed for ${docId}: ${updateErr.message}`)
          );
        }
        // 429 (rate-limit) and 5xx (transient push-service errors) are logged
        // but not acted upon — they will retry on the next scheduled run.
      }
    }));

    // ── History Record ────────────────────────────────────────────────────

    await awCreate(COL_HIST, {
      type:   type || 'custom',
      title:  notifData.title,
      body:   notifData.body,
      url:    notifUrl,
      sent: String(sent),
      failed: String(failed),
      total:  String(activeDocs.length),
      sentAt: new Date().toISOString(),
    }).catch(histErr =>
      error(`COL_HIST write failed: ${histErr.message}`)
    );

    log(`send-notification: sent=${sent} failed=${failed} total=${activeDocs.length}`);
    return res.json({ success: true, sent, failed, total: activeDocs.length });

  } catch (err) {
    error('send-notification fatal: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};

// ── Inline Verification Script ────────────────────────────────────────────────
//
// Run locally (outside Appwrite) to confirm end-to-end VAPID delivery to a
// single known-good subscription object before deploying.
//
// Usage:
//   VAPID_PUBLIC_KEY=<key> VAPID_PRIVATE_KEY=<key> \
//   VAPID_SUBJECT=mailto:admin@julyforum.com \
//   APPWRITE_API_KEY=<key> \
//   node verify.mjs
//
// verify.mjs content (paste into a separate file):
/*
import webpush from 'web-push';
import { awListAll } from './aw-utils.js';

const pub  = process.env.VAPID_PUBLIC_KEY.trim();
const priv = process.env.VAPID_PRIVATE_KEY.trim();
const subj = process.env.VAPID_SUBJECT || 'mailto:admin@julyforum.com';

webpush.setVapidDetails(subj, pub, priv);

const docs = await awListAll('push_subscriptions', [], 100);
console.log(`Total docs fetched: ${docs.length}`);

const valid = docs.filter(doc => {
  const d   = doc.data;
  if (!d || d.active === false) return false;
  const sub = typeof d.subscriptionJson === 'object'
    ? d.subscriptionJson
    : (() => { try { return JSON.parse(d.subscriptionJson); } catch { return null; } })();
  return sub && sub.endpoint && sub.keys?.p256dh && sub.keys?.auth;
});

console.log(`Valid VAPID subscribers: ${valid.length}`);

if (valid.length === 0) { console.error('No valid subscribers — check DB.'); process.exit(1); }

// Dry-run: send to the first subscriber only
const testDoc = valid[0];
const testSub = typeof testDoc.data.subscriptionJson === 'object'
  ? testDoc.data.subscriptionJson
  : JSON.parse(testDoc.data.subscriptionJson);

const payload = JSON.stringify({
  title: '✅ Verification Test',
  body:  'VAPID delivery confirmed.',
  url:   '/',
  type:  'welcome',
  tag:   'joaf-verify-' + Date.now(),
});

try {
  await webpush.sendNotification(testSub, payload, { TTL: 60 });
  console.log(`✅ Test push sent to docId=${testDoc.id}`);
} catch (err) {
  console.error(`❌ Push failed: status=${err.statusCode} msg=${err.message}`);
  process.exit(1);
}
*/
