import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { selectCurrentUserRole } from '../../../store/authSlice';
import { fetchInAppNotifications, checkApproachingDeadlinesThunk } from '../../../store/uiSlice';
import { useRealtimeEvents } from '../../../hooks/useRealtimeEvents';

export function useNotifications(workspaceId?: string) {
  const dispatch = useAppDispatch();
  const currentUserRole = useAppSelector(selectCurrentUserRole);
  const inAppNotifications = useAppSelector((state) => state.ui.inAppNotifications || []);
  const unreadCount = useAppSelector((state) => state.ui.unreadNotificationCount);
  const isLoading = useAppSelector((state) => state.ui.isNotificationsLoading);

  // Connect SSE realtime event stream for notifications
  useRealtimeEvents({ workspaceId });

  useEffect(() => {
    const isAdminOrOwner = ['owner', 'admin'].includes((currentUserRole || '').toLowerCase());

    if (workspaceId) {
      dispatch(fetchInAppNotifications({ workspaceId }));
      if (isAdminOrOwner) {
        dispatch(checkApproachingDeadlinesThunk(workspaceId));
      }
    } else {
      dispatch(fetchInAppNotifications({}));
      if (isAdminOrOwner) {
        dispatch(checkApproachingDeadlinesThunk(undefined));
      }
    }

    // Periodic fallback sync every 15s to guarantee fresh notification counts
    const interval = setInterval(() => {
      if (workspaceId) {
        dispatch(fetchInAppNotifications({ workspaceId }));
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [dispatch, workspaceId, currentUserRole]);

  return {
    notifications: inAppNotifications,
    unreadCount,
    isLoading,
  };
}
