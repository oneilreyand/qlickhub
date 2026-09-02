import React, { useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { InAppNotification } from '@qlick/contracts';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import {
  markNotificationAsReadThunk,
  markAllNotificationsAsReadThunk,
  clearInAppNotificationsThunk,
} from '../../../store/uiSlice';
import { setSelectedTaskId } from '../../../store/taskSlice';
import { useDismissableLayer } from '../../../hooks/useDismissableLayer';
import { useFcmNotifications } from '../../../hooks/useFcmNotifications';
import { NotificationDropdown } from './NotificationDropdown';

interface NotificationBellProps {
  className?: string;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ className = '' }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const notificationRef = useRef<HTMLDivElement>(null);

  const activeWorkspaceId = useAppSelector((state) => state.workspace.activeWorkspaceId);
  const inAppNotifications = useAppSelector((state) => state.ui.inAppNotifications || []);
  const isNotificationsLoading = useAppSelector((state) => state.ui.isNotificationsLoading);

  const {
    permission: fcmPermission,
    isSupported: isFcmSupported,
    requestPermission: requestFcmPermission,
    isRegistering: isFcmRegistering,
  } = useFcmNotifications();

  useDismissableLayer(notificationRef, showNotifications, () => setShowNotifications(false));

  const unreadCount = inAppNotifications.filter((n) => !n.isRead).length;

  const handleNotificationClick = (notif: InAppNotification) => {
    dispatch(markNotificationAsReadThunk(notif.id));
    if (notif.taskId) {
      dispatch(setSelectedTaskId(notif.taskId));
      navigate('/my-tasks');
    }
    setShowNotifications(false);
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllNotificationsAsReadThunk(activeWorkspaceId || undefined));
  };

  const handleClearAll = () => {
    dispatch(clearInAppNotificationsThunk(activeWorkspaceId || undefined));
  };

  return (
    <div className={`relative ${className}`} ref={notificationRef}>
      <button
        onClick={() => setShowNotifications(!showNotifications)}
        aria-label="Notifications"
        className="relative grid h-10 w-10 place-items-center rounded-full border border-stone-200/90 bg-white text-stone-600 hover:bg-stone-100 transition-all dark:border-stone-800 dark:bg-stone-900 dark:text-stone-300"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#B1E743] px-1 text-[10px] font-extrabold text-[#141413] ring-2 ring-white dark:ring-stone-900">
            {unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <NotificationDropdown
          notifications={inAppNotifications}
          unreadCount={unreadCount}
          isLoading={isNotificationsLoading}
          isFcmSupported={isFcmSupported}
          fcmPermission={fcmPermission}
          isFcmRegistering={isFcmRegistering}
          onRequestFcmPermission={requestFcmPermission}
          onMarkAllAsRead={handleMarkAllAsRead}
          onClearAll={handleClearAll}
          onNotificationClick={handleNotificationClick}
          onClose={() => setShowNotifications(false)}
        />
      )}
    </div>
  );
};
