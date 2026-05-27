// groq-proxy.js — REORDERED: OpenRouter primary → Gemini fallback → Groq last resort
// Updated: 2026-05-27 | Change: Prioritized OpenRouter (proven reliable) over Gemini (currently offline)

exports.handler = async (event) => {

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const GEMINI_KEY      = process.env.GEMINI_API_KEY;
  const OPENROUTER_KEY  = process.env.OPENROUTER_API_KEY;
  const GROQ_KEY        = process.env.GROQ_API_KEY;

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  // Detect if request has image content
  const hasImage = body.messages?.some(m =>
    Array.isArray(m.content) &&
    m.content.some(p => p.type === 'image_url')
  );

  // ─────────────────────────────────────────────
  // LAYER 1: OPENROUTER PRIMARY (REORDERED)
  // ─────────────────────────────────────────────
  // Reason: Currently working (114.3ms), Gemini offline
  // Used by: News Card Generator, Content Moderation, Post Suggestions

  if (OPENROUTER_KEY) {
    try {

      // Pick free vision or text model
      const orModel = hasImage
        ? 'meta-llama/llama-4-scout-17b-16e-instruct:free'
        : 'meta-llama/llama-4-scout-17b-16e-instruct:free';

      const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': 'Bearer ' + OPENROUTER_KEY,
          'HTTP-Referer':  'https://julyforum.com',
          'X-Title':       'JOAF'
        },
        body: JSON.stringify({
          model:       orModel,
          max_tokens:  body.max_tokens  || 1000,
          temperature: body.temperature || 0.7,
          messages:    body.messages
        })
      });

      if (orRes.ok) {
        const orData = await orRes.json();
        console.log('✅ OpenRouter PRIMARY success with', orModel);
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(orData)
        };
      }

      console.log('⚠️ OpenRouter PRIMARY failed:', orRes.status, '→ Gemini fallback');

    } catch (e) {
      console.log('⚠️ OpenRouter PRIMARY error:', e.message, '→ Gemini fallback');
    }
  }

  // ─────────────────────────────────────────────
  // LAYER 2: GEMINI FALLBACK (REORDERED)
  // ─────────────────────────────────────────────
  // Note: Currently offline, but keeping as fallback for when it's fixed

  if (GEMINI_KEY) {
    try {

      // Convert OpenAI messages → Gemini format
      const geminiContents = body.messages
        .filter(m => m.role !== 'system')
        .map(msg => {

          const parts = Array.isArray(msg.content)
            ? msg.content.map(part => {

                if (part.type === 'text') {
                  return { text: part.text };
                }

                if (part.type === 'image_url') {
                  const url = part.image_url?.url || '';

                  if (url.startsWith('data:')) {
                    const [meta, data] = url.split(',');
                    const mimeType = meta
                      .replace('data:', '')
                      .replace(';base64', '');
                    return { inlineData: { mimeType, data } };
                  }

                  return { text: `[image: ${url}]` };
                }

                return { text: JSON.stringify(part) };
              })
            : [{ text: String(msg.content || '') }];

          return {
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts
          };
        });

      // Inject system message into first user turn
      const systemMsg = body.messages.find(m => m.role === 'system');
      if (systemMsg && geminiContents[0]) {
        const systemText = typeof systemMsg.content === 'string'
          ? systemMsg.content
          : JSON.stringify(systemMsg.content);

        geminiContents[0].parts.unshift({
          text: '[SYSTEM INSTRUCTION]\n' + systemText + '\n\n'
        });
      }

      const geminiModel = 'gemini-2.0-flash-lite';
      const geminiUrl   = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${GEMINI_KEY}`;

      const gRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: geminiContents,
          generationConfig: {
            maxOutputTokens: body.max_tokens || 1000,
            temperature:     body.temperature || 0.7
          }
        })
      });

      if (gRes.ok) {
        const gData = await gRes.json();
        const text  = gData.candidates
          ?.flatMap(c => c.content?.parts || [])
          ?.map(p => p.text || '')
          ?.join('\n') || '';

        console.log('✅ Gemini FALLBACK success');
        return {
          statusCode: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            choices: [{ message: { role: 'assistant', content: text }, finish_reason: 'stop', index: 0 }],
            model: geminiModel,
            usage: gData.usageMetadata || {}
          })
        };
      }

      console.log('⚠️ Gemini FALLBACK failed:', gRes.status, '→ Groq last resort');

    } catch (e) {
      console.log('⚠️ Gemini FALLBACK error:', e.message, '→ Groq last resort');
    }
  }

  // ─────────────────────────────────────────────
  // LAYER 3: GROQ LAST RESORT
  // ─────────────────────────────────────────────

  if (!GROQ_KEY) {
    return { statusCode: 500, body: 'No AI key configured' };
  }

  try {
    // Groq uses its own model IDs — never pass the client's model field.
    // Also strip image_url parts: Groq text models don't support vision.
    const groqMessages = (body.messages || []).map(m => {
      if (!Array.isArray(m.content)) return m;
      const textOnly = m.content
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join('\n');
      return { role: m.role, content: textOnly };
    });

    const groqBody = {
      model:       'llama-3.3-70b-versatile',
      max_tokens:  body.max_tokens  || 1000,
      temperature: body.temperature || 0.7,
      messages:    groqMessages
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': 'Bearer ' + GROQ_KEY
      },
      body: JSON.stringify(groqBody)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Groq LAST RESORT success');
    } else {
      console.log('❌ Groq LAST RESORT failed:', response.status);
    }

    return {
      statusCode: response.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };

  } catch (e) {
    console.log('❌ Groq LAST RESORT error:', e.message);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: e.message })
    };
  }
};
