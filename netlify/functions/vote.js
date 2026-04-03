// JOAF Poll Vote Function — Appwrite backend
// Per-IP per-poll per-day deduplication using Appwrite
// IP is never stored raw; only sha256(ip + VOTE_SALT) is stored

const { Client, Databases, ID, Query } = require('node-appwrite');
const crypto = require('crypto');

const ENDPOINT  = process.env.APPWRITE_ENDPOINT  || 'https://fra.cloud.appwrite.io/v1';
const PROJECT   = process.env.APPWRITE_PROJECT_ID;
const DATABASE  = process.env.APPWRITE_DATABASE_ID;
const API_KEY   = process.env.APPWRITE_API_KEY;
const VOTE_SALT = process.env.VOTE_SALT;

// Allowed origins
const ALLOWED_ORIGINS = ['https://www.julyforum.com', 'https://julyforum.com'];

function getClient() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT)
    .setKey(API_KEY);
  return new Databases(client);
}

function ipHash(ip) {
  return crypto.createHash('sha256').update(ip + VOTE_SALT).digest('hex');
}

function todayUTC() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
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

  // Required env vars check
  if (!PROJECT || !DATABASE || !API_KEY || !VOTE_SALT) {
    const missing = [!PROJECT && 'APPWRITE_PROJECT_ID', !DATABASE && 'APPWRITE_DATABASE_ID', !API_KEY && 'APPWRITE_API_KEY', !VOTE_SALT && 'VOTE_SALT'].filter(Boolean).join(', ');
    console.error('Missing required env vars:', missing);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, message: `Server misconfiguration: missing env vars: ${missing}` }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { pollId, option } = body;

    if (!pollId || !option) {
      return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'pollId এবং option দরকার' }) };
    }

    const db = getClient();
    const day = todayUTC();
    const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || event.headers['client-ip']
            || '0.0.0.0';
    const hash = ipHash(ip);
    const dedupeId = `${day}__${pollId}__${hash}`;

    // Check deduplication — one vote per IP per poll per day
    let alreadyVoted = false;
    try {
      await db.getDocument(DATABASE, 'poll_dedupe_daily', dedupeId);
      alreadyVoted = true;
    } catch (e) {
      if (e.code !== 404) throw e;
    }

    if (alreadyVoted) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: false, duplicate: true, message: 'আজকে এই পোলে ইতিমধ্যে ভোট দিয়েছেন' }),
      };
    }

    // Record dedupe entry (TTL kept low — 48 h is enough but Appwrite free tier has no TTL; just store)
    await db.createDocument(DATABASE, 'poll_dedupe_daily', dedupeId, {
      pollId,
      ipHash: hash,
      day,
      createdAt: new Date().toISOString(),
    });

    // Upsert daily shard: docId = `${day}__${pollId}`
    const shardId = `${day}__${pollId}`;
    let shard;
    try {
      shard = await db.getDocument(DATABASE, 'poll_results_daily', shardId);
    } catch (e) {
      if (e.code !== 404) throw e;
      shard = null;
    }

    if (shard) {
      const counts = typeof shard.counts === 'string'
        ? JSON.parse(shard.counts || '{}')
        : (shard.counts || {});
      counts[option] = (counts[option] || 0) + 1;
      await db.updateDocument(DATABASE, 'poll_results_daily', shardId, {
        counts: JSON.stringify(counts),
        total: (shard.total || 0) + 1,
        updatedAt: new Date().toISOString(),
      });
    } else {
      const counts = { [option]: 1 };
      await db.createDocument(DATABASE, 'poll_results_daily', shardId, {
        pollId,
        day,
        counts: JSON.stringify(counts),
        total: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'ভোট গৃহীত হয়েছে' }),
    };

  } catch (err) {
    console.error('vote error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Server error' }) };
  }
};
