import React, { useState, useMemo } from 'react';
import { Bell, CheckCheck, Trash2, Sparkles, Loader2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { InAppNotification } from '@qlick/contracts';
import { NotificationItem } from './NotificationItem';

interface NotificationDropdownProps {
  notifications: InAppNotification[];
  unreadCount: number;
  isLoading: boolean;
  isFcmSupported: boolean;
  fcmPermission: NotificationPermission | 'default';
  isFcmRegistering: boolean;
  onRequestFcmPermission: () => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onNotificationClick: (notif: InAppNotification) => void;
  onClose: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
  notifications,
  unreadCount,
  isLoading,
  isFcmSupported,
  fcmPermission,
  isFcmRegistering,
  onRequestFcmPermission,
  onMarkAllAsRead,
  onClearAll,
  onNotificationClick,
  onClose,
}) => {
  const navigate = useNavigate();
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'mentions' | 'deadlines'>(
    'all',
  );

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (notifFilter === 'unread') return !n.isRead;
      if (notifFilter === 'mentions') return n.type === 'mention' || n.type === 'discussion';
      if (notifFilter === 'deadlines') return n.type === 'deadline';
      return true;
    });
  }, [notifications, notifFilter]);

  return (
    <div className="absolute right-0 mt-2 w-88 sm:w-96 rounded-2xl border border-stone-200 bg-white p-4 shadow-2xl ring-1 ring-stone-900/5 z-30 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100">
      {/* Header Bar */}
      <div className="flex items-center justify-between border-b border-stone-100 pb-3 dark:border-stone-800">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-stone-900 dark:text-stone-100">
            Team Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="rounded-full bg-[#B1E743] px-2 py-0.5 text-[11px] font-extrabold text-[#141413]">
              {unreadCount} New
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllAsRead}
              className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:hover:text-stone-200 dark:hover:bg-stone-800 text-[11px] font-semibold flex items-center gap-1"
              title="Mark all as read"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Read all</span>
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="p-1 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-[11px]"
              title="Clear all notifications"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1 pt-2 pb-1 border-b border-stone-100 dark:border-stone-800 overflow-x-auto scrollbar-none">
        {[
          { id: 'all', label: `All (${notifications.length})` },
          { id: 'unread', label: `Unread (${unreadCount})` },
          { id: 'mentions', label: 'Mentions' },
          { id: 'deadlines', label: 'Deadlines' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setNotifFilter(tab.id as typeof notifFilter)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all shrink-0 ${
              notifFilter === tab.id
                ? 'bg-[#B1E743] text-[#141413] font-bold dark:bg-[#B1E743] dark:text-[#141413]'
                : 'text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-stone-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* FCM Push Notification Status / Prompt Banner */}
      {isFcmSupported && fcmPermission !== 'granted' && (
        <div className="my-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between gap-2 dark:bg-amber-950/40 dark:border-amber-800/60 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-[11px] font-medium leading-tight">
              Aktifkan notifikasi FCM untuk update tugas real-time.
            </span>
          </div>
          <button
            type="button"
            onClick={onRequestFcmPermission}
            disabled={isFcmRegistering}
            className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] shrink-0 transition-colors dark:bg-amber-500 dark:text-stone-900"
          >
            {isFcmRegistering ? 'Memproses...' : 'Izinkan'}
          </button>
        </div>
      )}

      {isFcmSupported && fcmPermission === 'granted' && (
        <div className="flex items-center px-1 py-1.5 border-b border-stone-100 dark:border-stone-800 text-[10px]">
          <span className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            FCM Push Aktif
          </span>
        </div>
      )}

      {/* Notification List */}
      <div className="mt-2 max-h-80 overflow-y-auto space-y-1.5 scrollbar-thin">
        {isLoading && notifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 space-y-2">
            <Loader2 className="mx-auto h-5 w-5 animate-spin text-stone-400" />
            <p className="text-[11px]">Memuat notifikasi...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-stone-400 space-y-1">
            <Sparkles className="mx-auto h-6 w-6 text-stone-300 dark:text-stone-600" />
            <p className="font-semibold text-stone-600 dark:text-stone-300">All caught up!</p>
            <p className="text-[11px]">No notifications in this filter.</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => (
            <NotificationItem key={notif.id} notification={notif} onClick={onNotificationClick} />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800 flex justify-between items-center text-[11px]">
        <button
          type="button"
          onClick={() => {
            navigate('/my-tasks');
            onClose();
          }}
          className="font-bold text-stone-700 hover:text-stone-950 dark:text-[#B1E743] dark:hover:text-[#B1E743]/80 flex items-center gap-1"
        >
          <span>Open My Tasks</span>
          <ExternalLink className="h-3 w-3" />
        </button>
        <span className="text-stone-400">Collaborative Hub</span>
      </div>
    </div>
  );
};
