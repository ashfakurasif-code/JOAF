// netlify/functions/generate-timeline.js
// RSS news থেকে AI দিয়ে timeline events বানায়, Firebase-এ save করে

const GROQ_KEY    = process.env.GROQ_API_KEY;
const ADMIN_KEY   = process.env.ADMIN_SECRET_KEY;
const GROQ_MODELS = ['llama-3.3-70b-versatile', 'llama3-70b-8192', 'mixtral-8x7b-32768'];

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const BD_DATE_BN = () => {
  const d = new Date(Date.now() + 6 * 3600000);
  const months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

const https = require('https');
const http  = require('http');

const RSS_SOURCES = [
  { id: 'proto',    name: 'প্রথম আলো',  rss: 'https://www.prothomalo.com/feed' },
  { id: 'bd24',     name: 'BD News 24', rss: 'https://bdnews24.com/bangladesh/feed' },
  { id: 'daily',    name: 'Daily Star', rss: 'https://www.thedailystar.net/rss.xml' },
  { id: 'jugantor', name: 'যুগান্তর',  rss: 'https://www.jugantor.com/feed/rss.xml' },
];

function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 5) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; JOAF-Timeline/1.0)',
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

function parseRSSItems(xml, srcName) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && items.length < 15) {
    const block = match[1];
    const get = (tag) => {
      const m = block.match(new RegExp(`<${tag}(?:[^>]*)><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}(?:[^>]*)>([^<]*)<\\/${tag}>`));
      return m ? (m[1] || m[2] || '').trim() : '';
    };
    const title = get('title');
    if (!title) continue;
    items.push({ title, source: srcName });
  }
  return items;
}

async function fetchAllNews() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(async (src) => {
      const xml = await fetchUrl(src.rss);
      return parseRSSItems(xml, src.name);
    })
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value);
}

// ── Firestore REST ──
async function firestoreSet(collection, docId, data) {
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(i => {
      if (typeof i === 'string') return { stringValue: i };
      return { nullValue: null };
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
  if (!r.ok) throw new Error('Firestore PATCH failed: ' + r.status);
  return await r.json();
}

async function firestoreGet(collection) {
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/${collection}?key=${FB_CONFIG.apiKey}&pageSize=100`;
  const r = await fetch(url);
  if (!r.ok) return [];
  const data = await r.json();
  return (data.documents || []).map(doc => {
    const id = doc.name.split('/').pop();
    const fields = doc.fields || {};
    const obj = { id };
    for (const [k, v] of Object.entries(fields)) {
      if (v.stringValue !== undefined) obj[k] = v.stringValue;
    }
    return obj;
  });
}

// ── AI দিয়ে timeline events বানানো ──
async function generateTimelineEvents(newsItems, today, todayBN) {
  const newsText = newsItems.map(n => `[${n.source}] ${n.title}`).join('\n');

  const prompt = `তুমি বাংলাদেশের নিরপেক্ষ রাজনৈতিক বিশ্লেষক। আজকের তারিখ: ${todayBN} (${today})।

আজকের শীর্ষ সংবাদ:
${newsText}

এই news থেকে বাংলাদেশের রাজনীতি, অর্থনীতি ও সমাজের জন্য গুরুত্বপূর্ণ ৫-৮টি timeline event বানাও।

শুধু নিচের JSON array দাও, অন্য কিছু নয়, কোনো markdown নেই:
[
  {
    "id": "unique_event_id_en_date",
    "date": "${todayBN}",
    "isoDate": "${today}",
    "title": "ঘটনার শিরোনাম বাংলায়",
    "desc": "২-৩ বাক্যে বিস্তারিত বিবরণ বাংলায়",
    "type": "positive|negative|milestone|neutral",
    "tags": ["govt|economy|politics|social|crisis|july"]
  }
]

নিয়ম:
- id: lowercase English + date, যেমন: election_reform_2026_04_02
- type: positive=ভালো খবর, negative=খারাপ খবর, milestone=গুরুত্বপূর্ণ মাইলস্টোন, neutral=নিরপেক্ষ
- tags থেকে সবচেয়ে relevant ১-৩টা বেছে নাও
- শুধু সত্যিকারের news-ভিত্তিক ঘটনা, কল্পনা নয়
- সব বাংলায়, নিরপেক্ষ দৃষ্টিভঙ্গিতে`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 2000 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      let txt = data.choices?.[0]?.message?.content || '';
      txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const match = txt.match(/\[[\s\S]*\]/);
      if (match) {
        const events = JSON.parse(match[0]);
        if (Array.isArray(events) && events.length > 0) return events;
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

  const adminKey    = event.headers?.['x-admin-key'];
  const isScheduled = event.headers?.['x-netlify-event'] === 'schedule';
  if (!isScheduled && adminKey !== ADMIN_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  const today   = BD_TODAY();
  const todayBN = BD_DATE_BN();

  try {
    // Step 1: আজকের news fetch
    console.log('[generate-timeline] Fetching news...');
    const newsItems = await fetchAllNews();
    if (newsItems.length < 5) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'Too few news items', count: newsItems.length }) };
    }
    console.log(`[generate-timeline] Got ${newsItems.length} news items`);

    // Step 2: আজকের timeline আগে থেকে আছে কিনা check
    const existingTimeline = await firestoreGet('timeline');
    const todayEvents = existingTimeline.filter(e => e.isoDate === today);
    if (todayEvents.length >= 3) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          skipped: true,
          reason: `Already have ${todayEvents.length} events for today`,
          date: today,
        }),
      };
    }

    // Step 3: AI দিয়ে events generate
    const events = await generateTimelineEvents(newsItems, today, todayBN);
    if (!events) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'AI generation failed' }) };
    }

    // Step 4: Firebase-এ save
    const saved = [];
    const errors = [];

    for (const ev of events) {
      try {
        // Unique ID: event id + date
        const docId = `${ev.id}_${today}`.replace(/[^a-z0-9_]/gi, '_');
        await firestoreSet('timeline', docId, {
          date:      ev.date || todayBN,
          isoDate:   ev.isoDate || today,
          title:     ev.title || '',
          desc:      ev.desc || '',
          type:      ev.type || 'neutral',
          tags:      Array.isArray(ev.tags) ? ev.tags : [],
          aiGenerated: true,
          createdAt: today,
        });
        saved.push(docId);
        await new Promise(r => setTimeout(r, 200));
      } catch (e) {
        errors.push({ id: ev.id, error: e.message });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        date:    today,
        news:    newsItems.length,
        events:  saved.length,
        errors:  errors.length,
        saved,
        errors,
      }),
    };

  } catch (e) {
    console.error('[generate-timeline] Error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: e.message }),
    };
  }
};
