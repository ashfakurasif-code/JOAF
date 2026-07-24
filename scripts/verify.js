const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const SKIP_DIRS = new Set(['.git', 'node_modules', '.cache', 'dist', 'build', '.netlify']);
const TEXT_EXTS = new Set(['.html', '.css', '.js', '.mjs', '.json', '.md', '.txt', '.yml', '.yaml', '.webmanifest', '.svg']);
const SECRET_PATTERNS = [
  /standard_[A-Za-z0-9]{80,}/g,
  /sk-(?:or-)?[A-Za-z0-9_-]{20,}/g,
  /ghp_[A-Za-z0-9_]{20,}/g,
  /gsk_[A-Za-z0-9_-]{20,}/g,
  /hf_[A-Za-z0-9_-]{20,}/g,
  /EAA[A-Za-z0-9]{80,}/g,
];

function readSpec() {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'appwrite.json'), 'utf8'));
  } catch (_) {
    return {};
  }
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function stripUrlNoise(value) {
  return value.split('#')[0].split('?')[0];
}

function isDynamicRef(value) {
  return !value || value.includes('${') || value.includes("'+") || value.includes("+'") || value.includes("' +") || value.includes("+ '") || value.startsWith('{{') || value.startsWith('<%');
}

function isExternalRef(value) {
  return /^(?:https?:)?\/\//i.test(value) || /^(?:mailto|tel|data|javascript):/i.test(value);
}

function localPathForRef(fromFile, value) {
  const clean = stripUrlNoise(value);
  if (isDynamicRef(clean) || isExternalRef(clean) || clean.startsWith('#')) return null;
  if (clean.startsWith('/')) return path.join(root, clean.slice(1));
  return path.resolve(path.dirname(fromFile), clean);
}

function validateLocalFiles(files) {
  const issues = [];
  for (const file of files.filter(f => path.extname(f).toLowerCase() === '.html')) {
    const html = fs.readFileSync(file, 'utf8');
    const attrRe = /\b(?:href|src)=(["'])(.*?)\1/g;
    for (const match of html.matchAll(attrRe)) {
      const target = localPathForRef(file, match[2]);
      if (target && !fs.existsSync(target)) {
        issues.push(`${path.relative(root, file)} -> ${match[2]}`);
      }
    }
  }
  return issues;
}

function validateSecrets(files) {
  const findings = [];
  for (const file of files) {
    const ext = path.extname(file).toLowerCase();
    if (!TEXT_EXTS.has(ext)) continue;
    const rel = path.relative(root, file);
    let text = fs.readFileSync(file, 'utf8');
    text = text.replace(/data:[^\s"'`<>]+/g, '');
    for (const pattern of SECRET_PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        // Documentation placeholders are intentionally short and contain ellipses; real findings are full tokens.
        findings.push(`${rel}: ${match[0].slice(0, 14)}…`);
      }
    }
  }
  return findings;
}

function validateAppwriteSpec(spec) {
  const issues = [];
  const ids = new Set();
  for (const fn of Array.isArray(spec.functions) ? spec.functions : []) {
    if (!fn.$id) issues.push('function missing $id');
    if (ids.has(fn.$id)) issues.push(`duplicate function id: ${fn.$id}`);
    ids.add(fn.$id);
    if (fn.path && !fs.existsSync(path.join(root, fn.path, fn.entrypoint || 'index.js'))) {
      issues.push(`function entrypoint missing: ${fn.$id} (${fn.path}/${fn.entrypoint || 'index.js'})`);
    }
  }
  return issues;
}

async function remoteHealth(spec) {
  const endpoint = process.env.APPWRITE_ENDPOINT || process.env.APPWRITE_FUNCTION_API_ENDPOINT || spec.endpoint || '';
  if (process.env.JOAF_VERIFY_REMOTE !== '1') return { skipped: true };
  if (!endpoint) throw new Error('[verify] remote check requested but APPWRITE_ENDPOINT is missing');
  const healthUrl = `${endpoint.replace(/\/$/, '')}/health`;
  const res = await fetch(healthUrl, { method: 'GET' });
  if (!res.ok) throw new Error(`[verify] health endpoint failed: ${res.status} ${res.statusText}`);
  const data = await res.json().catch(() => ({}));
  const statuses = [];
  if (data.status) statuses.push(data.status);
  if (Array.isArray(data.services)) statuses.push(...data.services.map(s => s.status));
  if (Array.isArray(data.components)) statuses.push(...data.components.map(s => s.status));
  const allPass = statuses.length === 0 ? true : statuses.every(s => String(s).toLowerCase() === 'pass');
  if (!allPass) throw new Error(`[verify] health check did not pass: ${JSON.stringify(data)}`);
  return { skipped: false };
}

(async () => {
  const spec = readSpec();
  const files = walk(root);
  const missingRefs = validateLocalFiles(files);
  const secretFindings = validateSecrets(files);
  const specIssues = validateAppwriteSpec(spec);

  if (missingRefs.length || secretFindings.length || specIssues.length) {
    if (missingRefs.length) console.error('[verify] missing local asset references:\n' + missingRefs.map(i => `  - ${i}`).join('\n'));
    if (secretFindings.length) console.error('[verify] potential committed secrets:\n' + secretFindings.map(i => `  - ${i}`).join('\n'));
    if (specIssues.length) console.error('[verify] appwrite spec issues:\n' + specIssues.map(i => `  - ${i}`).join('\n'));
    process.exit(1);
  }

  const remote = await remoteHealth(spec);
  console.log(`[verify] local checks passed (${files.length} files scanned)`);
  console.log(remote.skipped ? '[verify] remote health skipped (set JOAF_VERIFY_REMOTE=1 to enable)' : '[verify] remote health passed');
})().catch((err) => {
  console.error('[verify] failed:', err.message || err);
  process.exit(1);
});
