import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  buildFirebaseMessagingServiceWorkerUrl,
  getMissingFirebaseWebPushConfig,
  isIosLikeDevice,
  isStandaloneWebApp,
} from '../mobilePushSupport';

describe('mobile Web Push support', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('detects iPhone and touch-enabled iPad desktop user agents', () => {
    expect(isIosLikeDevice('Mozilla/5.0 (iPhone)', 'iPhone', 5)).toBe(true);
    expect(isIosLikeDevice('Mozilla/5.0 (Macintosh)', 'MacIntel', 5)).toBe(true);
    expect(isIosLikeDevice('Mozilla/5.0 (Linux; Android 15)', 'Linux armv8l', 5)).toBe(false);
  });

  it('recognises standalone Home Screen display mode', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: true } as MediaQueryList);
    expect(isStandaloneWebApp()).toBe(true);
  });

  it('requires the public VAPID key as part of Web Push configuration', () => {
    expect(
      getMissingFirebaseWebPushConfig(
        {
          apiKey: 'api-key',
          authDomain: 'qlick.test',
          projectId: 'qlick',
          messagingSenderId: 'sender',
          appId: 'app',
        },
        undefined,
      ),
    ).toEqual(['VITE_FIREBASE_VAPID_KEY']);
  });

  it('builds a restart-safe root worker URL from browser-public Firebase config', () => {
    const workerUrl = buildFirebaseMessagingServiceWorkerUrl({
      apiKey: 'api key',
      authDomain: 'qlick.test',
      projectId: 'qlick-mobile',
      storageBucket: 'qlick.test',
      messagingSenderId: '123',
      appId: 'web:456',
    });

    expect(workerUrl).toMatch(/^\/firebase-messaging-sw\.js\?/);
    expect(workerUrl).toContain('apiKey=api+key');
    expect(workerUrl).toContain('projectId=qlick-mobile');
  });
});
