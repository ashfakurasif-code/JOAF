// JOAF Service Worker v2.0
const CACHE = 'joaf-v2';
const OFFLINE_URL = '/offline.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/css/joaf.css',
  '/js/data.js',
  '/js/components.js',
  '/logoc7c3.png',
  '/offline.html'
];

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
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Push Notification ──────────────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data.json(); } catch(err) { data = { title: 'JOAF সতর্কতা', body: e.data ? e.data.text() : '' }; }

  const title = data.title || '🚨 JOAF জরুরি সতর্কতা';
  const options = {
    body: data.body || 'নতুন সতর্কতা এসেছে',
    icon: '/logoc7c3.png',
    badge: '/logoc7c3.png',
    image: data.image || null,
    data: { url: data.url || '/alert.html' },
    vibrate: [200, 100, 200],
    requireInteraction: true,
    actions: [
      { action: 'view', title: '👁️ দেখুন' },
      { action: 'close', title: '✕ বন্ধ করুন' }
    ]
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/alert.html';
  if (e.action === 'close') return;
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const c = cls.find(c => c.url.includes(url));
      if (c) return c.focus();
      return clients.openWindow(url);
    })
  );
});
