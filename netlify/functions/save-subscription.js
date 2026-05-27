const webpush = require('web-push');
const {
  awList,
  awUpdate,
  awCreate,
  sanitizeId,
  COLLECTION_ID,
  qEqual,
  DEFAULT_DOC_PERMISSIONS,
} = require('./aw-utils');

// Strip literal \n that Netlify injects into env var string values.
// VAPID keys are base64url — no newlines allowed.
function getVapidKeys() {
  const pub  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/\\n/g, '').replace(/\n/g, '').trim();
  const priv = (process.env.VAPID_PRIVATE_KEY || '').replace(/\\n/g, '').replace(/\n/g, '').trim();
  const sub  =  process.env.VAPID_SUBJECT || 'mailto:admin@joaf.local';
  return { pub, priv, sub };
}

function validateVapid() {
  const { pub, priv, sub } = getVapidKeys();
  if (!pub || !priv) throw new Error('Missing VAPID keys');
  try {
    webpush.setVapidDetails(sub, pub, priv);
  } catch (e) {
    throw new Error('Invalid VAPID config: ' + e.message);
  }
}

// Find an existing doc in Appwrite by endpoint field value.
// Returns { docId, data } or null.
async function findByEndpoint(endpoint) {
  try {
    const query = qEqual('endpoint', endpoint);
    if (!query) return null;
    const docs = await awList(COLLECTION_ID, [query], 1);
    if (docs && docs.length > 0) {
      return { docId: docs[0].id, data: docs[0].data };
    }
    return null;
  } catch (_) {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    validateVapid();
    // NOTE: initDatabase() removed from hot path — it has a 3-second sleep and
    // should only be called once during setup, not on every subscription save.

    let rawBody;
    try { rawBody = JSON.parse(event.body || '{}'); }
    catch (_) { return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) }; }

    // Accept both shapes:
    // Shape A (sw.js): raw PushSubscription at root  -> { endpoint, keys, ... }
    // Shape B (components.js): wrapped              -> { subscription: {...}, district, deviceInfo }
    let subscription, district, deviceInfo;
    if (rawBody && rawBody.endpoint) {
      subscription = rawBody; district = ''; deviceInfo = {};
    } else {
      subscription = rawBody.subscription || null;
      district     = rawBody.district     || '';
      deviceInfo   = rawBody.deviceInfo   || {};
    }

    if (typeof subscription === 'string') {
      try { subscription = JSON.parse(subscription); } catch (_) { subscription = null; }
    }

    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing endpoint' }) };
    }

    const keys = subscription.keys || {};
    if (!keys.p256dh || !keys.auth) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing push keys' }) };
    }

    // Canonical subscription object
    const cleanSub = {
      endpoint: subscription.endpoint,
      keys: { p256dh: keys.p256dh, auth: keys.auth },
      ...(subscription.expirationTime !== undefined ? { expirationTime: subscription.expirationTime } : {}),
    };

    const upsertData = {
      endpoint:         cleanSub.endpoint,
      subscriptionJson: JSON.stringify(cleanSub),
      district:         typeof district === 'string' ? district.slice(0, 255) : '',
      active:           true,
      updatedAt:        new Date().toISOString(),
    };

    // Step 1: search Appwrite for existing doc by endpoint (handles both random IDs
    // from the original migration AND deterministic IDs from new saves).
    const existing = await findByEndpoint(cleanSub.endpoint);

    let savedId;
    if (existing) {
      // Update the existing doc — force active:true
      await awUpdate(COLLECTION_ID, existing.docId, upsertData);
      savedId = existing.docId;
    } else {
      // New subscription — create with deterministic ID derived from endpoint
      const newId = sanitizeId(
        Buffer.from(cleanSub.endpoint).toString('base64url').slice(-32)
      );
      await awCreate(COLLECTION_ID, upsertData, newId, DEFAULT_DOC_PERMISSIONS);
      savedId = newId;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: savedId, active: true }),
    };
  } catch (err) {
    console.error('save-subscription error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: err.message }),
    };
  }
};
