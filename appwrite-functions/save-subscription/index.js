// Appwrite Function: save-subscription
// OPTIMIZED BUILD v2 — Free Tier Safe
// Handles both direct body and Appwrite execution envelope format

import webpush from 'web-push';
import { Client, Databases, Query, ID } from 'node-appwrite';

const DB_ID  = process.env.APPWRITE_DATABASE_ID || 'joaf';
const COL_ID = 'push_subscriptions';

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

function sanitizeId(endpoint) {
  const b64 = Buffer.from(endpoint).toString('base64url').replace(/[^a-zA-Z0-9]/g, '').slice(-36);
  return (b64.length >= 4 ? b64 : 'sub_' + b64).slice(0, 36);
}

/**
 * Unwrap Appwrite execution envelope if present.
 * Appwrite executions API wraps the actual payload in { body: "JSON_STRING", ... }
 * The function runtime may deliver req.body as the already-parsed inner body,
 * OR as the execution config object. Handle both.
 */
function unwrapBody(raw) {
  if (!raw) return {};
  // If raw looks like an execution envelope (has "body" key that is a JSON string)
  if (typeof raw === 'object' && typeof raw.body === 'string' && raw.body.trim().startsWith('{')) {
    try { return JSON.parse(raw.body); } catch (_) {}
  }
  // If raw IS a string, parse it
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch (_) { return {}; }
  }
  return raw;
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  try { initVapid(); }
  catch (e) { error('VAPID: ' + e.message); return res.json({ error: e.message }, 500); }

  const raw = unwrapBody(req.body);

  // Accept both shapes: raw PushSubscription or { subscription, district, deviceInfo }
  let subscription, district;
  if (raw && raw.endpoint) {
    subscription = raw; district = '';
  } else {
    subscription = raw.subscription || null;
    district     = String(raw.district || '').slice(0, 255);
  }

  if (typeof subscription === 'string') {
    try { subscription = JSON.parse(subscription); } catch (_) { subscription = null; }
  }

  if (!subscription?.endpoint)    return res.json({ error: 'Missing endpoint' }, 400);
  if (!subscription.keys?.p256dh) return res.json({ error: 'Missing p256dh' }, 400);
  if (!subscription.keys?.auth)   return res.json({ error: 'Missing auth' }, 400);

  const cleanSub = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    ...(subscription.expirationTime !== undefined ? { expirationTime: subscription.expirationTime } : {}),
  };

  const docId = sanitizeId(cleanSub.endpoint);
  const now   = new Date().toISOString();
  const data  = {
    endpoint:         cleanSub.endpoint,
    subscriptionJson: JSON.stringify(cleanSub),
    district,
    active:           true,
    updatedAt:        now,
  };

  const db = getDb();

  // Upsert: try update by ID → create → handle race
  try {
    await db.updateDocument(DB_ID, COL_ID, docId, data);
    log(`updated ${docId}`);
    return res.json({ success: true, id: docId });
  } catch (e1) {
    if (e1?.code !== 404 && !String(e1?.message).includes('Document with the requested ID')) {
      // Not a 404 — try query-based lookup
      try {
        const found = await db.listDocuments(DB_ID, COL_ID, [
          Query.equal('endpoint', cleanSub.endpoint), Query.limit(1)
        ]);
        if (found.documents.length > 0) {
          await db.updateDocument(DB_ID, COL_ID, found.documents[0].$id, data);
          log(`updated by endpoint ${found.documents[0].$id}`);
          return res.json({ success: true, id: found.documents[0].$id });
        }
      } catch (_) {}
    }
    try {
      await db.createDocument(DB_ID, COL_ID, docId, data, ['read("any")', 'update("any")', 'delete("any")']);
      log(`created ${docId}`);
      return res.json({ success: true, id: docId });
    } catch (e2) {
      if (e2?.code === 409 || String(e2?.message).includes('already exists')) {
        try {
          await db.updateDocument(DB_ID, COL_ID, docId, data);
          log(`race-resolved ${docId}`);
          return res.json({ success: true, id: docId });
        } catch (_) {}
      }
      throw e2;
    }
  }
};
