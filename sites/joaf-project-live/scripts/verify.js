const fs = require('fs');
const path = require('path');

function readSpec() {
  try {
    return JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'appwrite.json'), 'utf8'));
  } catch (_) {
    return {};
  }
}

function findVar(spec, key) {
  for (const fn of Array.isArray(spec.functions) ? spec.functions : []) {
    for (const v of Array.isArray(fn.vars) ? fn.vars : []) {
      if (v && v.name === key && v.value) return v.value;
    }
  }
  return '';
}

(async () => {
  const spec = readSpec();
  const endpoint =
    process.env.APPWRITE_ENDPOINT ||
    process.env.APPWRITE_FUNCTION_API_ENDPOINT ||
    spec.endpoint ||
    findVar(spec, 'APPWRITE_ENDPOINT') ||
    findVar(spec, 'NEXT_PUBLIC_APPWRITE_ENDPOINT') ||
    '';

  if (!endpoint) {
    console.error('[verify] missing APPWRITE_ENDPOINT');
    process.exit(1);
  }

  const healthUrl = `${endpoint.replace(/\/$/, '')}/health`;

  const res = await fetch(healthUrl, { method: 'GET' });
  if (!res.ok) {
    console.error(`[verify] health endpoint failed: ${res.status} ${res.statusText}`);
    process.exit(1);
  }

  const data = await res.json().catch(() => ({}));
  const statuses = [];
  if (data.status) statuses.push(data.status);
  if (Array.isArray(data.services)) statuses.push(...data.services.map(s => s.status));
  if (Array.isArray(data.components)) statuses.push(...data.components.map(s => s.status));

  const allPass = statuses.length === 0 ? true : statuses.every(s => String(s).toLowerCase() === 'pass');
  if (!allPass) {
    console.error('[verify] health check did not pass:', JSON.stringify(data));
    process.exit(1);
  }

  console.log('[verify] health check passed');
})().catch((err) => {
  console.error('[verify] failed:', err);
  process.exit(1);
});
