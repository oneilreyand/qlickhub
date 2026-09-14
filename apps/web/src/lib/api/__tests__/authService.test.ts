import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiClient: vi.fn(),
  clearSessionScopedData: vi.fn(),
  unregisterCurrentFcmDevice: vi.fn(),
}));

vi.mock('../apiClient', () => ({ apiClient: mocks.apiClient }));
vi.mock('../../storage/browserStorage', () => ({
  clearSessionScopedData: mocks.clearSessionScopedData,
}));
vi.mock('../../firebase/fcmDevice', () => ({
  unregisterCurrentFcmDevice: mocks.unregisterCurrentFcmDevice,
}));

import { authService } from '../authService';

describe('authService logout Web Push cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/login');
    mocks.unregisterCurrentFcmDevice.mockResolvedValue(undefined);
    mocks.apiClient.mockResolvedValue({ data: {} });
  });

  it('unregisters the current device before revoking the authenticated session', async () => {
    await authService.logout();

    expect(mocks.unregisterCurrentFcmDevice).toHaveBeenCalledOnce();
    expect(mocks.apiClient).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
    expect(mocks.unregisterCurrentFcmDevice.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.apiClient.mock.invocationCallOrder[0],
    );
    expect(mocks.clearSessionScopedData).toHaveBeenCalledOnce();
  });

  it('still logs out when Firebase cleanup is unavailable', async () => {
    mocks.unregisterCurrentFcmDevice.mockRejectedValueOnce(new Error('Firebase unavailable'));

    await expect(authService.logout()).resolves.toBeUndefined();
    expect(mocks.apiClient).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
    expect(mocks.clearSessionScopedData).toHaveBeenCalledOnce();
  });

  it('supports custom redirectTo target during logout', async () => {
    window.history.replaceState({}, '', '/login?reason=idle_timeout');
    await expect(authService.logout('/login?reason=idle_timeout')).resolves.toBeUndefined();
    expect(mocks.apiClient).toHaveBeenCalledWith('/auth/logout', { method: 'POST' });
    expect(mocks.clearSessionScopedData).toHaveBeenCalledOnce();
  });
});
