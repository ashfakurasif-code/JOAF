const webpush = require('web-push');
const {
  awUpsert,
  initDatabase,
  sanitizeId,
  COLLECTION_ID,
} = require('./aw-utils');

function validateVapidKeys() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const contact = process.env.VAPID_SUBJECT || 'mailto:admin@joaf.local';

  if (!publicKey || !privateKey) {
    throw new Error('Missing VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY environment variables');
  }

  try {
    webpush.setVapidDetails(contact, publicKey.replace(/\\n/g,'').trim(), privateKey.replace(/\\n/g,'').trim());
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

    const body = JSON.parse(event.body || '{}');
    const { subscription, district = '', deviceInfo = {} } = body;

    if (!subscription?.endpoint) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid subscription payload' }),
      };
    }

    const id = sanitizeId(
      Buffer.from(subscription.endpoint)
        .toString('base64url')
        .slice(-32)
    );

    await awUpsert(COLLECTION_ID, id, {
      endpoint: subscription.endpoint,
      subscriptionJson: JSON.stringify(subscription),
      district,
      deviceInfo,
      active: true,
      updatedAt: new Date().toISOString(),
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
