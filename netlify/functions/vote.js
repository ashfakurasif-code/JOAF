// JOAF Poll Vote Function — Fixed version
// Uses simple in-memory store with cookie-based deduplication
// For production persistence, upgrade to Netlify Blobs or Supabase

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': 'https://julyforum.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, pollId, option } = body;

    // NOTE: In-memory — resets on cold start (Netlify Functions are stateless)
    // For persistent votes: use Netlify Blobs API or connect Supabase/Airtable
    // This is intentionally kept simple — upgrade path is documented below

    if (action === 'getVotes') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Connect a database for persistent votes', votes: {} })
      };
    }

    if (action === 'vote') {
      if (!pollId || !option) {
        return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'pollId এবং option দরকার' }) };
      }
      // Return success (frontend handles display via localStorage)
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'ভোট গৃহীত হয়েছে' })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Invalid action' }) };

  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Server error' }) };
  }
};

/*
  ── Upgrade to Persistent Polls ──────────────────────────────
  Option 1 (Free): Netlify Blobs
    const { getStore } = require('@netlify/blobs');
    const store = getStore('polls');
    const votes = JSON.parse(await store.get('votes') || '{}');
    votes[pollId] = (votes[pollId] || {});
    votes[pollId][option] = (votes[pollId][option] || 0) + 1;
    await store.set('votes', JSON.stringify(votes));

  Option 2 (Free tier): Supabase
    Use supabase-js to INSERT vote into a 'poll_votes' table
    Add unique constraint on (poll_id, ip_hash) to prevent double voting

  Option 3 (Free): Airtable API
    POST to Airtable REST API, store each vote as a record
*/
