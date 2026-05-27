const webpush = require('web-push');
const {
  awListAll,
  awCreate,
  awUpdate,
  awUpsert,
  sanitizeId,
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

// ── Firebase Admin singleton ───────────────────────────────────────────────
let _firebaseApp = null;

function getFirebaseFirestore() {
  // Lazily initialize firebase-admin only when needed (fallback path)
  const admin = require('firebase-admin');

  if (_firebaseApp) {
    return admin.firestore();
  }

  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  // Netlify stores literal \n in env vars — convert back to real newlines for PEM
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      'Firebase env vars missing: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY'
    );
  }

  // Guard against double-init (multiple warm lambda invocations)
  if (!admin.apps.length) {
    _firebaseApp = admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else {
    _firebaseApp = admin.app();
  }

  return admin.firestore();
}

// ── Helpers ────────────────────────────────────────────────────────────────

function safeJsonParse(str) {
  if (!str || typeof str !== 'string' || str.trim() === '') return null;
  try { return JSON.parse(str); } catch (e) { return null; }
}

/**
 * Derive the deterministic Appwrite document ID from a push endpoint URL.
 * Must stay in sync with save-subscription.js.
 */
function endpointToDocId(endpoint) {
  return sanitizeId(
    Buffer.from(endpoint).toString('base64url').slice(-32)
  );
}

/**
 * Fetch the original clean subscription from Firestore, upsert it back into
 * Appwrite with active:true, and return the parsed PushSubscription object.
 *
 * Returns null if the document cannot be recovered (missing, no valid sub).
 */
async function recoverFromFirestore(docId, knownEndpoint) {
  let firestore;
  try {
    firestore = getFirebaseFirestore();
  } catch (initErr) {
    console.error('[Fallback] Firebase init failed:', initErr.message);
    return null;
  }

  try {
    // Try by Appwrite doc ID first (Firestore docs often share the same key)
    let fsDoc = null;

    // Attempt 1: direct doc lookup by docId
    const directRef = firestore.collection('push_subscriptions').doc(docId);
    const directSnap = await directRef.get();
    if (directSnap.exists) {
      fsDoc = directSnap.data();
    }

    // Attempt 2: query by endpoint
    if (!fsDoc && knownEndpoint) {
      const snap = await firestore
        .collection('push_subscriptions')
        .where('endpoint', '==', knownEndpoint)
        .limit(1)
        .get();
      if (!snap.empty) {
        fsDoc = snap.docs[0].data();
      }
    }

    if (!fsDoc) {
      console.warn('[Fallback] No Firestore document found for docId:', docId);
      return null;
    }

    // Extract the subscription object — handle all known storage shapes
    let sub = fsDoc.subscription || fsDoc.pushSubscription || fsDoc.subscriptionJson || null;
    if (typeof sub === 'string') sub = safeJsonParse(sub);

    // Ensure we at least have an endpoint
    const endpoint = (sub && sub.endpoint) || fsDoc.endpoint || knownEndpoint;
    if (!endpoint) {
      console.warn('[Fallback] Recovered Firestore doc has no endpoint, skipping.');
      return null;
    }

    // Rebuild a clean, well-formed subscription object
    const cleanSub = {
      endpoint,
      keys: sub && sub.keys ? sub.keys : (fsDoc.keys || {}),
      ...(sub && sub.expirationTime !== undefined ? { expirationTime: sub.expirationTime } : {}),
    };

    if (!cleanSub.keys || !cleanSub.keys.p256dh || !cleanSub.keys.auth) {
      console.warn('[Fallback] Recovered subscription missing keys, cannot send:', endpoint);
      return null;
    }

    const cleanSubJson = JSON.stringify(cleanSub);
    const upsertId = endpointToDocId(endpoint);

    // Upsert clean data back into Appwrite, forcing active:true
    await awUpsert(COL_SUBS, upsertId, {
      endpoint,
      subscriptionJson: cleanSubJson,
      district: fsDoc.district || '',
      active: true,
      updatedAt: new Date().toISOString(),
    }).catch((upsertErr) => {
      // Non-fatal — we still attempt the push
      console.error('[Fallback] Appwrite upsert failed (non-fatal):', upsertErr.message);
    });

    console.log('[Fallback] Recovered and upserted clean subscription:', upsertId);
    return cleanSub;
  } catch (err) {
    console.error('[Fallback] Firestore recovery error:', err.message);
    return null;
  }
}

