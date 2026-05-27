const webpush = require('web-push');
const {
  awUpsert,
  initDatabase,
  sanitizeId,
  COLLECTION_ID,
} = require('./aw-utils');

// TASK 1: Strip literal \n that Netlify injects into env var values for VAPID keys.
// VAPID keys are base64url strings and must never contain newline characters.
function getSanitizedVapidKeys() {
  const publicKey  = (process.env.VAPID_PUBLIC_KEY  || '').replace(/\\n/g, '').replace(/\n/g, '');
  const privateKey = (process.env.VAPID_PRIVATE_KEY || '').replace(/\\n/g, '').replace(/\n/g, '');
  const contact    =  process.env.VAPID_SUBJECT || 'mailto:admin@joaf.local';
  return { publicKey, privateKey, contact };
}

function validateVapidKeys() {
  const { publicKey, privateKey, contact } = getSanitizedVapidKeys();

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variables');
  }

  try {
    webpush.setVapidDetails(contact, publicKey, privateKey);
    return { publicKey, contact };
  } catch (error) {
    throw new Error(`Invalid VAPID configuration: ${error.message}`);
  }
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    validateVapidKeys();
    await initDatabase();

    // TASK 3: Robustly parse ANY incoming payload shape.
    // The sw.js Background Sync sends the raw PushSubscription object directly
    // (body = JSON.stringify(sub)), while components.js sends the wrapped shape
    // { subscription, district, deviceInfo }. We handle both.
    let rawBody;
    try {
      rawBody = JSON.parse(event.body || '{}');
    } catch (_) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body' }),
      };
    }

    // Detect shape: if the body itself looks like a PushSubscription (has .endpoint at root)
    // then it was sent raw (sw.js sync path). Otherwise expect the wrapped shape.
    let subscription, district, deviceInfo;

    if (rawBody && rawBody.endpoint) {
      // Raw PushSubscription object (sw.js syncSubscription path)
      subscription = rawBody;
      district     = '';
      deviceInfo   = {};
    } else {
      // Wrapped payload from components.js joafSaveSubscription
      subscription = rawBody.subscription || null;
      district     = rawBody.district     || '';
      deviceInfo   = rawBody.deviceInfo   || {};
    }

    // Normalise: if subscription is a JSON string, parse it
    if (typeof subscription === 'string') {
      try {
        subscription = JSON.parse(subscription);
      } catch (_) {
        subscription = null;
      }
    }

    if (!subscription || !subscription.endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid subscription payload — endpoint missing' }),
      };
    }

    // Guarantee keys are present and not empty strings
    const keys = subscription.keys || {};
    if (!keys.p256dh || !keys.auth) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid subscription payload — missing p256dh/auth keys' }),
      };
    }

    // Build a clean, canonical subscription object before stringifying
    const cleanSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth:   keys.auth,
      },
      ...(subscription.expirationTime !== undefined
        ? { expirationTime: subscription.expirationTime }
        : {}),
    };

    const id = sanitizeId(
      Buffer.from(cleanSubscription.endpoint).toString('base64url').slice(-32)
    );

    // TASK 3: Forcefully upsert with active:true and updatedAt regardless of prior state
    await awUpsert(COLLECTION_ID, id, {
      endpoint:         cleanSubscription.endpoint,
      subscriptionJson: JSON.stringify(cleanSubscription),
      district:         typeof district === 'string' ? district : '',
      deviceInfo:       deviceInfo && typeof deviceInfo === 'object' ? deviceInfo : {},
      active:           true,
      updatedAt:        new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        id,
        active: true,
      }),
    };
  } catch (error) {
    console.error('save-subscription failure', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
      }),
    };
  }
};
