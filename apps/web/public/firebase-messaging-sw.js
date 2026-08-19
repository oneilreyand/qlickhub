/* eslint-disable no-undef */
// Firebase Messaging Service Worker for Background Push Notifications
// Firebase config is sent to this SW via a postMessage from the main thread
// (see useFcmNotifications.ts → registerToken) to avoid hardcoding secrets here.

importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js');

let messaging = null;

/**
 * Receives Firebase config from the main thread and initialises the app.
 * This avoids hardcoding credentials in a publicly-served file.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    const firebaseConfig = event.data.config;
    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    messaging = firebase.messaging();

    // Handle background messages once messaging is ready
    messaging.onBackgroundMessage((payload) => {
      const notificationTitle =
        payload.notification?.title || payload.data?.title || 'Qlick Hub';
      const notificationOptions = {
        body: payload.notification?.body || payload.data?.body || 'Anda memiliki pemberitahuan baru.',
        icon: '/favicon.svg',
        badge: '/favicon.svg',
        data: payload.data || {},
      };
      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
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

