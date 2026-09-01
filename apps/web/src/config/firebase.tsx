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

export const hasFirebaseCredentials = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

let firebaseAppInstance: FirebaseApp | null = null;

export const getFirebaseApp = (): FirebaseApp | null => {
  if (firebaseAppInstance) return firebaseAppInstance;
  if (!hasFirebaseCredentials) return null;

  if (getApps().length > 0) {
    firebaseAppInstance = getApp();
  } else {
    firebaseAppInstance = initializeApp(firebaseConfig);
  }
  return firebaseAppInstance;
};

// Lazy export for app
export const app: FirebaseApp | null = hasFirebaseCredentials ? getFirebaseApp() : null;

// Inisialisasi Analytics secara aman
export let analytics: Analytics | null = null;
if (typeof window !== 'undefined' && hasFirebaseCredentials) {
  isAnalyticsSupported()
    .then((supported: boolean) => {
      const activeApp = getFirebaseApp();
      if (supported && activeApp) {
        analytics = getAnalytics(activeApp);
      }
    })
    .catch(() => {});
}

// Inisialisasi Messaging (FCM)
export let messaging: Messaging | null = null;
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messaging) return messaging;
  if (typeof window === 'undefined' || !hasFirebaseCredentials) return null;

  try {
    const supported = await isMessagingSupported();
    const activeApp = getFirebaseApp();
    if (supported && activeApp) {
      messaging = getMessaging(activeApp);
      return messaging;
    }
  } catch {
    // Messaging not supported in current environment
  }
  return null;
}
