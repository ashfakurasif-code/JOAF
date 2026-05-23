importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:'AIzaSyDBbm1eiqatwEUQenPIEAEFSubTJTUTdZk',
  authDomain:'joaf-app-45753.firebaseapp.com',
  projectId:'joaf-app-45753',
  storageBucket:'joaf-app-45753.firebasestorage.app',
  messagingSenderId:'472362223214',
  appId:'1:472362223214:web:9186a4f90dc608bae4487f'
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload){
  const{title,body,icon,url}=payload.notification||payload.data||{};
  self.registration.showNotification(title||'JOAF', {
    body: body||'',
    icon: icon||'/logoc7c3.png',
    badge: '/logoc7c3.png',
    data: {url: url||'/'},
    vibrate:[200,100,200]
  });
});

self.addEventListener('notificationclick', e=>{
  e.notification.close();
  const url=e.notification.data?.url||'/';
  e.waitUntil(clients.openWindow(url));
});
