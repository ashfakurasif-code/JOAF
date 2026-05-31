// JOAF Service Worker v3.2
// ⚠️ নতুন deploy দিলে CACHE version বাড়াও: joaf-v10 → joaf-v11
const CACHE = 'joaf-v11';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/css/joaf.css',
  '/js/data.js',
  '/js/components.js',
  '/js/aw-firestore.js',
  '/js/main.js',
  '/logoc7c3.png',
  '/offline.html',
  '/rokto.html',
  '/alert.html',
  '/joaf-polls.html',
  '/bajar.html',
  '/news.html',
  '/hospital.html',
  '/doctor.html',
  '/legal.html',
  '/food-aid.html',
  '/medicine.html',
  '/weather.html',
  '/jobs.html',
  '/freelance.html',
  '/agriculture.html',
  '/voter.html',
  '/july-warriors.html',
  '/july-family.html',
  '/leader-tracker.html',
  '/live.html',
  '/forum.html',
  '/women-entrepreneur.html',
  '/youth-startup.html',
];

const CONFIG_URL = (() => {
  try {
    return new URL('./appwrite.json', self.registration?.scope || self.location.href).href;
  } catch (_) {
    return null;
  }
})();

let _configPromise = null;

function loadConfig() {
  if (_configPromise) return _configPromise;
  _configPromise = (async () => {
    if (!CONFIG_URL) return {};
    try {
      const res = await fetch(CONFIG_URL, { cache: 'no-store' });
      if (!res.ok) return {};
      const spec = await res.json();
      const endpoint = spec.endpoint
        || (spec.functions || []).flatMap(fn => fn.vars || []).find(v => v && (v.name === 'APPWRITE_ENDPOINT' || v.name === 'NEXT_PUBLIC_APPWRITE_ENDPOINT'))?.value
        || '';
      const projectId = spec.projectId
        || (spec.functions || []).flatMap(fn => fn.vars || []).find(v => v && (v.name === 'APPWRITE_PROJECT_ID' || v.name === 'APPWRITE_PROJECT' || v.name === 'NEXT_PUBLIC_APPWRITE_PROJECT_ID'))?.value
        || '';
      return {
        endpoint,
        projectId,
        functionsBase: endpoint ? endpoint.replace(/\/$/, '') + '/functions' : '',
      };
    } catch (_) {
      return {};
    }
  })();
  return _configPromise;
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  // Skip cross-origin requests (Appwrite API, Firebase, CDN etc) — let browser handle them normally
  if (!e.request.url.startsWith(self.location.origin)) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

self.addEventListener('push', e => {
  e.waitUntil((async () => {
    try {
      const cfg = await loadConfig();
      const endpoint = cfg.endpoint || '';
      const projectId = cfg.projectId || '';
      if (!endpoint || !projectId) {
        console.warn('[SW] Missing Appwrite config, skipping subscription sync');
        return;
      }

      const payload = e.data ? e.data.json() : {
        title: 'JOAF',
        body: 'নতুন নোটিফিকেশন এসেছে',
        icon: '/logoc7c3.png',
        url: '/',
      };

      await self.registration.showNotification(payload.title || 'JOAF', {
        body: payload.body || '',
        icon: payload.icon || '/logoc7c3.png',
        data: { url: payload.url || '/' },
      });
    } catch (err) {
      console.error('[SW] push handling failed:', err);
    }
  })());
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification?.data?.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
    for (const client of clients) {
      if ('focus' in client) return client.focus();
    }
    return self.clients.openWindow(url);
  }));
});
