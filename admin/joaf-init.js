/**
 * joaf-init.js
 * Extracted from admin/index.html inline scripts.
 * Fixes CSP violation: no more inline <script> blocks.
 */

// ══════════════════════════════════════════════════════════════
// 1. JOAF AI SAFE PATCH (rate-limit interceptor for groq-proxy)
// ══════════════════════════════════════════════════════════════
(function () {
  // Prevent duplicate AI execution
  window.__JOAF_AI_BUSY = false;

  // Delay helper
  window.joafDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const originalFetch = window.fetch;
  window.__AI_COOLDOWN = false;

  window.fetch = async function (...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('groq-proxy')) {
      if (window.__AI_COOLDOWN) {
        if (typeof log === 'function') {
          log('<span style="color:var(--amber)">⏳ Local Cooldown একটিভ। দয়া করে একটু অপেক্ষা করুন...</span>');
        }
        throw new Error('AI gateway is cooling down locally.');
      }
      try {
        const res = await originalFetch(...args);
        if (res.status === 429) {
          if (typeof log === 'function') {
            log('<span style="color:var(--red)">⚠️ Rate limit (429) হিট করেছে! ৫ সেকেন্ড অপেক্ষা করছি...</span>');
          }
          await window.joafDelay(5000);
          return originalFetch(...args);
        }
        return res;
      } catch (err) {
        if (err.message && err.message.includes('429')) {
          window.__AI_COOLDOWN = true;
          setTimeout(() => { window.__AI_COOLDOWN = false; }, 60000);
        }
        throw err;
      }
    }
    return originalFetch(...args);
  };
})();

// ══════════════════════════════════════════════════════════════
// 2. Appwrite Configuration + join_aw_exec helper
// ══════════════════════════════════════════════════════════════
window.AW_EXEC_BASE = 'https://fra.cloud.appwrite.io/v1/functions';
window.AW_PROJECT   = '6a11b6cd000b59f318eb';

async function join_aw_exec(fnId, options = {}) {
  const method    = (options.method || 'GET').toUpperCase();
  const headers   = options.headers || {};
  const rawBody   = options.body    || '';

  let bodyObj = {};
  try { bodyObj = typeof rawBody === 'string' ? (rawBody ? JSON.parse(rawBody) : {}) : rawBody; } catch (_) {}

  const adminKeyVal = headers['X-Admin-Key'] || headers['x-admin-key'] || '';
  if (adminKeyVal) bodyObj._adminKey = adminKeyVal;

  const reqHeaders = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': window.AW_PROJECT
  };

  const reqBody = JSON.stringify({
    async: false,
    path: '/',
    method: method,
    headers: { ...headers },
    body: typeof bodyObj === 'string' ? bodyObj : JSON.stringify(bodyObj)
  });

  const res = await fetch(`${window.AW_EXEC_BASE}/${fnId}/executions`, {
    method: 'POST',
    headers: reqHeaders,
    body: reqBody
  });

  if (!res.ok) return res;

  const exec       = await res.json();
  const bodyStr    = exec.responseBody        != null ? exec.responseBody        : '{}';
  const statusCode = exec.responseStatusCode  != null ? exec.responseStatusCode  : 200;

  return new Response(bodyStr, {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' }
  });
}

// Expose globally so rest of page scripts can call it
window.join_aw_exec = join_aw_exec;

// ══════════════════════════════════════════════════════════════
// 3. Logo + seededRand (was inline after <body>)
// ══════════════════════════════════════════════════════════════
function seededRand(seed) {
  let s = seed >>> 0;
  return function () {
    s += 0x6D2B79F5;
    let z = s;
    z = Math.imul(z ^ (z >>> 15), z | 1);
    z ^= z + Math.imul(z ^ (z >>> 7), z | 61);
    return ((z ^ (z >>> 14)) >>> 0) / 4294967296;
  };
}
window.seededRand = seededRand;
