import { apiClient } from './apiClient';
import {
  RegisterFcmTokenInput,
  UnregisterFcmTokenInput,
  FcmTokenResponse,
  InAppNotification,
  ListNotificationsResponse,
} from '@qlick/contracts';

export const notificationService = {
  /**
   * Fetches the user's notifications and unread count.
   */
  async listNotifications(query?: {
    workspaceId?: string;
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ListNotificationsResponse> {
    const params = new URLSearchParams();
    if (query?.workspaceId) params.set('workspaceId', query.workspaceId);
    if (query?.unreadOnly !== undefined) params.set('unreadOnly', String(query.unreadOnly));
    if (query?.limit) params.set('limit', String(query.limit));
    if (query?.offset) params.set('offset', String(query.offset));

    const qs = params.toString();
    const endpoint = `/notifications${qs ? `?${qs}` : ''}`;
    const res = await apiClient<{ data: ListNotificationsResponse }>(endpoint);
    return res.data;
  },

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(id: string): Promise<InAppNotification> {
    const res = await apiClient<{ data: InAppNotification }>(`/notifications/${id}/read`, {
      method: 'PATCH',
    });
    return res.data;
  },

  /**
   * Marks all unread notifications as read.
   */
  async markAllAsRead(workspaceId?: string): Promise<{ success: boolean; updatedCount: number }> {
    const res = await apiClient<{ data: { success: boolean; updatedCount: number } }>(
      '/notifications/read-all',
      {
        method: 'POST',
        body: JSON.stringify({ workspaceId }),
      },
    );
    return res.data;
  },

  /**
   * Deletes a single notification.
   */
  async deleteNotification(id: string): Promise<{ success: boolean }> {
    const res = await apiClient<{ data: { success: boolean } }>(`/notifications/${id}`, {
      method: 'DELETE',
    });
    return res.data;
  },

  /**
   * Clears all notifications for the user.
   */
  async clearAllNotifications(
    workspaceId?: string,
  ): Promise<{ success: boolean; deletedCount: number }> {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
    const res = await apiClient<{ data: { success: boolean; deletedCount: number } }>(
      `/notifications${params}`,
      {
        method: 'DELETE',
      },
    );
    return res.data;
  },

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
   * Triggers an approaching deadlines scan across tasks in the workspace.
   */
  async checkApproachingDeadlines(
    workspaceId?: string,
  ): Promise<{ success: boolean; dispatchedCount: number; checkedTasksCount: number }> {
    const params = workspaceId ? `?workspaceId=${workspaceId}` : '';
    const res = await apiClient<{
      data: { success: boolean; dispatchedCount: number; checkedTasksCount: number };
    }>(`/notifications/check-deadlines${params}`, {
      method: 'POST',
    });
    return res.data;
  },
};
