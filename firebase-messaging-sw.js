/* JOAF Firebase Messaging Service Worker */
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  authDomain:'joaf-app-45753.firebaseapp.com',
  projectId:'joaf-app-45753',
  storageBucket:'joaf-app-45753.firebasestorage.app',
  messagingSenderId:'472362223214',
  appId:'1:472362223214:web:9186a4f90dc608bae4487f'
});

const messaging = firebase.messaging();

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

messaging.onBackgroundMessage((payload) => {
  const notification = payload.notification || {};
  const data = payload.data || {};

  self.registration.showNotification(notification.title || '🔥 JOAF', {
    body: notification.body || 'নতুন আপডেট এসেছে',
    icon: '/logoc7c3.png',
    badge: '/logoc7c3.png',
    data: {
      url: data.url || '/'
    }
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const hadWindow = clientsArr.find((windowClient) => windowClient.url.includes(targetUrl));
      if (hadWindow) {
        return hadWindow.focus();
      }

      return clients.openWindow(targetUrl);
    })
  );
});
