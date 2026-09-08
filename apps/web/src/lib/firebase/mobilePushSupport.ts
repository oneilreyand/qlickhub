import type { FirebaseOptions } from 'firebase/app';

export function isIosLikeDevice(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  platform = typeof navigator !== 'undefined' ? navigator.platform : '',
  maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
): boolean {
  return /iPad|iPhone|iPod/i.test(userAgent) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

export function isStandaloneWebApp(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };
  return (
    navigatorWithStandalone.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  );
}

export function requiresIosHomeScreenInstall(): boolean {
  return isIosLikeDevice() && !isStandaloneWebApp();
}

export function getMissingFirebaseWebPushConfig(
  config: FirebaseOptions,
  vapidKey: string | undefined,
): string[] {
  const requiredConfig: Array<keyof FirebaseOptions> = [
    'apiKey',
    'authDomain',
    'projectId',
    'messagingSenderId',
    'appId',
  ];
  const missing = requiredConfig
    .filter((key) => !config[key])
    .map(
      (key) =>
        `VITE_FIREBASE_${String(key)
          .replace(/([A-Z])/g, '_$1')
          .toUpperCase()}`,
    );

  if (!vapidKey) missing.push('VITE_FIREBASE_VAPID_KEY');
  return missing;
}

export function buildFirebaseMessagingServiceWorkerUrl(config: FirebaseOptions): string {
  const params = new URLSearchParams();
  const publicConfigEntries: Array<[string, unknown]> = [
    ['apiKey', config.apiKey],
    ['authDomain', config.authDomain],
    ['projectId', config.projectId],
    ['storageBucket', config.storageBucket],
    ['messagingSenderId', config.messagingSenderId],
    ['appId', config.appId],
    ['measurementId', config.measurementId],
  ];

  for (const [key, value] of publicConfigEntries) {
    if (typeof value === 'string' && value) params.set(key, value);
  }

  return `/firebase-messaging-sw.js?${params.toString()}`;
}
