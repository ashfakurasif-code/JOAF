// Appwrite Function: groq-proxy
// HTTP trigger — POST only
// Auth: requires x-joaf-key header matching INTERNAL_API_KEY env var
// Provider order: OpenRouter (primary) → Gemini (fallback) → Groq (last resort)

export default async ({ req, res, log, error }) => {
  if (req.method === 'OPTIONS') return res.empty();

  // ── Auth guard ──────────────────────────────────────────────────────────
  const INTERNAL_KEY = process.env.INTERNAL_API_KEY;
  if (INTERNAL_KEY) {
    const provided = req.headers['x-joaf-key'] || req.headers['x-internal-key'];
    if (!provided || provided !== INTERNAL_KEY) {
      error('Unauthorized request to groq-proxy');
      return res.json({ error: 'Unauthorized' }, 401);
    }
  }

  const GEMINI_KEY     = process.env.GEMINI_API_KEY;
  const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
  const GROQ_KEY       = process.env.GROQ_API_KEY;

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch { return res.json({ error: 'Invalid JSON' }, 400); }

  if (body && body._ping) return res.json({ ok: true, pong: true });

  // ── LAYER 1: OpenRouter (primary) ──
  if (OPENROUTER_KEY) {
    try {
      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + OPENROUTER_KEY, 'HTTP-Referer': 'https://julyforum.com', 'X-Title': 'JOAF' },
        body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', max_tokens: body.max_tokens || 1000, temperature: body.temperature || 0.7, messages: body.messages }),
      });
      if (orRes.ok) {
        const data = await orRes.json();
        log('✅ OpenRouter PRIMARY');
        res.setHeader?.('x-ai-provider', 'openrouter');
        return res.json(data);
      }
      log('⚠️ OpenRouter failed: ' + orRes.status);
    } catch (e) { log('⚠️ OpenRouter error: ' + e.message); }
  }

  // ── LAYER 2: Gemini (fallback) ──
  if (GEMINI_KEY) {
    try {
      const geminiContents = body.messages
        .filter(m => m.role !== 'system')
        .map(msg => {
          const parts = Array.isArray(msg.content)
            ? msg.content.map(part => {
                if (part.type === 'text') return { text: part.text };
                if (part.type === 'image_url') {
                  const url = part.image_url?.url || '';
                  if (url.startsWith('data:')) {
                    const [meta, data] = url.split(',');
                    return { inlineData: { mimeType: meta.replace('data:', '').replace(';base64', ''), data } };
                  }
                  return { text: `[image: ${url}]` };
                }
                return { text: JSON.stringify(part) };
              })
            : [{ text: String(msg.content || '') }];
          return { role: msg.role === 'assistant' ? 'model' : 'user', parts };
        });

      const systemMsg = body.messages.find(m => m.role === 'system');
      if (systemMsg && geminiContents[0]) {
        const sysText = typeof systemMsg.content === 'string' ? systemMsg.content : JSON.stringify(systemMsg.content);
        geminiContents[0].parts.unshift({ text: '[SYSTEM INSTRUCTION]\n' + sysText + '\n\n' });
      }

      const geminiModel = 'gemini-2.0-flash-lite';
      const gRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_KEY}`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: geminiContents, generationConfig: { maxOutputTokens: body.max_tokens || 1000, temperature: body.temperature || 0.7 } }) }
      );
      if (gRes.ok) {
        const gData = await gRes.json();
        const text = gData.candidates?.flatMap(c => c.content?.parts || []).map(p => p.text || '').join('\n') || '';
        log('✅ Gemini FALLBACK');
        res.setHeader?.('x-ai-provider', 'gemini');
        return res.json({ choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop', index: 0 }], model: geminiModel, usage: gData.usageMetadata || {} });
      }
      log('⚠️ Gemini failed: ' + gRes.status);
    } catch (e) { log('⚠️ Gemini error: ' + e.message); }
  }

  // ── LAYER 3: Groq (last resort) ──
  if (!GROQ_KEY) return res.json({ error: 'No AI key configured' }, 500);
  try {
    const groqMessages = (body.messages || []).map(m => {
      if (!Array.isArray(m.content)) return m;
      return { role: m.role, content: m.content.filter(p => p.type === 'text').map(p => p.text).join('\n') };
    });
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
      body: JSON.stringify({ model: 'llama-3.3-70b-versatile', max_tokens: body.max_tokens || 1000, temperature: body.temperature || 0.7, messages: groqMessages }),
    });
    const data = await groqRes.json();
    if (groqRes.ok) { log('✅ Groq LAST RESORT'); res.setHeader?.('x-ai-provider', 'groq'); } else error('❌ Groq failed: ' + groqRes.status);
    return res.json(data, groqRes.status);
  } catch (e) { error('❌ Groq error: ' + e.message); return res.json({ error: e.message }, 500); }
};
