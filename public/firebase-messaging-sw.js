// Firebase Cloud Messaging Service Worker for background notifications
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyAGYut7q3nCW-qSDPSldGSbxAjnna_-bvo",
  authDomain: "auto-parts-market-place-20312.firebaseapp.com",
  projectId: "auto-parts-market-place-20312",
  storageBucket: "auto-parts-market-place-20312.firebasestorage.app",
  messagingSenderId: "751764116522",
  appId: "1:751764116522:web:c7eb06038e6a85337adf53"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Background message received:', payload);
  const title = payload.notification?.title || payload.data?.title || 'Auto Parts India';
  const body = payload.notification?.body || payload.data?.body || 'You have a new notification';
  
  const notificationOptions = {
    body: body,
    icon: '/notification-icon.png',
    data: payload.data
  };

  self.registration.showNotification(title, notificationOptions);
});
