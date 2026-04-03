// netlify/functions/discover-leaders.js
// প্রতিদিন রাতে RSS news পড়ে AI দিয়ে leaders auto-discover করে Firebase update করে

const GROQ_KEY    = process.env.GROQ_API_KEY;
const ADMIN_KEY   = process.env.ADMIN_SECRET_KEY;
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);

// ── RSS Sources (fetch-rss.js এর মতোই) ──
const https = require('https');
const http  = require('http');

const RSS_SOURCES = [
  { id: 'proto',    name: 'প্রথম আলো',  rss: 'https://www.prothomalo.com/feed' },
  { id: 'bd24',     name: 'BD News 24', rss: 'https://bdnews24.com/bangladesh/feed' },
  { id: 'daily',    name: 'Daily Star', rss: 'https://www.thedailystar.net/rss.xml' },
  { id: 'jugantor', name: 'যুগান্তর',  rss: 'https://www.jugantor.com/feed/rss.xml' },
  { id: 'kaler',    name: 'কালের কণ্ঠ', rss: 'https://www.kalerkantho.com/rss.xml' },
];

function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JOAF-Discover/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      timeout: 8000,
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return resolve(fetchUrl(res.headers.location, redirectCount + 1));
      }
      if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
      let data = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function parseRSSTitles(xml) {
  const titles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && titles.length < 20) {
    const block = match[1];
    const tm = block.match(/<title(?:[^>]*)><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title(?:[^>]*)>([^<]*)<\/title>/);
    const title = tm ? (tm[1] || tm[2] || '').trim() : '';
    if (title) titles.push(title);
  }
  return titles;
}