// ── Main handler ───────────────────────────────────────────────────────────

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
    // TASK 1: Fix \n token in VAPID_PRIVATE_KEY before passing to web-push.
    // Netlify stores env var newlines as literal \n — web-push expects a raw base64url
    // string (no newlines), but if the key was accidentally stored with embedded \n
    // they must be stripped, not left as literal backslash-n which corrupts the key.
    const vapidPrivateKey = (process.env.VAPID_PRIVATE_KEY || '').replace(/\\n/g, '').replace(/\n/g, '');
    const vapidPublicKey  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/\\n/g, '').replace(/\n/g, '');

    webpush.setVapidDetails(
      'mailto:admin@julyforum.com',
      vapidPublicKey,
      vapidPrivateKey
    );

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
          ...(customBody  ? { body: customBody }   : {}),
          ...(customUrl   ? { url: customUrl }     : {}),
        }
      : {
          title: customTitle || '🔥 JOAF',
          body:  customBody  || 'নতুন আপডেট এসেছে',
          url:   customUrl   || '/',
        };

    // Fetch all subscriptions (Appwrite 1.9.5 boolean query workaround — filter in-memory)
    let docs = await awListAll(COL_SUBS, [], 500);

    // Keep both active docs AND inactive/corrupted ones (we'll attempt recovery below)
    const allDocs = (docs || []).map((doc) => ({
      id: doc.id,
      ...doc.data,
    }));

    // Separate healthy from potentially-recoverable
    let activeDocs = allDocs.filter((doc) => {
      if (doc.active === false) return false;
      return !!(doc.endpoint || doc.subscriptionJson);
    });

    const corruptedOrInactive = allDocs.filter((doc) => {
      // active===false OR missing both endpoint and subscriptionJson
      return doc.active === false || (!doc.endpoint && !doc.subscriptionJson);
    });

    if (filterDistrict && ['blood', 'alert', 'weather'].includes(type)) {
      activeDocs = activeDocs.filter((doc) => doc.district === filterDistrict);
    }

    if (!activeDocs.length && !corruptedOrInactive.length) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, sent: 0, failed: 0, total: 0, message: 'No subscribers' }),
      };
    }

    const payload = JSON.stringify({
      title: notifData.title,
      body:  notifData.body,
      url:   notifData.url,
      type:  type || 'custom',
      tag:   `joaf-${type || 'custom'}-${Date.now()}`,
    });

    let sent   = 0;
    let failed = 0;

    // ── Process healthy active subscribers ─────────────────────────────────
    await Promise.allSettled(
      activeDocs.map(async (doc) => {
        const docId = doc.$id || doc.id;
        try {
          const sub = typeof doc.subscriptionJson === 'string'
            ? safeJsonParse(doc.subscriptionJson)
            : doc.subscriptionJson;

          // TASK 2: If sub is null/missing, attempt Firestore recovery
          if (!sub || !sub.endpoint) {
            console.warn('[Active] Corrupted subscription detected, attempting Firestore recovery. ID:', docId);
            const recovered = await recoverFromFirestore(docId, doc.endpoint || null);
            if (recovered) {
              await webpush.sendNotification(recovered, payload);
              sent += 1;
            } else {
              await awUpdate(COL_SUBS, docId, {
                active: false,
                updatedAt: new Date().toISOString(),
              }).catch(() => {});
              failed += 1;
            }
            return;
          }

          await webpush.sendNotification(sub, payload);
          sent += 1;
        } catch (err) {
          failed += 1;
          console.error('Push send failure:', err.statusCode || 'UNKNOWN', err.message);

          if (err.statusCode === 404 || err.statusCode === 410) {
            await awUpdate(COL_SUBS, docId, {
              active: false,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
            console.log('Disabled stale subscription:', docId);
          }
        }
      })
    );

    // ── TASK 2: Process corrupted/inactive subscribers via Firestore fallback ──
    await Promise.allSettled(
      corruptedOrInactive.map(async (doc) => {
        const docId = doc.$id || doc.id;
        const knownEndpoint = doc.endpoint || null;

        console.log('[Fallback] Attempting Firestore recovery for inactive/corrupted doc:', docId);

        try {
          const recovered = await recoverFromFirestore(docId, knownEndpoint);

          if (!recovered) {
            console.warn('[Fallback] Could not recover doc, marking failed:', docId);
            failed += 1;
            return;
          }

          // Send notification immediately using the recovered clean subscription
          await webpush.sendNotification(recovered, payload);
          sent += 1;
          console.log('[Fallback] Successfully sent notification via recovered subscription:', docId);
        } catch (err) {
          failed += 1;
          console.error('[Fallback] Push failed for recovered sub:', err.statusCode || 'UNKNOWN', err.message);

          if (err.statusCode === 404 || err.statusCode === 410) {
            // The recovered subscription is also stale — disable it
            await awUpdate(COL_SUBS, docId, {
              active: false,
              updatedAt: new Date().toISOString(),
            }).catch(() => {});
            console.log('[Fallback] Disabled irrecoverable stale subscription:', docId);
          }
        }
      })
    );

    await awCreate(COL_HIST, {
      type:   type || 'custom',
      title:  notifData.title,
      body:   notifData.body,
      url:    notifData.url,
      sent,
      failed,
      total:  allDocs.length,
      sentAt: new Date().toISOString(),
    }).catch(() => {});

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        sent,
        failed,
        total: allDocs.length,
      }),
    };
  } catch (err) {
    console.error('send-notification fatal:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
