// Appwrite Function: save-subscription
// HTTP trigger — POST only
// Saves or updates push notification subscriptions in Appwrite

import webpush from 'web-push';
import { awList, awUpdate, awCreate, sanitizeId, COLLECTION_ID, qEqual, DEFAULT_DOC_PERMISSIONS } from './aw-utils.js';

function getVapidKeys() {
  const pub  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/\\n/g, '').replace(/\n/g, '').trim();
  const priv = (process.env.VAPID_PRIVATE_KEY || '').replace(/\\n/g, '').replace(/\n/g, '').trim();
  const sub  =  process.env.VAPID_SUBJECT || 'mailto:admin@joaf.local';
  return { pub, priv, sub };
}

function validateVapid() {
  const { pub, priv, sub } = getVapidKeys();
  if (!pub || !priv) throw new Error('Missing VAPID keys');
  webpush.setVapidDetails(sub, pub, priv);
}

async function findByEndpoint(endpoint) {
  try {
    const query = qEqual('endpoint', endpoint);
    if (!query) return null;
    const docs = await awList(COLLECTION_ID, [query], 1);
    if (docs && docs.length > 0) return { docId: docs[0].id, data: docs[0].data };
    return null;
  } catch (_) { return null; }
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  try {
    validateVapid();

    let rawBody;
    try { rawBody = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
    catch (_) { return res.json({ error: 'Invalid JSON' }, 400); }

    // Accept both shapes: raw PushSubscription or wrapped { subscription, district, deviceInfo }
    let subscription, district;
    if (rawBody && rawBody.endpoint) {
      subscription = rawBody; district = '';
    } else {
      subscription = rawBody.subscription || null;
      district     = rawBody.district     || '';
    }

    if (typeof subscription === 'string') {
      try { subscription = JSON.parse(subscription); } catch (_) { subscription = null; }
    }

    if (!subscription || !subscription.endpoint) return res.json({ error: 'Missing endpoint' }, 400);

    const keys = subscription.keys || {};
    if (!keys.p256dh || !keys.auth) return res.json({ error: 'Missing push keys' }, 400);

    const cleanSub = {
      endpoint: subscription.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      ...(subscription.expirationTime !== undefined ? { expirationTime: subscription.expirationTime } : {}),
    };

    const upsertData = {
      endpoint: cleanSub.endpoint,
      subscriptionJson: JSON.stringify(cleanSub),
      district: typeof district === 'string' ? district.slice(0, 255) : '',
      active: true,
      updatedAt: new Date().toISOString(),
    };

    const existing = await findByEndpoint(cleanSub.endpoint);
    let savedId;
    if (existing) {
      await awUpdate(COLLECTION_ID, existing.docId, upsertData);
      savedId = existing.docId;
    } else {
      const newId = sanitizeId(
        Buffer.from(cleanSub.endpoint).toString('base64url').slice(-32)
      );
      await awCreate(COLLECTION_ID, upsertData, newId, DEFAULT_DOC_PERMISSIONS);
      savedId = newId;
    }

    log(`save-subscription: saved ${savedId}`);
    return res.json({ success: true, id: savedId, active: true });
  } catch (err) {
    error('save-subscription error: ' + err.message);
    return res.json({ success: false, error: err.message }, 500);
  }
};