async function fetchAllHeadlines() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(async (src) => {
      const xml = await fetchUrl(src.rss);
      return parseRSSTitles(xml);
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// ── Firestore REST ──
async function firestoreGet(collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/${collection}?key=${FB_CONFIG.apiKey}&pageSize=200`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Firestore GET failed: ' + r.status);
  const data = await r.json();
  return (data.documents || []).map(doc => {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const obj = { id };
    for (const [k, v] of Object.entries(fields)) {
      if (v.stringValue !== undefined) obj[k] = v.stringValue;
      else if (v.integerValue !== undefined) obj[k] = parseInt(v.integerValue);
      else if (v.doubleValue !== undefined) obj[k] = v.doubleValue;
      else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
    }
    return obj;
  });
}

async function firestoreSet(collection, docId, data) {
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(i => {
      if (typeof i === 'object' && i !== null) return { mapValue: { fields: Object.fromEntries(Object.entries(i).map(([k,vv]) => [k, toField(vv)])) } };
      return toField(i);
    })}};
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toField(v)]));
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/${collection}/${docId}?key=${FB_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) {
    const err = await r.text();
    throw new Error('Firestore PATCH failed: ' + err);
  }
  return await r.json();
}

async function firestorePatch(collection, docId, fieldUpdates) {
  // Partial patch — only specific fields
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(fieldUpdates).map(([k, v]) => [k, toField(v)]));
  const updateMask = Object.keys(fieldUpdates).map(k => `updateMask.fieldPaths=${k}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/${collection}/${docId}?key=${FB_CONFIG.apiKey}&${updateMask}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error('Firestore partial PATCH failed: ' + r.status);
  return await r.json();
}

// ── Groq: headlines থেকে relevant leaders বের করা ──
async function discoverLeadersFromHeadlines(headlines, existingLeaders, today) {
  const existingNames = existingLeaders.map(l => `${l.name} (id: ${l.id}, active: ${l.active !== false})`).join('\n');
  const headlineText = headlines.slice(0, 60).join('\n');

  const prompt = `তুমি বাংলাদেশের রাজনৈতিক বিশ্লেষক। আজকের তারিখ: ${today}।

নিচে আজকের বাংলাদেশের শীর্ষ সংবাদ শিরোনাম:
${headlineText}

বর্তমানে Firebase-এ tracked নেতারা:
${existingNames}

তোমাকে দুটো কাজ করতে হবে:

১) যে নেতারা আজকের news-এ উল্লেখ আছেন — তারা active: true।
   যারা মারা গেছেন, দেশ ছেড়ে চলে গেছেন, বা আর কোনো news-এই নেই — তারা active: false।
   isDeceased: true যদি মৃত্যুর খবর news-এ থাকে।

২) news-এ এমন কোনো নতুন নেতা বা ব্যক্তিত্ব আছেন যিনি বর্তমান list-এ নেই কিন্তু trending?
   তাঁদের নতুন করে add করতে হবে।

শুধু নিচের JSON দাও, অন্য কিছু নয়, কোনো markdown নেই:
{
  "updates": [
    {"id": "existing_id", "active": true/false, "isDeceased": true/false}
  ],
  "new_leaders": [
    {
      "id": "unique_slug_en",
      "name": "বাংলায় নাম",
      "party": "দলের নাম",
      "role": "পদবী",
      "cat": "সরকার|বিরোধী দল|যুব রাজনীতি|সুশীল সমাজ|ব্যবসায়ী|আওয়ামী লীগ",
      "icon": "একটি emoji",
      "active": true,
      "isDeceased": false
    }
  ],
  "summary": "সংক্ষিপ্ত বিবরণ বাংলায়"
}

নিয়ম:
- শুধু news-এ উল্লিখিত নামের ভিত্তিতে সিদ্ধান্ত নাও
- নতুন যোগ করো শুধু যদি সত্যিই trending হয় (কমপক্ষে ২টি শিরোনামে আসে)
- id অবশ্যই lowercase English, underscore দিয়ে, unique
- নতুন নেতা না পেলে new_leaders: []`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 2000 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let txt = data.choices?.[0]?.message?.content || '';
      txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = txt.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return parsed;
      }
    } catch (e) { continue; }
  }
  return null;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };

  // Auth check
  const adminKey    = event.headers?.['x-admin-key'];
  const isScheduled = event.headers?.['x-netlify-event'] === 'schedule';
  if (!isScheduled && adminKey !== ADMIN_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const today = BD_TODAY();

  try {
    // Step 1: আজকের headlines fetch
    console.log('[discover-leaders] Fetching headlines...');
    const headlines = await fetchAllHeadlines();
    if (headlines.length < 5) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'Too few headlines fetched', count: headlines.length }) };
    }
    console.log(`[discover-leaders] Got ${headlines.length} headlines`);

    // Step 2: Firebase থেকে existing leaders পড়া
    const existingLeaders = await firestoreGet('leaders');
    console.log(`[discover-leaders] Found ${existingLeaders.length} existing leaders`);

    // Step 3: AI analysis
    const aiResult = await discoverLeadersFromHeadlines(headlines, existingLeaders, today);
    if (!aiResult) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'AI analysis failed', headlines: headlines.length }) };
    }

    const log = { updated: [], added: [], errors: [] };

    // Step 4: Existing leaders update (active/isDeceased)
    for (const update of (aiResult.updates || [])) {
      try {
        await firestorePatch('leaders', update.id, {
          active:      update.active !== false,
          isDeceased:  update.isDeceased === true,
          lastDiscovered: today,
        });
        log.updated.push(update.id);
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        log.errors.push({ id: update.id, error: e.message });
      }
    }

    // Step 5: নতুন leaders Firebase-এ add
    for (const nl of (aiResult.new_leaders || [])) {
      try {
        // Duplicate check
        const exists = existingLeaders.find(l => l.id === nl.id || l.name === nl.name);
        if (exists) {
          log.errors.push({ id: nl.id, error: 'Already exists' });
          continue;
        }
        await firestoreSet('leaders', nl.id, {
          name:         nl.name,
          party:        nl.party || '',
          role:         nl.role || '',
          cat:          nl.cat || 'সুশীল সমাজ',
          icon:         nl.icon || '👤',
          active:       true,
          isDeceased:   false,
          viral:        false,
          approval:     50,
          promises:     [],
          statements:   [],
          controversies:[],
          virals:       [],
          lastDiscovered: today,
          addedByAI:    true,
        });
        log.added.push(nl.id);
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        log.errors.push({ id: nl.id, error: e.message });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success:    true,
        date:       today,
        headlines:  headlines.length,
        summary:    aiResult.summary || '',
        updated:    log.updated.length,
        added:      log.added.length,
        errors:     log.errors.length,
        log,
      }),
    };

  } catch (e) {
    console.error('[discover-leaders] Error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: e.message }),
    };
  }
};
