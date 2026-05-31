// Appwrite Function: update-leaders
// Trigger: CRON (e.g. "0 10 * * *") OR HTTP POST with x-admin-key
// AI-refreshes leader profiles in Appwrite
// NOTE: Calls groq-proxy via its Appwrite function URL (set GROQ_PROXY_URL env var)

import { awList, awUpdate } from './aw-utils.js';

const GROQ_KEY       = process.env.GROQ_API_KEY;
const GEMINI_KEY     = process.env.GEMINI_API_KEY;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const ADMIN_KEY      = process.env.ADMIN_SECRET_KEY;
// URL of the deployed groq-proxy Appwrite function (e.g. the deployed Appwrite function execution URL)
// Alternatively set GROQ_PROXY_URL to the function's HTTP endpoint if you expose it via a custom domain
const GROQ_PROXY_URL = process.env.GROQ_PROXY_URL || null;

const GROQ_MODELS    = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'];
const FIELDS_TO_UPDATE = ['approval', 'promises', 'statements'];

const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);

function buildPrompt(leader) {
  return `You are a Bangladesh political analyst. Given this leader:
Name: ${leader.name}
Role: ${leader.role}
Generate brief recent updates for: approval/support, key promises, public statements. Write "N/A" if not applicable.
Return ONLY valid JSON (no markdown):
{"approval":"brief update or N/A","promises":"brief update or N/A","statements":"brief update or N/A"}`;
}

function parseUpdates(txt) {
  const m = txt.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[0]);
    const updates = {};
    for (const field of FIELDS_TO_UPDATE) { if (parsed[field] && parsed[field] !== 'N/A') updates[field] = parsed[field]; }
    return Object.keys(updates).length > 0 ? updates : null;
  } catch { return null; }
}

async function callViaProxy(leader) {
  if (!GROQ_PROXY_URL) return null;
  try {
    const res = await fetch(GROQ_PROXY_URL, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: buildPrompt(leader) }], max_tokens: 300, temperature: 0.2 }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const txt = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return parseUpdates(txt);
  } catch { return null; }
}

async function callDirect(leader) {
  const prompt = buildPrompt(leader);
  // Try OpenRouter first
  if (OPENROUTER_KEY) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENROUTER_KEY, 'HTTP-Referer': 'https://julyforum.com', 'X-Title': 'JOAF' },
        body: JSON.stringify({ model: 'meta-llama/llama-4-scout-17b-16e-instruct:free', max_tokens: 300, temperature: 0.2, messages: [{ role: 'user', content: prompt }] }),
      });
      if (res.ok) { const data = await res.json(); return parseUpdates(data.choices?.[0]?.message?.content || ''); }
    } catch {}
  }
  // Groq
  if (GROQ_KEY) {
    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0.2, max_tokens: 300 }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        const updates = parseUpdates(data.choices?.[0]?.message?.content || '');
        if (updates) return updates;
      } catch { continue; }
    }
  }
  return null;
}

export default async ({ req, res, log, error }) => {
  const isHttp = req.method === 'POST' || req.method === 'GET';
  if (isHttp) {
    const adminKey = req.headers?.['x-admin-key'];
    if (adminKey && adminKey !== ADMIN_KEY) return res.json({ error: 'Unauthorized' }, 401);
  }

  const today = BD_TODAY();
  try {
    const docs = await awList('leaders', [], 100).catch(() => []);
    const allLeaders = docs.map(d => ({ id: d.id, ...d.data }));

    if (!allLeaders.length) return res.json({ success: true, message: 'কোনো leaders নেই' });

    const logResult = { updated: 0, failed: 0, errors: [] };

    for (const leader of allLeaders) {
      try {
        let updates = await callViaProxy(leader) || await callDirect(leader);
        if (updates) {
          updates.lastUpdated = today;
          updates.updatedAt = new Date().toISOString();
          await awUpdate('leaders', leader.id, updates);
          logResult.updated++;
          log(`✓ ${leader.name}`);
        } else { logResult.failed++; }
      } catch (e) {
        logResult.failed++;
        logResult.errors.push({ id: leader.id, error: e.message });
      }
    }

    return res.json({ success: true, date: today, total: allLeaders.length, updated: logResult.updated, failed: logResult.failed, errors: logResult.errors.length ? logResult.errors : undefined });
  } catch (e) {
    error('update-leaders fatal: ' + e.message);
    return res.json({ success: false, error: e.message }, 500);
  }
};
