/// <reference types="vite/client" />

import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported as isAnalyticsSupported, Analytics } from "firebase/analytics";
import { getMessaging, isSupported as isMessagingSupported, Messaging } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyCoAJIUv_ZT0Y5Rg-6sQyIGAHsHDq6K4uY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "ndeks-fcm.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "ndeks-fcm",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "ndeks-fcm.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1071941827248",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:1071941827248:web:ed346c965e5e21aae45975",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MYHJBBWDG9",
};

// Inisialisasi Firebase App
export const app: FirebaseApp = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Inisialisasi Analytics secara aman
export let analytics: Analytics | null = null;
if (typeof window !== "undefined") {
  isAnalyticsSupported().then((supported: boolean) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {});
}

// Inisialisasi Messaging (FCM)
export let messaging: Messaging | null = null;
export async function getMessagingInstance(): Promise<Messaging | null> {
  if (messaging) return messaging;
  if (typeof window === "undefined") return null;

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

if (typeof window !== "undefined") {
  getMessagingInstance().catch(() => {});
}