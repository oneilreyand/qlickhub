/* eslint-disable no-undef */
// Firebase Messaging Service Worker for Background Push Notifications

importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Initialize Firebase in Service Worker
const firebaseConfig = {
  apiKey: "AIzaSyCoAJIUv_ZT0Y5Rg-6sQyIGAHsHDq6K4uY",
  authDomain: "ndeks-fcm.firebaseapp.com",
  projectId: "ndeks-fcm",
  storageBucket: "ndeks-fcm.firebasestorage.app",
  messagingSenderId: "1071941827248",
  appId: "1:1071941827248:web:ed346c965e5e21aae45975",
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || payload.data?.title || 'QA Management System';
  const notificationOptions = {
    body: payload.notification?.body || payload.data?.body || 'Anda memiliki pemberitahuan baru.',
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click to open / focus window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const data = event.notification.data || {};
  let targetUrl = '/my-tasks';
  if (data.taskId) {
    targetUrl = `/work?tab=tasks&taskId=${data.taskId}`;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
