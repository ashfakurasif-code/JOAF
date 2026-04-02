// =============================================================================
// discover-leaders.js — RSS ফিড থেকে বাংলাদেশি নেতা আবিষ্কার করে Firebase-এ সেভ করে
// Netlify Scheduled Function — প্রতিদিন রাত ২টায় BD Time (= ২০:০০ UTC) চলে
// =============================================================================

const GROQ_KEY    = process.env.GROQ_API_KEY;
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];

// Firebase project config (public client key only — no secrets)
const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

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
// Firestore REST — বিদ্যমান leader ID-গুলো পড়ে
// Read all document IDs from a Firestore collection via REST API
// ─────────────────────────────────────────────────────────────────────────────
async function firestoreGetIds(col) {
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/${col}?key=${FB_CONFIG.apiKey}&pageSize=200`;
  try {
    const r = await fetch(url);
    if (!r.ok) return new Set();
    const data = await r.json();
    return new Set((data.documents || []).map(d => d.name.split('/').pop()));
  } catch (e) {
    return new Set();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Firestore REST — একটি document সেভ বা আপডেট করে (PATCH)
// Write/update a Firestore document via REST API
// ─────────────────────────────────────────────────────────────────────────────
async function firestoreSet(col, docId, data) {
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) return {
      arrayValue: {
        values: v.map(i => {
          if (typeof i === 'object' && i !== null)
            return { mapValue: { fields: Object.fromEntries(Object.entries(i).map(([k, vv]) => [k, toField(vv)])) } };
          return toField(i);
        }),
      },
    };
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toField(v)]));
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/${col}/${docId}?key=${FB_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method:  'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error('Firestore PATCH failed: ' + r.status);
  return r.json();
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
          max_tokens:  6000,
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

  const today = BD_TODAY();

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

  // ── Firebase-এ আগের নেতাদের ID বের করো (duplicate চেক) ──
  // Get existing leader IDs to avoid duplicates
  const existingIds = await firestoreGetIds('leaders');

  // ── নতুন নেতাদের Firebase-এ সেভ করো ──
  // Save only newly discovered leaders (skip existing ones)
  let added   = 0;
  let skipped = 0;
  const results = [];

  for (const leader of discovered) {
    if (!leader.id || !leader.name) continue;

    // ইতিমধ্যে Firebase-এ আছে — skip
    if (existingIds.has(leader.id)) {
      skipped++;
      continue;
    }

    try {
      await firestoreSet('leaders', leader.id, {
        name:          leader.name,
        party:         leader.party         || '',
        role:          leader.role          || '',
        cat:           leader.cat           || 'সুশীল সমাজ',
        icon:          leader.icon          || '👤',
        isDeceased:    leader.isDeceased    === true,
        viral:         false,
        approval:      50,           // প্রাথমিক মান — update-leaders.js আপডেট করবে
        promises:      [],
        statements:    [],
        controversies: [],
        virals:        [],
        lastAiUpdate:  '',           // update-leaders.js পরে AI analysis করবে
        discoveredOn:  today,
        source:        'discover-leaders',
      });
      added++;
      results.push({ id: leader.id, name: leader.name, status: 'added' });
      // Firestore rate-limit এড়াতে ছোট বিরতি
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      results.push({ id: leader.id, name: leader.name, status: 'error', error: e.message });
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
      discoveredByAI:   discovered.length,
      added,
      skipped,
      results,
    }),
  };
};
