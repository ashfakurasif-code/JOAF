// =============================================================================
// discover-leaders.js — RSS ফিড থেকে বাংলাদেশি নেতা আবিষ্কার করে Appwrite-এ সেভ করে
// Netlify Scheduled Function — প্রতিদিন রাত ২টায় BD Time (= ২০:০০ UTC) চলে
// 3-day BD-date gate: Appwrite meta collection-এ lastRunBdDate রেখে ৩ দিন পরপর run করে
// =============================================================================

const { Client, Databases, ID, Query } = require('node-appwrite');

const GROQ_KEY    = process.env.GROQ_API_KEY;
const GROQ_MODELS = ['llama-3.3-70b-versatile'];

// Appwrite config (server-side, uses API key)
const APPWRITE_ENDPOINT   = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_API_KEY    = process.env.APPWRITE_API_KEY;

// Meta collection/doc for 3-day gate state
const META_COLLECTION  = 'leader_discovery_meta';
const META_DOC_ID      = 'state';

function getDb() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

// ─────────────────────────────────────────────────────────────────────────────
// ৬+ বাংলাদেশি RSS ফিড লিস্ট
// 8 Bangladeshi news RSS feeds — used for leader discovery
// ─────────────────────────────────────────────────────────────────────────────
const RSS_FEEDS = [
  { url: 'https://www.prothomalo.com/feed',              name: 'প্রথম আলো' },
  { url: 'https://www.thedailystar.net/rss/all-news',    name: 'The Daily Star' },
  { url: 'https://bangla.bdnews24.com/rss2/news.xml',    name: 'BDNews24' },
  { url: 'https://www.dhakatribune.com/feed',            name: 'Dhaka Tribune' },
  { url: 'https://www.jugantor.com/rss/all-news',        name: 'জুগান্তর' },
  { url: 'https://samakal.com/rss.xml',                  name: 'সমকাল' },
  { url: 'https://www.banglatribune.com/feed/rss',       name: 'বাংলা ট্রিবিউন' },
  { url: 'https://www.banglanews24.com/rss/latest.xml',  name: 'বাংলানিউজ২৪' },
];

// Bangladesh date helper (UTC+6)
const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);

