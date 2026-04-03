// =============================================================================
// generate-timeline.js — RSS ফিড থেকে Timeline Events তৈরি করে Appwrite-এ সেভ করে
// Netlify Scheduled Function — প্রতিদিন রাত ২টায় BD Time (= ২০:০০ UTC) চলে
// =============================================================================

const { Client, Databases, Query } = require('node-appwrite');

const GROQ_KEY    = process.env.GROQ_API_KEY;
const GROQ_MODELS = ['llama-3.3-70b-versatile'];

// Appwrite config (server-side, uses API key)
const APPWRITE_ENDPOINT    = process.env.APPWRITE_ENDPOINT   || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID  = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_DATABASE_ID = process.env.APPWRITE_DATABASE_ID;
const APPWRITE_API_KEY     = process.env.APPWRITE_API_KEY;

function getDb() {
  const client = new Client()
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID)
    .setKey(APPWRITE_API_KEY);
  return new Databases(client);
}

// ─────────────────────────────────────────────────────────────────────────────
// ৬+ বাংলাদেশি RSS ফিড লিস্ট
// 8 Bangladeshi news RSS feeds — used for timeline event generation
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
// Strip HTML tags using a safe split approach (no regex HTML patterns)
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

// ─────────────────────────────────────────────────────────────────────────────
// RSS ফেচ ও পার্স — XML থেকে শিরোনাম, বিবরণ ও তারিখ বের করে
// Fetch one RSS feed and extract up to 10 news items with dates
// ─────────────────────────────────────────────────────────────────────────────
async function fetchRss(feed) {
  const controller = new AbortController();
  const tid = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(feed.url, {
      signal:  controller.signal,
      headers: { 'User-Agent': 'JOAF-TimelineBot/1.0' },
    });
    clearTimeout(tid);
    if (!res.ok) return [];

    const xml   = await res.text();
    const items = [];
    const itemRe = /<item[^>]*>([\s\S]*?)<\/item>/g;
    let m;
    while ((m = itemRe.exec(xml)) !== null && items.length < 10) {
      const blk = m[1];
      // Extract title (handles CDATA)
      const title = (blk.match(/<title[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1]
        ?.trim() || '';
      // Extract description using stripHtml helper — safe, no regex HTML patterns
      const rawDesc = (blk.match(/<description[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/) || [])[1]?.trim() || '';
      const desc = stripHtml(rawDesc).slice(0, 300);
      // Extract publish date
      const pubDate = (blk.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/) || [])[1]?.trim() || '';
      if (title) items.push({ title, desc, pubDate, source: feed.name });
    }
    return items;
  } catch (e) {
    clearTimeout(tid);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Appwrite — বিদ্যমান timeline ID-গুলো পড়ে
// Read existing timeline document IDs from Appwrite
// ─────────────────────────────────────────────────────────────────────────────
async function appwriteGetTimelineIds(db) {
  try {
    const res = await db.listDocuments(APPWRITE_DATABASE_ID, 'timeline', [
      Query.limit(100),
    ]);
    return new Set(res.documents.map(d => d.$id));
  } catch (e) {
    return new Set();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Appwrite — timeline document সেভ বা আপডেট করে
// Create or update a timeline document in Appwrite
// ─────────────────────────────────────────────────────────────────────────────
async function appwriteUpsertTimeline(db, docId, data) {
  try {
    await db.getDocument(APPWRITE_DATABASE_ID, 'timeline', docId);
    return db.updateDocument(APPWRITE_DATABASE_ID, 'timeline', docId, data);
  } catch (e) {
    if (e.code !== 404) throw e;
    return db.createDocument(APPWRITE_DATABASE_ID, 'timeline', docId, data);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq AI — সংবাদ থেকে Timeline Events তৈরি করে
// Use Groq AI to generate 8-12 timeline events from news items
// ─────────────────────────────────────────────────────────────────────────────
async function generateTimelineWithAI(newsItems, today) {
  const newsText = newsItems
    .map((n, i) => `${i + 1}. [${n.source}] ${n.title}\n   ${n.desc}`)
    .join('\n\n');

  // AI prompt: generate timeline events from the news
  const prompt = `তুমি বাংলাদেশের নিরপেক্ষ ঐতিহাসিক বিশ্লেষক। আজকের তারিখ ${today}।

নিচের সাম্প্রতিক বাংলাদেশি সংবাদ থেকে ৮-১২টি গুরুত্বপূর্ণ timeline event তৈরি করো।
শুধুমাত্র বাংলাদেশের জন্য সত্যিকারের গুরুত্বপূর্ণ ঘটনা — রাজনীতি, অর্থনীতি, সমাজ, জুলাই আন্দোলন।

সংবাদ:
${newsText}

শুধু JSON array return করো, আর কিছু না, কোনো markdown নেই:
[{"id":"unique_id","date":"তারিখ বাংলায় যেমন: এপ্রিল ২০২৬","title":"সংক্ষিপ্ত শিরোনাম","desc":"২-৩ বাক্যে বিবরণ","type":"milestone|positive|negative|neutral","tags":["politics","economy","social","crisis","govt","election","july"]}]

নিয়ম:
- ৮-১২টি event
- id: lowercase English letters এবং underscore, unique (যেমন: election_update_apr2026)
- date: বাংলায় লেখো (যেমন: এপ্রিল ২০২৬, ২ এপ্রিল ২০২৬)
- সব বাংলায় (title, desc, date)
- type: milestone (যুগান্তকারী), positive (ইতিবাচক), negative (নেতিবাচক), neutral (নিরপেক্ষ)
- tags: এক বা একাধিক, এই তালিকা থেকে: politics, economy, social, crisis, govt, election, july`;

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

  // ── সব RSS ফিড থেকে সমান্তরালে সংবাদ সংগ্রহ ──
  // Fetch all 8 feeds in parallel and combine news items
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

  // ── Groq AI দিয়ে Timeline Events তৈরি ──
  // Generate timeline events from collected headlines
  const events = await generateTimelineWithAI(allItems.slice(0, 60), today);
  if (!events || !Array.isArray(events) || events.length < 3) {
    return {
      statusCode: 200, headers,
      body: JSON.stringify({ success: false, reason: 'ai_failed', fetched: allItems.length }),
    };
  }

  // ── Appwrite-এ আগের timeline ID-গুলো বের করো ──
  const existingIds = await appwriteGetTimelineIds(db);

  // ── Timeline Events Appwrite-এ সেভ/আপডেট করো ──
  // Save new events; update existing ones with fresh data
  let added   = 0;
  let updated = 0;
  const results = [];

  for (const ev of events) {
    if (!ev.id || !ev.title) continue;
    const isNew = !existingIds.has(ev.id);
    try {
      await appwriteUpsertTimeline(db, ev.id, {
        date:    ev.date  || today,
        title:   ev.title || '',
        desc:    ev.desc  || '',
        type:    ev.type  || 'neutral',
        // tags stored as JSON string
        tags:    JSON.stringify(Array.isArray(ev.tags) ? ev.tags : []),
        addedOn: today,
      });
      isNew ? added++ : updated++;
      results.push({ id: ev.id, title: ev.title, status: isNew ? 'added' : 'updated' });
    } catch (e) {
      results.push({ id: ev.id, title: ev.title, status: 'error', error: e.message });
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      success:          true,
      date:             today,
      feedsChecked:     RSS_FEEDS.length,
      headlinesFetched: allItems.length,
      eventsGenerated:  events.length,
      added,
      updated,
      results,
    }),
  };
};
