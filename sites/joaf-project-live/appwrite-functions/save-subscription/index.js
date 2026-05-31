// Appwrite Function: save-subscription
// OPTIMIZED BUILD — Free Tier Safe
// Fixes: 404 route (was relative URL from missing joaf-config.js in HTML pages)
// Perf: lazy VAPID init, single upsert path, minimal payload, <100ms target

import webpush from 'web-push';
import { Client, Databases, Query, ID } from 'node-appwrite';

const DB_ID  = process.env.APPWRITE_DATABASE_ID || 'joaf';
const COL_ID = 'push_subscriptions';

// ── Lazy singletons (survive warm invocations) ───────────────────────────────
let _db = null;
let _vapidSet = false;

function getDb() {
  if (_db) return _db;
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT;
  const project  = process.env.APPWRITE_PROJECT  || process.env.APPWRITE_FUNCTION_PROJECT_ID;
  const apiKey   = process.env.APPWRITE_API_KEY  || process.env.APPWRITE_FUNCTION_API_KEY || '';
  _db = new Databases(new Client().setEndpoint(endpoint).setProject(project).setKey(apiKey));
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

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  try {
    initVapid();
  } catch (e) {
    error('VAPID init: ' + e.message);
    return res.json({ error: e.message }, 500);
  }

  // ── Parse body ──────────────────────────────────────────────────────────────
  let raw;
  try { raw = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); }
  catch (_) { return res.json({ error: 'Invalid JSON' }, 400); }

  // Accept both shapes: raw PushSubscription or { subscription, district }
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

  if (!subscription?.endpoint)       return res.json({ error: 'Missing endpoint' }, 400);
  if (!subscription.keys?.p256dh)    return res.json({ error: 'Missing p256dh key' }, 400);
  if (!subscription.keys?.auth)      return res.json({ error: 'Missing auth key' }, 400);

  const cleanSub = {
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  };
  if (subscription.expirationTime !== undefined) {
    cleanSub.expirationTime = subscription.expirationTime;
  }

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

  // ── Upsert: try update first, create on 404 ─────────────────────────────────
  try {
    await db.updateDocument(DB_ID, COL_ID, docId, data);
    log(`save-subscription: updated ${docId}`);
    return res.json({ success: true, id: docId, active: true });
  } catch (updateErr) {
    // 404 = not found → create
    if (updateErr?.code !== 404 && !updateErr?.message?.includes('document with the requested ID')) {
      // For non-404 errors, try query-based upsert as fallback
      try {
        const existing = await db.listDocuments(DB_ID, COL_ID, [
          Query.equal('endpoint', cleanSub.endpoint),
          Query.limit(1),
        ]);
        if (existing.documents.length > 0) {
          await db.updateDocument(DB_ID, COL_ID, existing.documents[0].$id, data);
          log(`save-subscription: updated by endpoint ${existing.documents[0].$id}`);
          return res.json({ success: true, id: existing.documents[0].$id, active: true });
        }
      } catch (_) {}
    }

    try {
      await db.createDocument(DB_ID, COL_ID, docId, data, [
        'read("any")', 'update("any")', 'delete("any")',
      ]);
      log(`save-subscription: created ${docId}`);
      return res.json({ success: true, id: docId, active: true });
    } catch (createErr) {
      // Race condition: another request created it — do a final update
      if (createErr?.code === 409 || createErr?.message?.includes('already exists')) {
        try {
          await db.updateDocument(DB_ID, COL_ID, docId, data);
          log(`save-subscription: race-resolved ${docId}`);
          return res.json({ success: true, id: docId, active: true });
        } catch (_) {}
      }
      throw createErr;
    }
  }
};
