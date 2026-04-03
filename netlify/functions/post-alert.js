// netlify/functions/post-alert.js
// Validates and rate-limits emergency alert submissions, writes to Appwrite alerts collection
// Rate limit: 5 alerts per 10 minutes per IP (via Appwrite alerts collection; keyed on ipHash)
// Raw IP is never stored — only sha256(ip + ALERT_SALT)

const { Client, Databases, ID, Query } = require('node-appwrite');
const crypto = require('crypto');

const ENDPOINT = process.env.APPWRITE_ENDPOINT  || 'https://fra.cloud.appwrite.io/v1';
const PROJECT  = process.env.APPWRITE_PROJECT_ID;
const DATABASE = process.env.APPWRITE_DATABASE_ID;
const API_KEY  = process.env.APPWRITE_API_KEY;

const RATE_LIMIT_MAX    = 5;        // max alerts per window
const RATE_LIMIT_WINDOW = 10 * 60; // 10 minutes in seconds

const ALLOWED_ORIGINS = ['https://www.julyforum.com', 'https://julyforum.com'];

const VALID_TYPES = ['flood', 'fire', 'accident', 'crime', 'health', 'medical', 'political', 'other'];

function getDb() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT)
    .setKey(API_KEY);
  return new Databases(client);
}

function getIp(event) {
  return (
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['client-ip'] ||
    '0.0.0.0'
  );
}

function hashIp(ip, salt) {
  return crypto.createHash('sha256').update(ip + salt).digest('hex');
}

// Text sanitizer — strip all angle-bracket characters to prevent HTML injection
function sanitize(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[<>]/g, '').trim().slice(0, 500);
}

exports.handler = async (event) => {
  const origin = event.headers['origin'] || event.headers['Origin'] || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Vary': 'Origin',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // ALERT_SALT is required for IP hashing privacy
  const ALERT_SALT = process.env.ALERT_SALT;
  if (!PROJECT || !DATABASE || !API_KEY || !ALERT_SALT) {
    const missing = [!PROJECT && 'APPWRITE_PROJECT_ID', !DATABASE && 'APPWRITE_DATABASE_ID', !API_KEY && 'APPWRITE_API_KEY', !ALERT_SALT && 'ALERT_SALT'].filter(Boolean).join(', ');
    console.error('Missing required env vars:', missing);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: `Server misconfiguration: missing env vars: ${missing}` }),
    };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (_) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { title, description, location, reporter, type, imageUrl, lat, lng } = body;

  // Validate required fields
  if (!sanitize(title) || !sanitize(description) || !sanitize(location)) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'শিরোনাম, বিবরণ ও এলাকা আবশ্যক' }),
    };
  }

  if (type && !VALID_TYPES.includes(type)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid alert type' }) };
  }

  const db = getDb();
  const ip = getIp(event);
  const ipHash = hashIp(ip, ALERT_SALT);
  const now = Date.now();
  const windowStart = new Date(now - RATE_LIMIT_WINDOW * 1000).toISOString();

  // Rate limit check — count alerts from this ipHash in the last 10 minutes
  try {
    const recent = await db.listDocuments(DATABASE, 'alerts', [
      Query.equal('ipHash', ipHash),
      Query.greaterThan('createdAt', windowStart),
      Query.limit(RATE_LIMIT_MAX + 1),
    ]);

    if (recent.total >= RATE_LIMIT_MAX) {
      return {
        statusCode: 429,
        headers,
        body: JSON.stringify({ error: '১০ মিনিটে সর্বোচ্চ ৫টি সতর্কতা পাঠানো যাবে। একটু পরে চেষ্টা করুন।' }),
      };
    }
  } catch (err) {
    // If rate-limit check fails, continue to allow submission (fail-open)
    console.warn('Rate limit check failed:', err.message);
  }

  // Write alert to Appwrite (store ipHash, never raw IP)
  try {
    const doc = await db.createDocument(DATABASE, 'alerts', ID.unique(), {
      title: sanitize(title),
      description: sanitize(description),
      location: sanitize(location),
      reporter: sanitize(reporter || ''),
      type: VALID_TYPES.includes(type) ? type : 'other',
      imageUrl: typeof imageUrl === 'string' ? imageUrl.slice(0, 1000) : null,
      lat: typeof lat === 'number' ? lat : null,
      lng: typeof lng === 'number' ? lng : null,
      ipHash,
      createdAt: new Date().toISOString(),
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, id: doc.$id }),
    };
  } catch (err) {
    console.error('post-alert error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'সমস্যা হয়েছে, আবার চেষ্টা করুন।' }),
    };
  }
};
