// Appwrite Function: groq-proxy
// OPTIMIZED BUILD — Free Tier Safe
// Provider cascade: OpenRouter → Gemini → Groq
// Auth: x-joaf-key or x-internal-key header

const TIMEOUT_MS = 25000; // 25s — stay under 30s function timeout

function abortSignal(ms) {
  return AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined;
}

async function tryOpenRouter(key, body) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + key,
      'HTTP-Referer': 'https://julyforum.com',
      'X-Title': 'JOAF',
    },
    body: JSON.stringify({
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      max_tokens: Math.min(body.max_tokens || 1000, 2000),
      temperature: body.temperature ?? 0.7,
      messages: body.messages,
    }),
    signal: abortSignal(TIMEOUT_MS),
  });
  if (!res.ok) throw new Error('OR:' + res.status);
  return res.json();
}

async function tryGemini(key, body) {
  const geminiContents = body.messages
    .filter(m => m.role !== 'system')
    .map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: Array.isArray(msg.content)
        ? msg.content.map(p => p.type === 'text' ? { text: p.text } : { text: JSON.stringify(p) })
        : [{ text: String(msg.content || '') }],
    }));

  const sysMsg = body.messages.find(m => m.role === 'system');
  if (sysMsg && geminiContents[0]) {
    const sysText = typeof sysMsg.content === 'string' ? sysMsg.content : JSON.stringify(sysMsg.content);
    geminiContents[0].parts.unshift({ text: '[SYSTEM]\n' + sysText + '\n\n' });
  }

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: { maxOutputTokens: Math.min(body.max_tokens || 1000, 2000), temperature: body.temperature ?? 0.7 },
      }),
      signal: abortSignal(TIMEOUT_MS),
    }
  );
  if (!res.ok) throw new Error('Gemini:' + res.status);
  const data = await res.json();
  const text = data.candidates?.flatMap(c => c.content?.parts || []).map(p => p.text || '').join('\n') || '';
  return { choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop', index: 0 }], model: 'gemini-2.0-flash-lite', usage: data.usageMetadata || {} };
}

async function tryGroq(key, body) {
  const messages = (body.messages || []).map(m =>
    Array.isArray(m.content)
      ? { role: m.role, content: m.content.filter(p => p.type === 'text').map(p => p.text).join('\n') }
      : m
  );
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + key },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: Math.min(body.max_tokens || 1000, 2000), temperature: body.temperature ?? 0.7, messages }),
    signal: abortSignal(TIMEOUT_MS),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data.error || res.status));
  return data;
}

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();
  if (req.method !== 'POST') return res.json({ error: 'Method not allowed' }, 405);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const INTERNAL_KEY = process.env.INTERNAL_API_KEY;
  if (INTERNAL_KEY) {
    const provided = req.headers['x-joaf-key'] || req.headers['x-internal-key'];
    if (!provided || provided !== INTERNAL_KEY) {
      error('groq-proxy: unauthorized');
      return res.json({ error: 'Unauthorized' }, 401);
    }
  }

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.json({ error: 'Invalid JSON' }, 400); }

  if (!body?.messages?.length) return res.json({ error: 'messages required' }, 400);
  if (body._ping) return res.json({ ok: true, pong: true });

  const OR_KEY     = process.env.OPENROUTER_API_KEY;
  const GEMINI_KEY = process.env.GEMINI_API_KEY;
  const GROQ_KEY   = process.env.GROQ_API_KEY;

  // ── Provider cascade ──────────────────────────────────────────────────────
  if (OR_KEY) {
    try {
      const data = await tryOpenRouter(OR_KEY, body);
      log('groq-proxy: OpenRouter OK');
      return res.json(data);
    } catch (e) { log('groq-proxy: OpenRouter failed — ' + e.message); }
  }

  if (GEMINI_KEY) {
    try {
      const data = await tryGemini(GEMINI_KEY, body);
      log('groq-proxy: Gemini OK');
      return res.json(data);
    } catch (e) { log('groq-proxy: Gemini failed — ' + e.message); }
  }

  if (!GROQ_KEY) return res.json({ error: 'No AI provider configured' }, 500);
  try {
    const data = await tryGroq(GROQ_KEY, body);
    log('groq-proxy: Groq OK');
    return res.json(data);
  } catch (e) {
    error('groq-proxy: all providers failed — ' + e.message);
    return res.json({ error: 'AI unavailable: ' + e.message }, 503);
  }
};
