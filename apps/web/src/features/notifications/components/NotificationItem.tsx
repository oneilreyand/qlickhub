import React from 'react';
import {
  Bell,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Clock,
  Bug,
  AlertTriangle,
  CheckCheck,
  Rocket,
  XCircle,
  Users,
} from 'lucide-react';
import type { InAppNotification } from '@qlick/contracts';

interface NotificationItemProps {
  notification: InAppNotification;
  onClick: (notif: InAppNotification) => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification: notif,
  onClick,
}) => {
  return (
    <div
      onClick={() => onClick(notif)}
      className={`p-2.5 rounded-xl border text-left cursor-pointer transition-all flex items-start gap-2.5 ${
        !notif.isRead
          ? 'border-[#B1E743]/50 bg-[#B1E743]/10 dark:border-[#B1E743]/40 dark:bg-stone-800/80 shadow-xs'
          : 'border-transparent hover:border-stone-200 hover:bg-stone-50/50 dark:hover:border-stone-800 dark:hover:bg-stone-800/40 text-stone-600 dark:text-stone-400'
      }`}
    >
      {/* Type Icon */}
      <div className="mt-0.5 shrink-0">
        {notif.type === 'mention' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'status_change' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <ShieldCheck className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'assignment' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <UserCheck className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'deadline' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
            <Clock className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'system' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
            <Bell className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'bug_created' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            <Bug className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'bug_status_change' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
            <Bug className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'bug_critical' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 animate-pulse">
            <AlertTriangle className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'qa_signoff' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCheck className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'release_decision' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
            <Rocket className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'test_failed' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
            <XCircle className="h-3.5 w-3.5" />
          </div>
        )}
        {notif.type === 'workspace_membership' && (
          <div className="grid h-7 w-7 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
            <Users className="h-3.5 w-3.5" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-0.5">
        <div className="flex items-center justify-between gap-1">
          <p className="text-xs font-bold text-stone-900 dark:text-stone-100 truncate">
            {notif.title}
          </p>
          <span className="text-[10px] text-stone-400 shrink-0">
            {new Date(notif.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </span>
        </div>
        <p className="text-[11px] text-stone-600 dark:text-stone-300 line-clamp-2 leading-relaxed">
          {notif.message}
        </p>
        {notif.actorName && (
          <p className="text-[10px] font-semibold text-stone-400 dark:text-stone-500">
            From: {notif.actorName}
          </p>
        )}
      </div>

      {!notif.isRead && <span className="mt-1.5 h-2 w-2 rounded-full bg-[#B1E743] shrink-0" />}
    </div>
  );
};