// ─────────────────────────────────────────────────────────────────────────────
// HTML ট্যাগ স্ট্রিপার — server-side RSS content থেকে plain text বের করে
// Strip HTML tags from RSS content using a safe split approach (no regex HTML patterns)
// This is server-side only; data goes to AI API, never rendered as HTML
// ─────────────────────────────────────────────────────────────────────────────
function stripHtml(raw) {
  // Split on '<', drop everything up to the closing '>' in each subsequent part
  return raw
    .split('<')
    .map((part, i) => {
      if (i === 0) return part; // text before first tag
      const close = part.indexOf('>');
      return close >= 0 ? part.slice(close + 1) : ''; // text after closing >
    })
    .join('')
    .replace(/&[a-zA-Z0-9#]{1,8};/g, ' ')  // decode common HTML entities
    .replace(/\s+/g, ' ')
    .trim();
}
// Fetch one RSS feed and extract up to 15 news items
// ─────────────────────────────────────────────────────────────────────────────
async function fetchRss(feed) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(feed.url, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'JOAF-LeaderBot/1.0' },
    });
    clearTimeout(tid);
    if (!res.ok) return [];

    const xml   = await res.text();
    const items = [];
    const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < 15) {
      const blk  = m[1];
      // Extract title (handles CDATA)
      const title = (blk.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]
        ?.trim() || '';
      // Extract description using stripHtml helper — safe, no regex HTML patterns
      const rawDesc = (blk.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1]?.trim() || '';
      const desc = stripHtml(rawDesc).slice(0, 200);
      if (title) items.push({ title, desc, source: feed.name });
    }
    return items;
  } catch (e) {
    clearTimeout(tid);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 3-day BD-date gate — Appwrite meta doc থেকে lastRunBdDate পড়ে
// Returns { shouldRun, lastRunBdDate } — skips if < 3 BD days since last run
// ─────────────────────────────────────────────────────────────────────────────
async function checkAndUpdateGate(db, today) {
  let lastRunBdDate = null;
  let docExists = false;

  try {
    const doc = await db.getDocument(APPWRITE_DATABASE_ID, META_COLLECTION, META_DOC_ID);
    lastRunBdDate = doc.lastRunBdDate || null;
    docExists = true;
  } catch (e) {
    if (e.code !== 404) throw e;
  }

  // Compare BD dates: skip if last run was < 3 days ago
  if (lastRunBdDate) {
    const last = new Date(lastRunBdDate + 'T00:00:00Z');
    const now  = new Date(today + 'T00:00:00Z');
    const diffDays = Math.floor((now - last) / 86400000);
    if (diffDays < 3) {
      return { shouldRun: false, lastRunBdDate, diffDays };
    }
  }

  return { shouldRun: true, lastRunBdDate, docExists };
}

async function updateGate(db, today, docExists) {
  try {
    if (docExists) {
      await db.updateDocument(APPWRITE_DATABASE_ID, META_COLLECTION, META_DOC_ID, {
        lastRunBdDate: today,
        updatedAt: new Date().toISOString(),
      });
    } else {
      await db.createDocument(APPWRITE_DATABASE_ID, META_COLLECTION, META_DOC_ID, {
        lastRunBdDate: today,
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (e) {
    console.warn('updateGate error:', e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Appwrite — বিদ্যমান leader ID-গুলো পড়ে (duplicate চেক)
// Read existing leader document IDs from Appwrite
// ─────────────────────────────────────────────────────────────────────────────
async function appwriteGetLeaderIds(db) {
  try {
    const res = await db.listDocuments(APPWRITE_DATABASE_ID, 'leaders', [
      Query.limit(200),
    ]);
    return new Set(res.documents.map(d => d.$id));
  } catch (e) {
    return new Set();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Appwrite — একটি leader document সেভ করে
// Create a new leader document in Appwrite
// ─────────────────────────────────────────────────────────────────────────────
async function appwriteCreateLeader(db, leaderId, data) {
  return db.createDocument(APPWRITE_DATABASE_ID, 'leaders', leaderId, {
    name:          data.name,
    party:         data.party          || '',
    role:          data.role           || '',
    cat:           data.cat            || 'সুশীল সমাজ',
    icon:          data.icon           || '👤',
    isDeceased:    data.isDeceased     === true,
    viral:         false,
    approval:      50,
    promises:      '[]',
    statements:    '[]',
    controversies: '[]',
    virals:        '[]',
    lastAiUpdate:  '',
    discoveredOn:  data.discoveredOn,
    source:        'discover-leaders',
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq AI — সংবাদ শিরোনাম থেকে ৬০+ নেতা আবিষ্কার করে
// Use Groq AI to discover minimum 60 leaders from the news headlines
// ─────────────────────────────────────────────────────────────────────────────
async function discoverLeadersWithAI(headlines, today) {
  const headlineText = headlines
    .map((h, i) => `${i + 1}. [${h.source}] ${h.title} — ${h.desc}`)
    .join('\n');

  // AI prompt: discover minimum 60 Bangladeshi leaders from news
  const prompt = `তুমি বাংলাদেশের নিরপেক্ষ রাজনৈতিক বিশ্লেষক। আজকের তারিখ ${today}।

নিচের সাম্প্রতিক বাংলাদেশি সংবাদ শিরোনাম থেকে বাংলাদেশের ন্যূনতম ৬০ জন উল্লেখযোগ্য নেতা/ব্যক্তিত্ব/কর্মী আবিষ্কার করো।

অন্তর্ভুক্ত করো: রাজনীতিবিদ, সরকারি উপদেষ্টা, ছাত্র নেতা, সুশীল সমাজ নেতা, ব্যবসায়ী, বিশ্লেষক, সাংবাদিক — সব পক্ষ থেকে।

সংবাদ শিরোনাম:
${headlineText}

শুধু JSON array return করো, আর কিছু না, কোনো markdown নেই:
[{"id":"unique_snake_id","name":"পূর্ণ নাম","party":"দল/প্রতিষ্ঠান","role":"পদবি","cat":"সরকার|বিরোধী দল|যুব রাজনীতি|সুশীল সমাজ|আওয়ামী লীগ|ব্যবসায়ী|মিডিয়া","icon":"emoji","isDeceased":false}]

নিয়ম:
- ন্যূনতম ৬০ জন (সর্বোচ্চ ১০০ জন)
- id: lowercase English letters এবং underscore, unique (যেমন: dr_yunus, nahid_islam)
- সব বাংলায় (name, party, role, cat)
- isDeceased: এই ব্যক্তি মৃত হলে true, জীবিত হলে false
- icon: উপযুক্ত emoji`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body:    JSON.stringify({
          model,
          messages:    [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens:  1200,
        }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let txt = data.choices?.[0]?.message?.content || '';
      txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = txt.match(/\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
    } catch (e) { continue; }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Netlify Function Handler
// ─────────────────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  // Required env vars check
  if (!APPWRITE_PROJECT_ID || !APPWRITE_DATABASE_ID || !APPWRITE_API_KEY) {
    const missing = [!APPWRITE_PROJECT_ID && 'APPWRITE_PROJECT_ID', !APPWRITE_DATABASE_ID && 'APPWRITE_DATABASE_ID', !APPWRITE_API_KEY && 'APPWRITE_API_KEY'].filter(Boolean).join(', ');
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, reason: 'missing_env', missing }) };
  }

  const today = BD_TODAY();
  const db = getDb();

  // ── 3-day BD-date gate — Appwrite meta থেকে lastRunBdDate চেক করে ──
  // Skip if last successful run was < 3 BD days ago
  let gateInfo;
  try {
    gateInfo = await checkAndUpdateGate(db, today);
  } catch (e) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, reason: 'gate_error', error: e.message }) };
  }

  if (!gateInfo.shouldRun) {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({
        success: false,
        reason:  'too_soon',
        lastRunBdDate: gateInfo.lastRunBdDate,
        diffDays: gateInfo.diffDays,
        message: `শেষ রান ${gateInfo.lastRunBdDate} — ৩ দিন হয়নি (${gateInfo.diffDays} দিন হয়েছে)`,
      }),
    };
  }

  // ── সব RSS ফিড থেকে সমান্তরালে সংবাদ সংগ্রহ ──
  // Fetch all feeds in parallel and combine results
  const allItems = [];
  await Promise.allSettled(
    RSS_FEEDS.map(async feed => {
      const items = await fetchRss(feed);
      allItems.push(...items);
    })
  );

  if (allItems.length < 5) {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: false, reason: 'rss_empty', fetched: allItems.length }),
    };
  }

  // ── Groq AI দিয়ে ৬০+ নেতা আবিষ্কার ──
  // Discover minimum 60 leaders from the collected headlines
  const discovered = await discoverLeadersWithAI(allItems.slice(0, 80), today);
  if (!discovered || !Array.isArray(discovered) || discovered.length < 10) {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: false, reason: 'ai_failed', fetched: allItems.length }),
    };
  }

  // ── Appwrite-এ আগের নেতাদের ID বের করো (duplicate চেক) ──
  // Get existing leader IDs to avoid duplicates
  const existingIds = await appwriteGetLeaderIds(db);

  // ── নতুন নেতাদের Appwrite-এ সেভ করো ──
  // Save only newly discovered leaders (skip existing ones)
  let added   = 0;
  let skipped = 0;
  const results = [];

  for (const leader of discovered) {
    if (!leader.id || !leader.name) continue;

    // ইতিমধ্যে Appwrite-এ আছে — skip
    if (existingIds.has(leader.id)) {
      skipped++;
      continue;
    }

    try {
      await appwriteCreateLeader(db, leader.id, {
        name:        leader.name,
        party:       leader.party      || '',
        role:        leader.role       || '',
        cat:         leader.cat        || 'সুশীল সমাজ',
        icon:        leader.icon       || '👤',
        isDeceased:  leader.isDeceased === true,
        discoveredOn: today,
      });
      added++;
      results.push({ id: leader.id, name: leader.name, status: 'added' });
      // Appwrite rate-limit এড়াতে ছোট বিরতি
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      results.push({ id: leader.id, name: leader.name, status: 'error', error: e.message });
    }
  }

  // ── সফল রান হলে meta doc আপডেট করো ──
  // Update lastRunBdDate in Appwrite meta doc on successful run
  await updateGate(db, today, gateInfo.docExists);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success:          true,
      date:             today,
      feedsChecked:     RSS_FEEDS.length,
      headlinesFetched: allItems.length,
      discoveredByAI:   discovered.length,
      added,
      skipped,
      results,
    }),
  };
};
