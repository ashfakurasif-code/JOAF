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
async function firestoreGetAll() {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/leaders?key=${FB_CONFIG.apiKey}&pageSize=200`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const data = await r.json();
    return (data.documents || []).map(doc => {
      const id = doc.name.split('/').pop();
      const fields = doc.fields || {};
      const obj = { id };
      for (const [k, v] of Object.entries(fields)) {
        if (v.stringValue !== undefined) obj[k] = v.stringValue;
        else if (v.booleanValue !== undefined) obj[k] = v.booleanValue;
      }
      return obj;
    });
  } catch (e) {
    return [];
  }
}

async function firestoreSet(docId, data) {
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: [] } };
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toField(v)]));
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/leaders/${docId}?key=${FB_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error('Firestore PATCH failed: ' + r.status);
}

async function firestorePatchFields(docId, fieldUpdates) {
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(fieldUpdates).map(([k, v]) => [k, toField(v)]));
  const mask = Object.keys(fieldUpdates).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/leaders/${docId}?key=${FB_CONFIG.apiKey}&${mask}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error('Firestore partial PATCH failed: ' + r.status);
}

// ── Groq helper ──
async function groqCall(prompt, maxTokens = 1500) {
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: maxTokens }),
      });
      if (!res.ok) {
        const errTxt = await res.text();
        console.log(`[discover] Groq ${model} HTTP ${res.status}: ${errTxt.slice(0, 100)}`);
        continue;
      }
      const data = await res.json();
      let txt = data.choices?.[0]?.message?.content || '';
      txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      return txt;
    } catch (e) {
      console.log(`[discover] Groq ${model} error: ${e.message}`);
      continue;
    }
  }
  return null;
}

// ── Step A: নতুন নেতা খোঁজা ──
async function findNewLeaders(headlines, existingIds, today) {
  const headlineText = headlines.slice(0, 50).join('\n');
  const existingStr = existingIds.length > 0
    ? `ইতিমধ্যে tracked id-গুলো: ${existingIds.slice(0, 30).join(', ')}`
    : 'এখনো কোনো নেতা tracked নেই।';

  const prompt = `তুমি বাংলাদেশের রাজনৈতিক বিশ্লেষক। আজকের তারিখ: ${today}।

আজকের শীর্ষ সংবাদ শিরোনাম:
${headlineText}

${existingStr}

এই headlines-এ কোন কোন বাংলাদেশি রাজনৈতিক নেতা বা গুরুত্বপূর্ণ ব্যক্তি আছেন যারা এখনো tracked নন?

শুধু JSON array দাও — আর কিছু না, কোনো markdown নয়:
[{"id":"english_id","name":"বাংলায় নাম","party":"দল","role":"পদবী","cat":"সরকার","icon":"👤"}]

নিয়ম: id lowercase English underscore। cat: সরকার/বিরোধী দল/যুব রাজনীতি/সুশীল সমাজ/ব্যবসায়ী/আওয়ামী লীগ। কেউ না থাকলে []`;

  const txt = await groqCall(prompt, 1200);
  if (!txt) return null;

  try {
    const arrMatch = txt.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch (e) {
    return [];
  }
}

// ── Step B: inactive/deceased ──
async function findInactiveLeaders(headlines, existingLeaders, today) {
  if (existingLeaders.length === 0) return [];

  const headlineText = headlines.slice(0, 40).join('\n');
  const leaderList = existingLeaders.slice(0, 25).map(l => `${l.id}: ${l.name}`).join('\n');

  const prompt = `তুমি বাংলাদেশের রাজনৈতিক বিশ্লেষক। আজকের তারিখ: ${today}।

আজকের শীর্ষ সংবাদ:
${headlineText}

Tracked নেতারা:
${leaderList}

এদের মধ্যে কেউ কি মারা গেছেন বা সম্পূর্ণ inactive হয়েছেন?

শুধু JSON array দাও — আর কিছু না:
[{"id":"leader_id","active":false,"isDeceased":false}]

কেউ না থাকলে: []
শুধু ১০০% নিশ্চিত হলে include করো।`;

  const txt = await groqCall(prompt, 400);
  if (!txt) return [];

  try {
    const arrMatch = txt.match(/\[[\s\S]*\]/);
    if (arrMatch) {
      const parsed = JSON.parse(arrMatch[0]);
      if (Array.isArray(parsed)) return parsed;
    }
    return [];
  } catch (e) {
    return [];
  }
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

  if (!GROQ_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'GROQ_API_KEY environment variable নেই — Netlify Dashboard > Site configuration > Environment variables এ set করুন' }) };
  }

  const today = BD_TODAY();
  const log = { added: [], updated: [], errors: [] };

  try {
    // Headlines fetch
    console.log('[discover] Fetching RSS headlines...');
    const headlines = await fetchAllHeadlines();
    console.log(`[discover] Got ${headlines.length} headlines`);

    if (headlines.length < 3) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: `RSS fetch failed — মাত্র ${headlines.length}টি headline পাওয়া গেছে` }) };
    }

    // Existing leaders
    const existingLeaders = await firestoreGetAll();
    const existingIds = existingLeaders.map(l => l.id);
    console.log(`[discover] ${existingLeaders.length} existing leaders in Firebase`);

    // Find new leaders
    const newLeaders = await findNewLeaders(headlines, existingIds, today);
    if (newLeaders === null) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'Groq API সব model-এ fail করেছে। GROQ_API_KEY সঠিক আছে কিনা Netlify environment variables-এ দেখুন।',
          headlines: headlines.length,
        }),
      };
    }

    console.log(`[discover] AI found ${newLeaders.length} new leaders`);

    // Add new leaders
    for (const nl of newLeaders) {
      try {
        if (!nl.id || !nl.name) continue;
        if (existingIds.includes(nl.id)) continue;
        if (existingLeaders.find(l => l.name === nl.name)) continue;

        await firestoreSet(nl.id, {
          name:           nl.name,
          party:          nl.party || '',
          role:           nl.role || '',
          cat:            nl.cat || 'সুশীল সমাজ',
          icon:           nl.icon || '👤',
          active:         true,
          isDeceased:     false,
          viral:          false,
          approval:       50,
          promises:       [],
          statements:     [],
          controversies:  [],
          virals:         [],
          lastDiscovered: today,
          addedByAI:      true,
        });
        log.added.push(`${nl.id} (${nl.name})`);
        await new Promise(r => setTimeout(r, 300));
      } catch (e) {
        log.errors.push({ id: nl.id, error: e.message });
      }
    }

    // Find inactive/deceased
    if (existingLeaders.length > 0) {
      const inactiveList = await findInactiveLeaders(headlines, existingLeaders, today);
      for (const update of inactiveList) {
        try {
          await firestorePatchFields(update.id, {
            active:         update.active !== false,
            isDeceased:     update.isDeceased === true,
            lastDiscovered: today,
          });
          log.updated.push(update.id);
          await new Promise(r => setTimeout(r, 200));
        } catch (e) {
          log.errors.push({ id: update.id, error: e.message });
        }
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success:   true,
        date:      today,
        headlines: headlines.length,
        existing:  existingLeaders.length,
        added:     log.added.length,
        updated:   log.updated.length,
        errors:    log.errors.length,
        summary:   `${log.added.length} নতুন যোগ, ${log.updated.length} আপডেট`,
        log,
      }),
    };

  } catch (e) {
    console.error('[discover] Fatal error:', e);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: e.message }),
    };
  }
};
