// netlify/functions/save-subscription.js
// User এর push subscription Appwrite এ save করে

const { Client, Databases } = require('node-appwrite');
const crypto = require('crypto');

const ENDPOINT = process.env.APPWRITE_ENDPOINT  || 'https://fra.cloud.appwrite.io/v1';
const PROJECT  = process.env.APPWRITE_PROJECT_ID;
const DATABASE = process.env.APPWRITE_DATABASE_ID;
const API_KEY  = process.env.APPWRITE_API_KEY;

function getDb() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT)
    .setKey(API_KEY);
  return new Databases(client);
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
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!PROJECT || !DATABASE || !API_KEY) {
    const missing = [!PROJECT && 'APPWRITE_PROJECT_ID', !DATABASE && 'APPWRITE_DATABASE_ID', !API_KEY && 'APPWRITE_API_KEY'].filter(Boolean).join(', ');
    console.error('Missing required env vars:', missing);
    return { statusCode: 500, headers, body: JSON.stringify({ error: `Server misconfiguration: missing env vars: ${missing}` }) };
  }

  try {
    const body = JSON.parse(event.body);
    const { subscription, deviceInfo } = body;

    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid subscription' }) };
    }

    // endpoint দিয়ে stable unique ID বানাও (SHA-256 hash)
    const id = crypto.createHash('sha256').update(subscription.endpoint).digest('hex').slice(0, 36);

    const db = getDb();
    const now = new Date().toISOString();

    // Try to update existing document; create if not found
    let doc;
    try {
      doc = await db.updateDocument(DATABASE, 'push_subscriptions', id, {
        subscription: JSON.stringify(subscription),
        endpoint: subscription.endpoint,
        deviceInfo: JSON.stringify(deviceInfo || {}),
        updatedAt: now,
        active: true,
      });
    } catch (e) {
      if (e.code !== 404) throw e;
      doc = await db.createDocument(DATABASE, 'push_subscriptions', id, {
        subscription: JSON.stringify(subscription),
        endpoint: subscription.endpoint,
        deviceInfo: JSON.stringify(deviceInfo || {}),
        createdAt: now,
        updatedAt: now,
        active: true,
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: doc.$id }),
    };
  } catch (err) {
    console.error('save-subscription error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
