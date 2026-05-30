// Appwrite Function: discover-leaders
// Trigger: CRON (e.g. "0 6 * * *") OR HTTP POST with x-admin-key
// RSS → AI → Appwrite leaders collection

import { awListAll, awUpsert, awUpdate } from './aw-utils.js';
import { fetchBDHeadlines } from './bd-rss-utils.js';

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ADMIN_KEY  = process.env.ADMIN_SECRET_KEY;

const GROQ_MODELS = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
const VALID_CATS  = ['সরকার', 'বিরোধী দল', 'যুব রাজনীতি', 'সুশীল সমাজ', 'আওয়ামী লীগ', 'ব্যবসায়ী'];

/**
 * Deduplicate headlines by trigram similarity.
 * Removes headlines where >65% of 3-char ngrams overlap with an already-seen headline.
 * Prevents the same story from multiple RSS sources inflating AI confidence scores.
 */
function dedupeHeadlines(headlines) {
  function trigrams(str) {
    const s = str.toLowerCase().replace(/\s+/g, ' ').trim();
    const set = new Set();
    for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3));
    return set;
  }
  function jaccardSim(a, b) {
    let inter = 0;
    for (const t of a) if (b.has(t)) inter++;
    return inter / (a.size + b.size - inter);
  }

  const seen = [];
  return headlines.filter(h => {
    const tg = trigrams(h);
    if (tg.size < 3) return true; // too short to meaningfully compare
    const isDupe = seen.some(s => jaccardSim(tg, s) > 0.65);
    if (!isDupe) seen.push(tg);
    return !isDupe;
  });
}

const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);

async function awGetAll() {
  try { const docs = await awListAll('leaders'); return docs.map(d => ({ id: d.id, ...d.data })); }
  catch { return []; }
}

function buildPrompt(headlines, existingLeaders, today) {
  const deduped = dedupeHeadlines(headlines);
  const existingStr = existingLeaders.length > 0 ? existingLeaders.slice(0, 20).map(l => l.id).join(',') : 'none';
  return `You are a Bangladesh political analyst. Today: ${today}.
Analyze these headlines and identify BANGLADESH-RELEVANT trending people ONLY.
Headlines:\n${deduped.slice(0, 15).join('\n')}
Already tracked (do NOT include): ${existingStr}
RULES: Only real fully-named individuals, 2+ headlines or clearly significant, cat must be one of: ${VALID_CATS.join(', ')}, confidence >= 0.7.
Reply ONLY raw JSON: {"new":[{"id":"slug","name":"Full Name","party":"party","role":"role","cat":"সরকার","icon":"👤","trending_reason":"reason","confidence":0.9}],"inactive":[{"id":"existing-id","isDeceased":false}]}
If none: {"new":[],"inactive":[]}`;
}

function parseJson(txt) {
  txt = txt.replace(/\`\`\`json\s*/gi, '').replace(/\`\`\`\s*/g, '').trim();
  const m = txt.match(/\{[\s\S]*\}/);
  if (m) { try { const p = JSON.parse(m[0]); return { newLeaders: Array.isArray(p.new) ? p.new : [], inactive: Array.isArray(p.inactive) ? p.inactive : [] }; } catch { return null; } }
  return null;
}

function isValidEntry(entry) {
  const name = (entry.name || '').trim();
  if (!name || name.length < 4) return false;
  const isBangla = /[\u0980-\u09FF]/.test(name);
  if (!isBangla && name.trim().split(/\s+/).length < 2) return false;
  if (!VALID_CATS.includes((entry.cat || '').trim())) return false;
  if (typeof entry.confidence === 'number' && entry.confidence < 0.7) return false;
  return true;
}

async function callGemini(headlines, existingLeaders, today) {
  if (!GEMINI_KEY) return null;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: buildPrompt(headlines, existingLeaders, today) }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 500 } }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return parseJson(data.candidates?.[0]?.content?.parts?.[0]?.text || '');
  } catch { return null; }
}

async function callGroq(headlines, existingLeaders, today) {
  if (!GROQ_KEY) return null;
  const prompt = buildPrompt(headlines, existingLeaders, today);
  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.1, max_tokens: 500 }),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const parsed = parseJson(data.choices?.[0]?.message?.content || '');
      if (parsed) return parsed;
    } catch { continue; }
  }
  return null;
}

export default async ({ req, res, log, error }) => {
  // Allow CRON (no auth header) or admin HTTP POST
  const isHttp = req.method === 'POST' || req.method === 'GET';
  if (isHttp) {
    const adminKey = req.headers?.['x-admin-key'];
    if (adminKey && adminKey !== ADMIN_KEY) return res.json({ error: 'Unauthorized' }, 401);
  }

  if (!GEMINI_KEY && !GROQ_KEY) return res.json({ success: false, error: 'No AI key configured' }, 500);

  const today = BD_TODAY();
  try {
    const [rssResult, existingLeaders] = await Promise.all([
      fetchBDHeadlines({ maxPerSource: 15, totalLimit: 60 }),
      awGetAll(),
    ]);

    const { items: headlineItems, headlines, filteredCount, sourceCounts } = rssResult;
    log(`discover-leaders: headlines=${headlines.length} existing=${existingLeaders.length}`);

    if (headlines.length < 2) return res.json({ success: false, error: `RSS fetch ব্যর্থ — ${headlines.length}টি headline`, sourceCounts });

    let aiResult = await callGemini(headlines, existingLeaders, today);
    if (!aiResult) { log('Gemini failed, trying Groq'); aiResult = await callGroq(headlines, existingLeaders, today); }
    if (!aiResult) return res.json({ success: false, error: 'সব AI fail হয়েছে' });

    const logResult = { added: [], updated: [], skipped: [], validation_rejects: [], errors: [] };
    const existingIds = existingLeaders.map(l => l.id);

    for (const nl of aiResult.newLeaders) {
      if (!nl.id || !nl.name) { logResult.validation_rejects.push('(no id/name)'); continue; }
      if (existingIds.includes(nl.id)) { logResult.skipped.push(nl.name); continue; }
      if (!isValidEntry(nl)) { logResult.validation_rejects.push(nl.name); continue; }
      try {
        await awUpsert('leaders', nl.id, { name: nl.name, party: nl.party || '', role: nl.role || '', cat: nl.cat, icon: nl.icon || '👤', active: true, isDeceased: false, viral: false, approval: 50, promises: [], statements: [], controversies: [], virals: [], lastDiscovered: today, addedByAI: true });
        logResult.added.push(nl.name);
      } catch (e) { logResult.errors.push(e.message); }
    }

    for (const u of aiResult.inactive) {
      if (!u.id) continue;
      try { await awUpdate('leaders', u.id, { active: false, isDeceased: u.isDeceased === true, lastDiscovered: today }); logResult.updated.push(u.id); }
      catch (e) { logResult.errors.push(e.message); }
    }

    return res.json({ success: true, date: today, headlines: headlines.length, filteredOut: filteredCount, existing: existingLeaders.length, added: logResult.added.length, updated: logResult.updated.length, skipped: logResult.skipped.length, validation_rejects: logResult.validation_rejects.length, log: logResult, headlineItems, sourceCounts });
  } catch (e) {
    error('discover-leaders fatal: ' + e.message);
    return res.json({ success: false, error: e.message }, 500);
  }
};
