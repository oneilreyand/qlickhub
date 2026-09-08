/* eslint-disable no-undef */
// Firebase Messaging Service Worker for background Web Push notifications.
// The public Firebase config is encoded in the registered script URL so the
// worker can initialise again after Chrome or iOS restarts its process.

const serviceWorkerUrl = new URL(self.location.href);
const firebaseConfig = Object.fromEntries(
  [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId',
    'measurementId',
  ]
    .map((key) => [key, serviceWorkerUrl.searchParams.get(key)])
    .filter(([, value]) => Boolean(value)),
);

const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'];
const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key]);

if (missingKeys.length === 0) {
  importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-app-compat.js');
  importScripts('https://www.gstatic.com/firebasejs/12.17.1/firebase-messaging-compat.js');

  firebase.initializeApp(firebaseConfig);
  firebase.messaging();
} else {
  console.error(`[FCM worker] Missing public Firebase config: ${missingKeys.join(', ')}`);
}

// Notification payloads are displayed by Firebase itself. The backend-provided
// webpush.fcmOptions.link controls the destination when the notification is tapped.
