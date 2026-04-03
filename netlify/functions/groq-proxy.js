const ALLOWED_MODELS = ['llama-3.3-70b-versatile'];
const DEFAULT_MODEL  = 'llama-3.3-70b-versatile';
const MAX_TOKENS_CAP = 1200;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method Not Allowed' };

  const GROQ_KEY = process.env.GROQ_API_KEY;
  if (!GROQ_KEY) return { statusCode: 500, body: 'API key not configured' };

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Invalid JSON in request body' }) };
  }

  if (!body || typeof body !== 'object') {
    return { statusCode: 400, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ error: 'Request body must be a JSON object' }) };
  }

  // Enforce model allowlist — override any missing or disallowed model
  if (!body.model || !ALLOWED_MODELS.includes(body.model)) {
    body.model = DEFAULT_MODEL;
  }

  // Enforce hard cap on max_tokens (also reject non-positive values)
  if (typeof body.max_tokens !== 'number' || body.max_tokens <= 0 || body.max_tokens > MAX_TOKENS_CAP) {
    body.max_tokens = MAX_TOKENS_CAP;
  }

  // Clamp temperature into [0, 1]
  if (typeof body.temperature === 'number') {
    body.temperature = Math.min(1, Math.max(0, body.temperature));
  }

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + GROQ_KEY },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  return {
    statusCode: response.status,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  };
};
