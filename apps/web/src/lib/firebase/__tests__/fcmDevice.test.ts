import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  deleteToken: vi.fn(),
  getToken: vi.fn(),
  getMessagingInstance: vi.fn(),
  registerFcmToken: vi.fn(),
  unregisterFcmToken: vi.fn(),
}));

vi.mock('firebase/messaging', () => ({
  deleteToken: mocks.deleteToken,
  getToken: mocks.getToken,
}));

vi.mock('../../../config/firebase', () => ({
  firebaseConfig: {
    apiKey: 'api-key',
    authDomain: 'qlick.test',
    projectId: 'qlick-mobile',
    storageBucket: 'qlick.test',
    messagingSenderId: '123',
    appId: 'web:456',
  },
  firebaseVapidKey: 'public-vapid-key',
  getMessagingInstance: mocks.getMessagingInstance,
}));

vi.mock('../../api/notificationService', () => ({
  notificationService: {
    registerFcmToken: mocks.registerFcmToken,
    unregisterFcmToken: mocks.unregisterFcmToken,
  },
}));

import { registerCurrentFcmDevice, unregisterCurrentFcmDevice } from '../fcmDevice';

describe('FCM device lifecycle', () => {
  const serviceWorkerRegistration = {} as ServiceWorkerRegistration;
  const messaging = { app: 'messaging' };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'isSecureContext', { configurable: true, value: true });
    Object.defineProperty(globalThis, 'Notification', {
      configurable: true,
      value: { permission: 'granted' },
    });
    Object.defineProperty(navigator, 'serviceWorker', {
      configurable: true,
      value: {
        register: vi.fn().mockResolvedValue(serviceWorkerRegistration),
        getRegistration: vi.fn().mockResolvedValue(serviceWorkerRegistration),
        ready: Promise.resolve(serviceWorkerRegistration),
      },
    });
    Object.defineProperty(navigator, 'platform', { configurable: true, value: 'Android' });
    Object.defineProperty(navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Linux; Android 15) Chrome/140',
    });
    mocks.getMessagingInstance.mockResolvedValue(messaging);
    mocks.getToken.mockResolvedValue('mobile-fcm-token');
    mocks.registerFcmToken.mockResolvedValue({ success: true, message: 'registered' });
    mocks.unregisterFcmToken.mockResolvedValue({ success: true, message: 'removed' });
    mocks.deleteToken.mockResolvedValue(true);
  });

  it('becomes registered only after Firebase and the authenticated backend succeed', async () => {
    const result = await registerCurrentFcmDevice();

    expect(navigator.serviceWorker.register).toHaveBeenCalledWith(
      expect.stringMatching(/^\/firebase-messaging-sw\.js\?/),
      { scope: '/' },
    );
    expect(mocks.getToken).toHaveBeenCalledWith(messaging, {
      serviceWorkerRegistration,
      vapidKey: 'public-vapid-key',
    });
    expect(mocks.registerFcmToken).toHaveBeenCalledWith({
      token: 'mobile-fcm-token',
      deviceInfo: expect.stringContaining('Android'),
    });
    expect(result.token).toBe('mobile-fcm-token');
  });

  it('rejects activation when backend token registration fails', async () => {
    mocks.registerFcmToken.mockRejectedValueOnce(new Error('backend unavailable'));

    await expect(registerCurrentFcmDevice()).rejects.toThrow('backend unavailable');
  });

  it('unregisters this device and deletes its Firebase token during logout', async () => {
    await unregisterCurrentFcmDevice();

    expect(mocks.unregisterFcmToken).toHaveBeenCalledWith({ token: 'mobile-fcm-token' });
    expect(mocks.deleteToken).toHaveBeenCalledWith(messaging);
  });
});
