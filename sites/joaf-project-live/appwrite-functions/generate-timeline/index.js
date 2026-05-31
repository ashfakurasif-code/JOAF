// Appwrite Function: generate-timeline
// Trigger: CRON (e.g. "0 8 * * *") OR HTTP POST with x-admin-key
// RSS → AI → Appwrite timeline collection

import { awList, awUpsert, qEqual, qLimit } from './aw-utils.js';
import { fetchBDHeadlines } from './bd-rss-utils.js';

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ADMIN_KEY  = process.env.ADMIN_SECRET_KEY;
const GROQ_MODELS = ['llama-3.1-8b-instant', 'meta-llama/llama-4-scout-17b-16e-instruct', 'llama-3.3-70b-versatile'];

const BD_TODAY  = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);
const BD_DATE_BN = () => {
  const d = new Date(Date.now() + 6 * 3600000);
  const months = ['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'];
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

async function todayEventsExist(today) {
  try { const docs = await awList('timeline', [qEqual('isoDate', today), qLimit(1)], 1); return docs.length > 0; }
  catch { return false; }
}

function parseEvents(txt) {
  txt = txt.replace(/\`\`\`json\s*/gi, '').replace(/\`\`\`\s*/g, '').trim();
  const m = txt.match(/\[[\s\S]*\]/);
  if (m) { try { const p = JSON.parse(m[0]); if (Array.isArray(p) && p.length > 0) return p; } catch { return null; } }
  return null;
}

export default async ({ req, res, log, error }) => {
  const isHttp = req.method === 'POST' || req.method === 'GET';
  if (isHttp) {
    const adminKey = req.headers?.['x-admin-key'];
    if (adminKey && adminKey !== ADMIN_KEY) return res.json({ error: 'Unauthorized' }, 401);
  }

  if (!GROQ_KEY && !GEMINI_KEY) return res.json({ success: false, error: 'No AI key configured' }, 500);

  const today   = BD_TODAY();
  const todayBN = BD_DATE_BN();
  let forceRegen = false;
  if (req.method === 'POST') {
    try { const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; forceRegen = b?.force === true; } catch {}
  }

  try {
    const [rssResult, alreadyExists] = await Promise.all([
      fetchBDHeadlines({ maxPerSource: 15, totalLimit: 60 }),
      todayEventsExist(today),
    ]);

    const { items: headlineItems, headlines, filteredCount, sourceCounts } = rssResult;
    if (headlines.length < 2) return res.json({ success: false, error: 'RSS fetch ব্যর্থ', sourceCounts });
    if (alreadyExists && !forceRegen) return res.json({ success: true, skipped: true, reason: 'আজকের timeline আগেই তৈরি হয়েছে', headlines: headlines.length, filteredOut: filteredCount });

    const prompt = `বাংলাদেশের নিরপেক্ষ বিশ্লেষক। আজকের তারিখ: ${todayBN}।\nআজকের শিরোনাম:\n${headlines.join('\n')}\nএই news থেকে বাংলাদেশের জন্য গুরুত্বপূর্ণ ৪-৬টি timeline event বানাও।\nশুধু JSON array দাও:\n[{"id":"event_slug","date":"${todayBN}","isoDate":"${today}","title":"বাংলায় শিরোনাম","desc":"২-৩ বাক্য বিবরণ","type":"positive|negative|milestone|neutral","tags":["politics"]}]\ntags: govt, economy, politics, social, crisis, july\nকেবল news-ভিত্তিক ঘটনা। সব বাংলায়।`;

    let events = null;

    // PRIMARY: Gemini
    if (GEMINI_KEY) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 700 } }),
        });
        if (res.ok) { const data = await res.json(); events = parseEvents(data.candidates?.[0]?.content?.parts?.[0]?.text || ''); if (events) log('Gemini ✓'); }
      } catch (e) { log('Gemini error: ' + e.message); }
    }

    // FALLBACK: Groq
    if (!events && GROQ_KEY) {
      for (const model of GROQ_MODELS) {
        try {
          const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
            body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.3, max_tokens: 700 }),
          });
          if (!groqRes.ok) continue;
          const data = await groqRes.json();
          events = parseEvents(data.choices?.[0]?.message?.content || '');
          if (events) { log(`Groq ${model} ✓`); break; }
        } catch { continue; }
      }
    }

    if (!events) return res.json({ success: false, error: 'সব AI fail হয়েছে' });

    const saved = [];
    for (const ev of events) {
      try {
        const docId = `${(ev.id || 'event').replace(/[^a-z0-9_]/gi, '_')}_${today}`;
        await awUpsert('timeline', docId, { date: ev.date || todayBN, isoDate: ev.isoDate || today, title: ev.title || '', desc: ev.desc || '', type: ev.type || 'neutral', tags: Array.isArray(ev.tags) ? ev.tags : [], aiGenerated: true, createdAt: today });
        saved.push(docId);
        await new Promise(r => setTimeout(r, 150));
      } catch (e) { log('Save error: ' + e.message); }
    }

    return res.json({ success: true, date: today, headlines: headlines.length, filteredOut: filteredCount, events: saved.length, saved, headlineItems, sourceCounts });
  } catch (e) {
    error('generate-timeline fatal: ' + e.message);
    return res.json({ success: false, error: e.message }, 500);
  }
};
