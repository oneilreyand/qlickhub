import { apiClient } from './apiClient';
import { RegisterFcmTokenInput, UnregisterFcmTokenInput, FcmTokenResponse } from '@qa/contracts';

export const notificationService = {
  /**
   * Registers or updates an active FCM device token for the authenticated user.
   */
  async registerFcmToken(input: RegisterFcmTokenInput): Promise<FcmTokenResponse> {
    const res = await apiClient<{ data: FcmTokenResponse }>('/notifications/fcm-token', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  /**
   * Unregisters an FCM device token when logging out or revoking notification permissions.
   */
  async unregisterFcmToken(input: UnregisterFcmTokenInput): Promise<FcmTokenResponse> {
    const res = await apiClient<{ data: FcmTokenResponse }>('/notifications/fcm-token', {
      method: 'DELETE',
      body: JSON.stringify(input),
    });
    return res.data;
  },

  /**
   * Sends a test notification to the authenticated user's active device tokens.
   */
  async sendTestNotification(): Promise<FcmTokenResponse> {
    const res = await apiClient<{ data: FcmTokenResponse }>('/notifications/test', {
      method: 'POST',
    });
    return res.data;
  },
};
