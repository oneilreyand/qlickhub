import { deleteToken, getToken } from 'firebase/messaging';
import { firebaseConfig, firebaseVapidKey, getMessagingInstance } from '../../config/firebase';
import { notificationService } from '../api/notificationService';
import {
  buildFirebaseMessagingServiceWorkerUrl,
  getMissingFirebaseWebPushConfig,
} from './mobilePushSupport';

export interface FcmDeviceRegistration {
  token: string;
  deviceInfo: string;
}

function assertWebPushConfiguration(): void {
  const missing = getMissingFirebaseWebPushConfig(firebaseConfig, firebaseVapidKey);
  if (missing.length > 0) {
    throw new Error(`Konfigurasi Web Push belum lengkap: ${missing.join(', ')}`);
  }
}

function buildDeviceInfo(): string {
  const platform = navigator.platform || 'Web';
  return `${platform} - ${navigator.userAgent.slice(0, 100)}`;
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const serviceWorkerUrl = buildFirebaseMessagingServiceWorkerUrl(firebaseConfig);
  const registration = await navigator.serviceWorker.register(serviceWorkerUrl, { scope: '/' });
  await navigator.serviceWorker.ready;
  return registration;
}

export async function registerCurrentFcmDevice(): Promise<FcmDeviceRegistration> {
  assertWebPushConfiguration();

  const messaging = await getMessagingInstance();
  if (!messaging) throw new Error('Firebase Messaging tidak didukung pada browser ini.');

  const serviceWorkerRegistration = await getServiceWorkerRegistration();
  const token = await getToken(messaging, {
    serviceWorkerRegistration,
    vapidKey: firebaseVapidKey,
  });

  if (!token) throw new Error('Browser tidak menghasilkan token Web Push.');

  const deviceInfo = buildDeviceInfo();
  const response = await notificationService.registerFcmToken({ token, deviceInfo });
  if (!response.success) throw new Error(response.message || 'Token Web Push gagal didaftarkan.');

  return { token, deviceInfo };
}

export async function unregisterCurrentFcmDevice(): Promise<void> {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    typeof Notification === 'undefined' ||
    Notification.permission !== 'granted'
  ) {
    return;
  }

  const missing = getMissingFirebaseWebPushConfig(firebaseConfig, firebaseVapidKey);
  if (missing.length > 0) return;

  const messaging = await getMessagingInstance();
  if (!messaging) return;

  const serviceWorkerRegistration = await navigator.serviceWorker.getRegistration('/');
  if (!serviceWorkerRegistration) return;

  const token = await getToken(messaging, {
    serviceWorkerRegistration,
    vapidKey: firebaseVapidKey,
  });

  if (token) {
    try {
      await notificationService.unregisterFcmToken({ token });
    } finally {
      await deleteToken(messaging);
    }
  }
}
