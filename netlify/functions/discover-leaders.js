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

// ── Valid leader categories — must match leader-tracker.html ──
const VALID_CATS = ['সরকার', 'বিরোধী দল', 'যুব রাজনীতি', 'সুশীল সমাজ', 'আওয়ামী লীগ', 'ব্যবসায়ী'];

const FB_CONFIG = {
  apiKey:    'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  projectId: 'joaf-app-45753',
};

const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);

const { fetchBDHeadlines } = require('./bd-rss-utils');

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
  const catsStr = VALID_CATS.join(', ');
  return `You are a Bangladesh political analyst. Today: ${today}.

Analyze these news headlines and identify BANGLADESH-RELEVANT trending people ONLY.

Headlines:
${shortHeadlines}

Already tracked IDs (do NOT include these): ${existingStr}

STRICT RULES:
1. Only include real, fully-named individuals who are directly relevant to Bangladesh.
2. IGNORE any story about India, Iran, Pakistan, Sri Lanka, cricket outside Bangladesh, or any non-Bangladesh topic — unless it directly involves a Bangladeshi person by name.
3. Only include a person if they appear in 2+ headlines OR are clearly significant for Bangladesh today.
4. NEVER include generic descriptions like "A historian", "a minister", "a journalist", "an activist" — only real full names (e.g., "ড. মুহাম্মদ ইউনূস", "Mirza Fakhrul Islam Alamgir").
5. NEVER include single-word names or nicknames (e.g., "Fizz", "Babu", "Zia") unless it is an unambiguous top-level Bangladesh leader.
6. cat MUST be exactly one of: ${catsStr}
7. confidence must be 0.0–1.0; only include entries with confidence >= 0.7.
8. Do NOT repeat anyone already in tracked IDs.

Reply with ONLY a raw JSON object — no markdown fences, no explanation, no extra text:
{"new":[{"id":"url-safe-slug","name":"Full Name","party":"party or org","role":"role/position","cat":"সরকার","icon":"👤","trending_reason":"why trending in BD today","confidence":0.9}],"inactive":[{"id":"existing-id","isDeceased":false}]}

If no valid entries found: {"new":[],"inactive":[]}`;
}

function parseDiscoverJson(txt) {
  txt = txt.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const objMatch = txt.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      const parsed = JSON.parse(objMatch[0]);
      return {
        newLeaders: Array.isArray(parsed.new) ? parsed.new : [],
        inactive:   Array.isArray(parsed.inactive) ? parsed.inactive : [],
      };
    } catch (e) {
      console.error('[discover] JSON.parse failed:', e.message, '| raw:', txt.slice(0, 200));
      return null;
    }
  }
  return null;
}

// ── Validation: reject garbage/non-person entries before Firestore write ──

// Generic article+role labels that are NOT real person names
const GENERIC_LABELS = [
  'a historian', 'a minister', 'a politician', 'a leader', 'a lawmaker',
  'a journalist', 'a professor', 'a teacher', 'a doctor', 'a scientist',
  'an activist', 'a businessman', 'a general', 'a colonel', 'a soldier',
  'a student', 'a worker', 'an expert', 'a spokesperson', 'a diplomat',
  'an official', 'a bureaucrat', 'a judge', 'a banker', 'a researcher',
  'a governor', 'a mayor', 'a senator', 'a chancellor', 'a premier',
];
const GENERIC_LABEL_PREFIXES = GENERIC_LABELS.map(l => l + ' ');
const ARTICLE_NOUN_RE = /^an?\s+\w+$/i;
const BANGLA_RE       = /[\u0980-\u09FF]/;

function isValidLeaderEntry(entry) {
  const name = (entry.name || '').trim();

  if (!name) return { valid: false, reason: 'missing name' };

  const lowerName = name.toLowerCase();

  // Reject exact generic label matches or names that start with one
  for (let i = 0; i < GENERIC_LABELS.length; i++) {
    if (lowerName === GENERIC_LABELS[i] || lowerName.startsWith(GENERIC_LABEL_PREFIXES[i])) {
      return { valid: false, reason: `generic label: "${name}"` };
    }
  }

  // Reject any name matching "a/an <single-noun>" pattern
  if (ARTICLE_NOUN_RE.test(name)) {
    return { valid: false, reason: `article+noun pattern: "${name}"` };
  }

  // Reject single-word English names (Bangla script words are often single-word and valid)
  const isBangla = BANGLA_RE.test(name);
  if (!isBangla) {
    const words = name.trim().split(/\s+/);
    if (words.length < 2) {
      return { valid: false, reason: `single-word name: "${name}"` };
    }
  }

  // Reject very short names
  if (name.length < 4) {
    return { valid: false, reason: `name too short: "${name}"` };
  }

  // Reject missing or invalid cat
  const cat = (entry.cat || '').trim();
  if (!cat || !VALID_CATS.includes(cat)) {
    return { valid: false, reason: `invalid or missing cat: "${cat || '(empty)'}"` };
  }

  // Reject low-confidence entries (if confidence field present)
  if (typeof entry.confidence === 'number' && entry.confidence < 0.7) {
    return { valid: false, reason: `low confidence: ${entry.confidence}` };
  }

  return { valid: true };
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
    const [rssResult, existingLeaders] = await Promise.all([
      fetchBDHeadlines({ maxPerSource: 15, totalLimit: 60 }),
      firestoreGetAll(),
    ]);

    const { items: headlineItems, headlines, filteredCount, sourceCounts } = rssResult;

    console.log(`[discover] headlines:${headlines.length} filtered_out:${filteredCount} existing:${existingLeaders.length}`);

    if (headlines.length < 2) {
      return { statusCode: 200, headers, body: JSON.stringify({ success: false, error: `RSS fetch ব্যর্থ — মাত্র ${headlines.length}টি headline`, sourceCounts }) };
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

    const log = { added: [], updated: [], skipped: [], errors: [], validation_rejects: [] };

    const existingIds = existingLeaders.map(l => l.id);
    for (const nl of aiResult.newLeaders) {
      if (!nl.id || !nl.name) {
        log.validation_rejects.push(`(no id/name)`);
        continue;
      }
      if (existingIds.includes(nl.id)) {
        log.skipped.push(nl.name);
        continue;
      }
      const check = isValidLeaderEntry(nl);
      if (!check.valid) {
        log.validation_rejects.push(`${nl.name}: ${check.reason}`);
        console.warn(`[discover] rejected "${nl.name}": ${check.reason}`);
        continue;
      }
      try {
        await firestoreSet(nl.id, {
          name: nl.name, party: nl.party || '', role: nl.role || '',
          cat: nl.cat, icon: nl.icon || '👤',
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
        success:            true,
        date:               today,
        headlines:          headlines.length,
        filteredOut:        filteredCount,
        existing:           existingLeaders.length,
        candidates:         aiResult.newLeaders.length,
        added:              log.added.length,
        updated:            log.updated.length,
        skipped:            log.skipped.length,
        validation_rejects: log.validation_rejects.length,
        summary:            `${log.added.length} নতুন যোগ, ${log.updated.length} আপডেট, ${log.validation_rejects.length} rejected`,
        log,
        headlineItems,
        sourceCounts,
      }),
    };

  } catch (e) {
    console.error('[discover] Fatal:', e.message);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: e.message }) };
  }
};
