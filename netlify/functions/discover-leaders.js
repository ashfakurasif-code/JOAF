// netlify/functions/discover-leaders.js
// RSS news পড়ে AI দিয়ে leaders auto-discover করে Firebase update করে
// Primary: Google Gemini (gemini-2.0-flash) — free: 1500 req/day, unlimited tokens
// Fallback: Groq (active models only — decommissioned গুলো বাদ)

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY; // aistudio.google.com থেকে নাও — পুরোপুরি free
const ADMIN_KEY  = process.env.ADMIN_SECRET_KEY;

// Groq: শুধু active models (mixtral-8x7b-32768, llama3-70b-8192 decommissioned)
const GROQ_MODELS = [
  'llama-3.1-8b-instant',      // 1M TPD free
  'llama-3.3-70b-versatile',   // 100k TPD, last resort
];

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);

const https = require('https');
const http  = require('http');

// ── RSS fetch ──
const RSS_SOURCES = [
  { rss: 'https://www.prothomalo.com/feed' },
  { rss: 'https://bdnews24.com/bangladesh/feed' },
  { rss: 'https://www.thedailystar.net/rss.xml' },
];

function fetchUrl(url, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 3) return reject(new Error('Too many redirects'));
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/xml, text/xml, */*' },
      timeout: 4000,
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

function parseTitles(xml) {
  const titles = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match;
  while ((match = itemRegex.exec(xml)) !== null && titles.length < 12) {
    const block = match[1];
    const tm = block.match(/<title(?:[^>]*)><!\[CDATA\[([\s\S]*?)\]\]><\/title>|<title(?:[^>]*)>([^<]*)<\/title>/);
    const title = tm ? (tm[1] || tm[2] || '').trim() : '';
    if (title && title.length > 5) titles.push(title);
  }
  return titles;
}

async function fetchHeadlines() {
  const results = await Promise.allSettled(
    RSS_SOURCES.map(s => fetchUrl(s.rss).then(xml => parseTitles(xml)))
  );
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .slice(0, 30);
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
  } catch (e) { return []; }
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

async function firestorePatchFields(docId, updates) {
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(updates).map(([k, v]) => [k, toField(v)]));
  const mask = Object.keys(updates).map(k => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join('&');
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/leaders/${docId}?key=${FB_CONFIG.apiKey}&${mask}`;
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

// ── Shared prompt builder ──
function buildDiscoverPrompt(headlines, existingLeaders, today) {
  const existingStr = existingLeaders.length > 0
    ? existingLeaders.slice(0, 20).map(l => l.id).join(',')
    : 'none';
  const shortHeadlines = headlines.slice(0, 15).join('\n');
  return `BD political analyst. Date: ${today}
Headlines:
${shortHeadlines}

Tracked IDs: ${existingStr}

Find: (1) important BD persons in 2+ headlines NOT in tracked IDs, (2) tracked persons confirmed dead/inactive.
Reply JSON only, no extra text:
{"new":[{"id":"slug","name":"বাংলা নাম","party":"দল","role":"পদ","cat":"সরকার","icon":"👤"}],"inactive":[{"id":"id","isDeceased":false}]}
Rules: new[]=2+ headlines only. inactive[]=confirmed only. Empty=[]`;
}

function parseDiscoverJson(txt) {
  txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const objMatch = txt.match(/\{[\s\S]*\}/);
  if (objMatch) {
    const parsed = JSON.parse(objMatch[0]);
    return {
      newLeaders: Array.isArray(parsed.new) ? parsed.new : [],
      inactive:   Array.isArray(parsed.inactive) ? parsed.inactive : [],
    };
  }
  return null;
}

// ── PRIMARY: Google Gemini ──
async function analyzeWithGemini(headlines, existingLeaders, today) {
  if (!GEMINI_KEY) return null;
  try {
    const prompt = buildDiscoverPrompt(headlines, existingLeaders, today);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 500 },
      }),
    });
    if (!res.ok) {
      console.warn('[discover/gemini] HTTP ' + res.status);
      return null;
    }
    const data = await res.json();
    const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = parseDiscoverJson(txt);
    if (parsed) {
      console.log('[discover] Gemini ✓');
      return parsed;
    }
    return null;
  } catch (e) {
    console.warn('[discover/gemini] error:', e.message);
    return null;
  }
}

// ── FALLBACK: Groq ──
async function analyzeWithGroq(headlines, existingLeaders, today) {
  if (!GROQ_KEY) return null;
  const prompt = buildDiscoverPrompt(headlines, existingLeaders, today);
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 500,
        }),
      });
      if (!res.ok) {
        const errBody = await res.text();
        console.log(`[discover] Groq ${model} HTTP ${res.status}: ${errBody.slice(0, 150)}`);
        continue;
      }
      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content || '';
      const parsed = parseDiscoverJson(txt);
      if (parsed) {
        console.log(`[discover] Groq ${model} ✓`);
        return parsed;
      }
    } catch (e) {
      console.log(`[discover] Groq error: ${e.message}`);
      continue;
    }
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

  if (!GEMINI_KEY && !GROQ_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'GEMINI_API_KEY বা GROQ_API_KEY — কমপক্ষে একটা দরকার' }) };
  }

  const today = BD_TODAY();

  try {
    const [headlines, existingLeaders] = await Promise.all([
      fetchHeadlines(),
      firestoreGetAll(),
    ]);

    console.log(`[discover] headlines:${headlines.length} existing:${existingLeaders.length}`);

    if (headlines.length < 2) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: `RSS fetch ব্যর্থ — মাত্র ${headlines.length}টি headline` }) };
    }

    // Gemini first, then Groq
    let aiResult = await analyzeWithGemini(headlines, existingLeaders, today);
    if (!aiResult) {
      console.log('[discover] Gemini failed, trying Groq...');
      aiResult = await analyzeWithGroq(headlines, existingLeaders, today);
    }

    if (!aiResult) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: false,
          error: 'সব AI fail হয়েছে। Netlify function log দেখুন।',
          headlines: headlines.length,
          gemini_key_set: !!GEMINI_KEY,
          groq_key_set: !!GROQ_KEY,
        }),
      };
    }

    const log = { added: [], updated: [], errors: [] };

    const existingIds = existingLeaders.map(l => l.id);
    for (const nl of aiResult.newLeaders) {
      if (!nl.id || !nl.name) continue;
      if (existingIds.includes(nl.id)) continue;
      try {
        await firestoreSet(nl.id, {
          name: nl.name, party: nl.party || '', role: nl.role || '',
          cat: nl.cat || 'সুশীল সমাজ', icon: nl.icon || '👤',
          active: true, isDeceased: false, viral: false, approval: 50,
          promises: [], statements: [], controversies: [], virals: [],
          lastDiscovered: today, addedByAI: true,
        });
        log.added.push(nl.name);
      } catch (e) { log.errors.push(e.message); }
    }

    for (const u of aiResult.inactive) {
      if (!u.id) continue;
      try {
        await firestorePatchFields(u.id, {
          active: false,
          isDeceased: u.isDeceased === true,
          lastDiscovered: today,
        });
        log.updated.push(u.id);
      } catch (e) { log.errors.push(e.message); }
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
        summary:   `${log.added.length} নতুন যোগ, ${log.updated.length} আপডেট`,
        log,
      }),
    };

  } catch (e) {
    console.error('[discover] Fatal:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: e.message }) };
  }
};
