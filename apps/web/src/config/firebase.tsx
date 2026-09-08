/// <reference types="vite/client" />

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from 'firebase/analytics';
import { getMessaging, isSupported as isMessagingSupported, Messaging } from 'firebase/messaging';

// All Firebase configuration MUST come from environment variables.
// Never add hardcoded fallback values here — use .env.local in development
// and inject secrets via your CI/CD pipeline in production.
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Public Web Push credential generated in Firebase Console. This is safe to expose
// to the browser; the Firebase service-account credential remains backend-only.
export const firebaseVapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;

// Validate required Firebase config in development to catch misconfiguration early
if (import.meta.env.DEV) {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'messagingSenderId', 'appId'] as const;
  const missing = requiredKeys
    .filter((key) => !firebaseConfig[key])
    .map((key) => `VITE_FIREBASE_${key.replace(/([A-Z])/g, '_$1').toUpperCase()}`);
  if (missing.length > 0) {
    console.warn(
      `[Firebase] Missing required env vars: ${missing.join(', ')}.\n` +
        'Copy .env.example to .env.local and fill in your Firebase project credentials.',
    );
  }
}

// Inisialisasi Firebase App
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Analytics secara aman
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isAnalyticsSupported()
    .then((supported: boolean) => {
      if (supported) {
        analytics = getAnalytics(app);
      }
    })
    .catch(() => {});
}

// Inisialisasi Messaging (FCM)
export let messaging: Messaging | null = null;
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messaging) return messaging;
  if (typeof window === 'undefined') return null;

  try {
    const supported = await isMessagingSupported();
    if (supported) {
      messaging = getMessaging(app);
      return messaging;
    }
  } catch {
    // Messaging not supported in current environment
  }
  return null;
}

if (typeof window !== 'undefined') {
  getMessagingInstance().catch(() => {});
}
