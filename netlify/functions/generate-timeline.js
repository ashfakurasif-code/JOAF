// netlify/functions/generate-timeline.js
// RSS news থেকে AI দিয়ে timeline events বানায়, Firebase-এ save করে

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ADMIN_KEY   = process.env.ADMIN_SECRET_KEY;
const GROQ_MODELS = [
  'llama-3.1-8b-instant',                       // 8B — fastest, lowest token cost, 1M TPD free
  'meta-llama/llama-4-scout-17b-16e-instruct',  // 17B MoE — separate quota
  'llama-3.3-70b-versatile',                    // 70B — last resort, 100k TPD
];

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
      timeout: 12000,
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
    .slice(0, 25);
}

// ── Firestore ──
async function firestoreSet(docId, data) {
  function toField(v) {
    if (typeof v === 'string')  return { stringValue: v };
    if (typeof v === 'number')  return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === 'boolean') return { booleanValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(i => ({ stringValue: String(i) })) } };
    return { nullValue: null };
  }
  const fields = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, toField(v)]));
  const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/timeline/${docId}?key=${FB_CONFIG.apiKey}`;
  const r = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
  if (!r.ok) throw new Error('Firestore PATCH failed: ' + r.status);
}

async function todayEventsExist(today) {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/${FB_CONFIG.projectId}/databases/(default)/documents/timeline?key=${FB_CONFIG.apiKey}&pageSize=50`;
    const r = await fetch(url);
    if (!r.ok) return false;
    const data = await r.json();
    const docs = data.documents || [];
    return docs.some(doc => {
      const f = doc.fields || {};
      return f.isoDate?.stringValue === today;
    });
  } catch (e) { return false; }
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
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: 'GROQ_API_KEY নেই' }) };
  }

  const today   = BD_TODAY();
  const todayBN = BD_DATE_BN();

  try {
    // RSS + duplicate check parallel
    const [headlines, alreadyExists] = await Promise.all([
      fetchHeadlines(),
      todayEventsExist(today),
    ]);

    if (headlines.length < 2) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'RSS fetch ব্যর্থ' }) };
    }

    if (alreadyExists) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: true, skipped: true, reason: 'আজকের timeline আগেই তৈরি হয়েছে' }) };
    }

    const headlineText = headlines.join('\n');
    const prompt = `বাংলাদেশের নিরপেক্ষ বিশ্লেষক। আজকের তারিখ: ${todayBN}।

আজকের শিরোনাম:
${headlineText}

এই news থেকে বাংলাদেশের জন্য গুরুত্বপূর্ণ ৪-৬টি timeline event বানাও।

শুধু JSON array দাও:
[{"id":"event_slug","date":"${todayBN}","isoDate":"${today}","title":"বাংলায় শিরোনাম","desc":"২-৩ বাক্য বিবরণ","type":"positive|negative|milestone|neutral","tags":["politics"]}]

tags থেকে বেছে নাও: govt, economy, politics, social, crisis, july
কেবল news-ভিত্তিক ঘটনা। সব বাংলায়।`;

    function parseEventsFromText(txt) {
      txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
      const arrMatch = txt.match(/\[[\s\S]*\]/);
      if (arrMatch) {
        try {
          const parsed = JSON.parse(arrMatch[0]);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch (e) {
          console.error('[timeline] JSON.parse failed:', e.message, '| raw:', txt.slice(0, 200));
        }
      }
      return null;
    }

    let events = null;

    // PRIMARY: Gemini
    if (GEMINI_KEY) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 700 },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          const txt = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          events = parseEventsFromText(txt);
          if (events) console.log('[timeline] Gemini ✓');
        } else {
          console.log('[timeline] Gemini HTTP ' + res.status);
        }
      } catch (e) { console.log('[timeline] Gemini error:', e.message); }
    }

    // FALLBACK: Groq
    if (!events && GROQ_KEY) {
      for (const model of GROQ_MODELS) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 700 }),
          });
          if (!res.ok) { console.log(`[timeline] Groq ${model} HTTP ${res.status}`); continue; }
          const data = await res.json();
          const txt = data.choices?.[0]?.message?.content || '';
          events = parseEventsFromText(txt);
          if (events) { console.log(`[timeline] Groq ${model} ✓`); break; }
        } catch (e) { console.log(`[timeline] Groq error: ${e.message}`); continue; }
      }
    }

    if (!events) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: 'সব AI fail হয়েছে — Netlify log দেখুন' }) };
    }

    const saved = [];
    for (const ev of events) {
      try {
        const docId = `${(ev.id || 'event').replace(/[^a-z0-9_]/gi, '_')}_${today}`;
        await firestoreSet(docId, {
          date:        ev.date || todayBN,
          isoDate:     ev.isoDate || today,
          title:       ev.title || '',
          desc:        ev.desc || '',
          type:        ev.type || 'neutral',
          tags:        Array.isArray(ev.tags) ? ev.tags : [],
          aiGenerated: true,
          createdAt:   today,
        });
        saved.push(docId);
        await new Promise(r => setTimeout(r, 150));
      } catch (e) { console.log(`[timeline] Save error: ${e.message}`); }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, date: today, headlines: headlines.length, events: saved.length, saved }),
    };

  } catch (e) {
    console.error('[timeline] Fatal:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: e.message }) };
  }
};
