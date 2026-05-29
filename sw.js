// JOAF Service Worker v3.1
// ⚠️ নতুন deploy দিলে CACHE version বাড়াও: joaf-v10 → joaf-v11
const CACHE = 'joaf-v10';
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
    e.respondWith(fetch(e.request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});

// ── Push Notification ──────────────────────────────────────
self.addEventListener('push', e => {
  let data = {};
  try { data = e.data.json(); } catch(err) {
    data = { title: '🔥 JOAF', body: e.data ? e.data.text() : 'নতুন আপডেট' };
  }

  const title = data.title || '🔥 JOAF সংবাদ';
  const options = {
    body: data.body || 'নতুন আপডেট এসেছে — এখনই দেখুন',
    icon: '/logoc7c3.png',
    badge: '/logoc7c3.png',
    image: data.image || null,
    data: { url: data.url || '/' },
    vibrate: [200, 100, 200, 100, 200],
    requireInteraction: data.type === 'breaking' || data.type === 'blood',
    tag: data.tag || 'joaf-notif',
    renotify: true,
    actions: [
      { action: 'view',  title: '👁️ দেখুন' },
      { action: 'close', title: '✕ বন্ধ করুন' }
    ]
  };

  e.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  if (e.action === 'close') return;

  const url = (e.notification.data && e.notification.data.url) || '/';
  const fullUrl = self.location.origin + url;

  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cls => {
      const existing = cls.find(c => c.url === fullUrl || c.url.startsWith(fullUrl));
      if (existing) {
        existing.focus();
        return existing.navigate ? existing.navigate(fullUrl) : existing.focus();
      }
      return clients.openWindow(fullUrl);
    })
  );
});

// ── Background Sync (push subscription save) ──────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-subscription') {
    e.waitUntil(syncSubscription());
  }
});

async function syncSubscription() {
  try {
    const sub = await self.registration.pushManager.getSubscription();
    if (!sub) return;

    // TASK 3: Send a properly-structured payload so save-subscription.js can
    // validate keys and build a canonical clean subscription.
    // The raw PushSubscription object is also accepted by the server (dual-shape
    // handling), but wrapping it ensures district and deviceInfo slots are present
    // and that the payload is identical to what components.js sends.
    const payload = {
      subscription: sub.toJSON(),   // serialises endpoint + keys cleanly
      district: '',                  // district unknown in SW context
      deviceInfo: {
        userAgent: self.navigator ? self.navigator.userAgent.substring(0, 150) : 'sw-sync',
        savedAt: new Date().toISOString(),
      },
    };

    const res = await fetch('https://fra.cloud.appwrite.io/v1/functions/save-subscription/executions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => String(res.status));
      console.error('[SW] syncSubscription failed:', res.status, txt);
    } else {
      console.log('[SW] syncSubscription succeeded');
    }
  } catch(e) {
    console.error('[SW] syncSubscription error:', e);
  }
}
