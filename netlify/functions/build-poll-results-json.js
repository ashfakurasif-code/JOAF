// netlify/functions/build-poll-results-json.js
// Scheduled every 10 minutes — aggregates Appwrite poll_results_daily (last 30 days)
// and commits the result to data/poll-results.json via GitHub API

const { Client, Databases, Query } = require('node-appwrite');

const ENDPOINT  = process.env.APPWRITE_ENDPOINT  || 'https://fra.cloud.appwrite.io/v1';
const PROJECT   = process.env.APPWRITE_PROJECT_ID;
const DATABASE  = process.env.APPWRITE_DATABASE_ID;
const API_KEY   = process.env.APPWRITE_API_KEY;

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO         = 'ashfakurasif-code/JOAF';
const BRANCH       = 'main';
const FILE_PATH    = 'data/poll-results.json';

function getDb() {
  const client = new Client()
    .setEndpoint(ENDPOINT)
    .setProject(PROJECT)
    .setKey(API_KEY);
  return new Databases(client);
}

function daysAgoUTC(n) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

async function fetchAllShards(db) {
  const since = daysAgoUTC(30);
  const docs = [];
  let cursor = null;

  // Appwrite list with pagination (max 100 per page)
  while (true) {
    const queries = [
      Query.greaterThanEqual('day', since),
      Query.limit(100),
    ];
    if (cursor) queries.push(Query.cursorAfter(cursor));

    const res = await db.listDocuments(DATABASE, 'poll_results_daily', queries);
    docs.push(...res.documents);

    if (res.documents.length < 100) break;
    cursor = res.documents[res.documents.length - 1].$id;
  }

  return docs;
}

function aggregate(docs) {
  const results = {};

  for (const doc of docs) {
    const { pollId } = doc;
    if (!pollId || !doc.counts) continue;

    const counts = typeof doc.counts === 'string'
      ? JSON.parse(doc.counts)
      : doc.counts;

    if (!results[pollId]) {
      results[pollId] = {};
    }

    for (const [option, count] of Object.entries(counts)) {
      results[pollId][option] = (results[pollId][option] || 0) + Number(count);
    }
  }

  return results;
}

async function commitToGitHub(content) {
  const encoded = Buffer.from(content).toString('base64');

  // Get current file SHA if it exists
  let sha = null;
  try {
    const checkRes = await fetch(
      `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}?ref=${BRANCH}`,
      {
        headers: {
          Authorization: `token ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    if (checkRes.ok) {
      const existing = await checkRes.json();
      sha = existing.sha;
    }
  } catch (_) {}

  const payload = {
    message: `chore: rebuild poll-results.json [${new Date().toISOString()}]`,
    content: encoded,
    branch: BRANCH,
  };
  if (sha) payload.sha = sha;

  const uploadRes = await fetch(
    `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!uploadRes.ok) {
    const err = await uploadRes.json();
    throw new Error(`GitHub commit failed: ${err.message}`);
  }

  return await uploadRes.json();
}

exports.handler = async () => {
  if (!PROJECT || !DATABASE || !API_KEY) {
    const missing = [!PROJECT && 'APPWRITE_PROJECT_ID', !DATABASE && 'APPWRITE_DATABASE_ID', !API_KEY && 'APPWRITE_API_KEY'].filter(Boolean).join(', ');
    console.error('Missing required env vars:', missing);
    return { statusCode: 500, body: `Server misconfiguration: missing env vars: ${missing}` };
  }
  try {
    const db = getDb();
    const docs = await fetchAllShards(db);
    const results = aggregate(docs);

    const json = JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        results,
      },
      null,
      2
    );

    await commitToGitHub(json);

    console.log(`poll-results.json rebuilt: ${Object.keys(results).length} polls aggregated`);
    return { statusCode: 200, body: 'OK' };
  } catch (err) {
    console.error('build-poll-results-json error:', err);
    return { statusCode: 500, body: err.message };
  }
};
