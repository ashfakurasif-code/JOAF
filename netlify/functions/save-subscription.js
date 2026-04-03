// netlify/functions/save-subscription.js
// User এর push subscription Appwrite এ save করে

const { Client, Databases } = require('node-appwrite');

const ENDPOINT = process.env.APPWRITE_ENDPOINT  || 'https://fra.cloud.appwrite.io/v1';
const PROJECT  = process.env.APPWRITE_PROJECT_ID || '69ceec140033bccf5ea2';
const DATABASE = process.env.APPWRITE_DATABASE_ID || '69cef52f0018a2a7b05a';
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

  try {
    const body = JSON.parse(event.body);
    const { subscription, deviceInfo } = body;

    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid subscription' }) };
    }

    // endpoint দিয়ে unique ID বানাও
    const id = Buffer.from(subscription.endpoint).toString('base64').slice(-36).replace(/[^a-zA-Z0-9]/g, '_');

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
