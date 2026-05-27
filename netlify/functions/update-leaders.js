// netlify/functions/update-leaders.js — UPDATED
// Uses groq-proxy with new provider order: OpenRouter → Gemini → Groq
// Changed: Replaced direct Gemini/Groq calls with groq-proxy
// Updated: 2026-05-27

const GROQ_KEY   = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY;
const ADMIN_KEY  = process.env.ADMIN_SECRET_KEY;

const GROQ_MODELS = [
  'llama-3.1-8b-instant',
  'llama-3.3-70b-versatile',
];

const { awList, awUpdate, qEqual } = require('./aw-utils');

const BD_TODAY = () => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 10);

const FIELDS_TO_UPDATE = ['approval', 'promises', 'statements'];

// ──────────────────────────────────────────────
// UPDATED: Use groq-proxy (OpenRouter primary)
// Replaces direct Gemini/Groq API calls
// ──────────────────────────────────────────────

async function updateLeaderWithProxy(leader) {
  try {
    const prompt = `You are a Bangladesh political analyst. Given this leader info:
Name: ${leader.name}
Role: ${leader.role}
Last headline: ${leader.headline || '(none)'}

Generate brief recent updates for:
1. Political approval/support (if applicable)
2. Key promises or commitments
3. Public statements or positions

If not applicable for any, write "N/A".

Return valid JSON (ONLY, no markdown):
{
  "approval": "brief update or N/A",
  "promises": "brief update or N/A",
  "statements": "brief update or N/A"
}`;

    const res = await fetch('/.netlify/functions/groq-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 300,
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      console.log(`[update-leaders/proxy] ${leader.id} HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();

    // Extract text (OpenAI or Gemini format)
    let txt = '';
    if (data.choices?.[0]?.message?.content) {
      txt = data.choices[0].message.content;
    } else if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
      txt = data.candidates[0].content.parts[0].text;
    }

    // Parse JSON
    const match = txt.match(/\{[\s\S]*\}/);
    if (!match) {
      console.log(`[update-leaders] ${leader.id} no JSON found`);
      return null;
    }

    const parsed = JSON.parse(match[0]);
    const updates = {};
    for (const field of FIELDS_TO_UPDATE) {
      if (parsed[field] && parsed[field] !== 'N/A') {
        updates[field] = parsed[field];
      }
    }

    if (Object.keys(updates).length > 0) {
      console.log(`[update-leaders] ✓ ${leader.id} (proxy)`);
      return updates;
    }

    return null;
  } catch (e) {
    console.error(`[update-leaders/proxy] ${leader.id} error:`, e.message);
    return null;
  }
}

// Legacy fallback: Direct Groq
async function updateLeaderWithGroqLegacy(leader) {
  if (!GROQ_KEY) return null;

  const prompt = `You are a Bangladesh political analyst. Given this leader info:
Name: ${leader.name}
Role: ${leader.role}
Last headline: ${leader.headline || '(none)'}

Generate brief recent updates for:
1. Political approval/support (if applicable)
2. Key promises or commitments
3. Public statements or positions

If not applicable for any, write "N/A".

Return valid JSON (ONLY, no markdown):
{
  "approval": "brief update or N/A",
  "promises": "brief update or N/A",
  "statements": "brief update or N/A"
}`;

  for (const model of GROQ_MODELS) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_KEY,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.2,
          max_tokens: 300,
        }),
      });

      if (!res.ok) {
        console.log(`[update-leaders] Legacy Groq ${model} HTTP ${res.status}`);
        continue;
      }

      const data = await res.json();
      const txt = data.choices?.[0]?.message?.content || '';

      const match = txt.match(/\{[\s\S]*\}/);
      if (!match) continue;

      const parsed = JSON.parse(match[0]);
      const updates = {};
      for (const field of FIELDS_TO_UPDATE) {
        if (parsed[field] && parsed[field] !== 'N/A') {
          updates[field] = parsed[field];
        }
      }

      if (Object.keys(updates).length > 0) {
        console.log(`[update-leaders] ✓ ${leader.id} (legacy groq ${model})`);
        return updates;
      }
    } catch (e) {
      console.log(`[update-leaders] Legacy Groq error: ${e.message}`);
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

  const adminKey = event.headers?.['x-admin-key'];
  const isScheduled = event.headers?.['x-netlify-event'] === 'schedule';
  if (!isScheduled && adminKey !== ADMIN_KEY) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Unauthorized' }) };
  }

  try {
    // Get all leaders
    let allLeaders = [];
    try {
      const docs = await awList('leaders', [], 100);
      allLeaders = docs.map(d => ({ id: d.id, ...d.data }));
    } catch (e) {
      console.error('[update-leaders] awList error:', e.message);
    }

    if (allLeaders.length === 0) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'কোনো leaders নেই' }),
      };
    }

    const today = BD_TODAY();
    const log = { updated: 0, failed: 0, errors: [] };

    // Update each leader
    for (const leader of allLeaders) {
      try {
        // Try proxy first
        let updates = await updateLeaderWithProxy(leader);

        // If proxy fails, try legacy Groq
        if (!updates) {
          updates = await updateLeaderWithGroqLegacy(leader);
        }

        if (updates) {
          updates.lastUpdated = today;
          updates.updatedAt = new Date().toISOString();

          await awUpdate('leaders', leader.id, updates);
          log.updated++;
        } else {
          log.failed++;
        }
      } catch (e) {
        console.error(`[update-leaders] ${leader.id} update error:`, e.message);
        log.failed++;
        log.errors.push({ id: leader.id, error: e.message });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        operation: 'update-profiles',
        timestamp: new Date().toISOString(),
        date: today,
        total: allLeaders.length,
        updated: log.updated,
        failed: log.failed,
        errors: log.errors.length > 0 ? log.errors : undefined,
      }),
    };
  } catch (e) {
    console.error('[update-leaders] Top-level error:', e.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ success: false, error: e.message }),
    };
  }
};