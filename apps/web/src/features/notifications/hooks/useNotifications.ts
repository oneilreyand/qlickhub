import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { fetchInAppNotifications } from '../../../store/uiSlice';
import { useRealtimeEvents } from '../../../hooks/useRealtimeEvents';

export function useNotifications(workspaceId?: string) {
  const dispatch = useAppDispatch();
  const inAppNotifications = useAppSelector((state) => state.ui.inAppNotifications || []);
  const unreadCount = useAppSelector((state) => state.ui.unreadNotificationCount);
  const isLoading = useAppSelector((state) => state.ui.isNotificationsLoading);

  // Connect SSE realtime event stream for notifications
  useRealtimeEvents({ workspaceId });

  useEffect(() => {
    // Deadline reminders are created by the scheduled server job (ADR-040), not by the browser.
    dispatch(fetchInAppNotifications(workspaceId ? { workspaceId } : {}));

    // Periodic fallback sync every 15s to guarantee fresh notification counts
    const interval = setInterval(() => {
      if (workspaceId) {
        dispatch(fetchInAppNotifications({ workspaceId }));
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [dispatch, workspaceId]);

  return {
    notifications: inAppNotifications,
    unreadCount,
    isLoading,
  };
}
