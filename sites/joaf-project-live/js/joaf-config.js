(function (root) {
  const isBrowser = typeof document !== 'undefined';
  const currentScript = isBrowser ? document.currentScript : null;

  function loadSpec() {
    if (!isBrowser || typeof XMLHttpRequest === 'undefined') return {};
    const seen = new Set();
    const candidates = [];

    try {
      if (currentScript && currentScript.src) {
        const here = new URL('.', currentScript.src);
        candidates.push(new URL('../appwrite.json', here).href);
        candidates.push(new URL('./appwrite.json', here).href);
      }
      if (typeof location !== 'undefined') {
        candidates.push(new URL('/appwrite.json', location.href).href);
      }
    } catch (_) {}

    for (const url of candidates) {
      if (!url || seen.has(url)) continue;
      seen.add(url);
      try {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send(null);
        if (xhr.status >= 200 && xhr.status < 300 && xhr.responseText) {
          return JSON.parse(xhr.responseText);
        }
      } catch (_) {}
    }
    return {};
  }

  function findVar(spec, key) {
    for (const fn of Array.isArray(spec.functions) ? spec.functions : []) {
      for (const entry of Array.isArray(fn.vars) ? fn.vars : []) {
        if (entry && entry.name === key && entry.value) return entry.value;
      }
    }
    return '';
  }

  const injected = root.__JOAF_CONFIG__ && typeof root.__JOAF_CONFIG__ === 'object' ? root.__JOAF_CONFIG__ : {};
  const spec = Object.keys(injected).length ? injected : loadSpec();

  const endpoint =
    injected.endpoint ||
    spec.endpoint ||
    spec.APPWRITE_ENDPOINT ||
    findVar(spec, 'APPWRITE_ENDPOINT') ||
    findVar(spec, 'NEXT_PUBLIC_APPWRITE_ENDPOINT') ||
    '';

  const projectId =
    injected.projectId ||
    spec.projectId ||
    spec.APPWRITE_PROJECT_ID ||
    findVar(spec, 'APPWRITE_PROJECT_ID') ||
    findVar(spec, 'APPWRITE_PROJECT') ||
    findVar(spec, 'NEXT_PUBLIC_APPWRITE_PROJECT_ID') ||
    '';

  const databaseId =
    injected.databaseId ||
    spec.databaseId ||
    spec.APPWRITE_DATABASE_ID ||
    findVar(spec, 'APPWRITE_DATABASE_ID') ||
    findVar(spec, 'NEXT_PUBLIC_APPWRITE_DATABASE_ID') ||
    '';

  const functionsBase =
    injected.functionsBase ||
    spec.functionsBase ||
    (endpoint ? endpoint.replace(/\/$/, '') + '/functions' : '');

  const config = Object.freeze({
    ...spec,
    ...injected,
    endpoint,
    projectId,
    databaseId,
    functionsBase,
  });

  root.JOAF_CONFIG = config;
  root.JOAF_ENDPOINT = endpoint;
  root.JOAF_PROJECT_ID = projectId;
  root.JOAF_DATABASE_ID = databaseId;
  root.JOAF_FUNCTIONS_BASE = functionsBase;
})(typeof globalThis !== 'undefined' ? globalThis : window);
