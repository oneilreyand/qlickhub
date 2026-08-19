import React from 'react';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  Calendar,
} from 'lucide-react';
import type { ScheduleHealthStatus } from '../../../lib/utils/scheduleHealth';

export interface TaskScheduleHealthBadgeProps {
  status: ScheduleHealthStatus;
  label?: string;
  role?: 'po' | 'backend' | 'frontend' | 'qa';
  compact?: boolean;
  tooltipContent?: string;
  className?: string;
}

export const TaskScheduleHealthBadge: React.FC<TaskScheduleHealthBadgeProps> = ({
  status,
  label,
  role,
  compact = false,
  tooltipContent,
  className = '',
}) => {
  const rolePrefix = role
    ? role === 'po'
      ? 'PO: '
      : role === 'backend'
      ? 'BE: '
      : role === 'frontend'
      ? 'FE: '
      : 'QA: '
    : '';

  switch (status) {
    case 'completed':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 shadow-xs ${className}`}
          title={tooltipContent || 'Task schedule completed on time'}
        >
          <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          {!compact && <span>{label || 'Done'}</span>}
        </span>
      );

    case 'delayed':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-800 shrink-0 shadow-xs animate-pulse ${className}`}
          title={tooltipContent || 'Task schedule is delayed / past due date'}
        >
          <AlertCircle className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />
          {!compact && <span>{rolePrefix}{label || 'Delayed'}</span>}
        </span>
      );

    case 'at_risk':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0 shadow-xs ${className}`}
          title={tooltipContent || 'Task schedule is at risk (due soon or changes requested)'}
        >
          <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400 shrink-0" />
          {!compact && <span>{rolePrefix}{label || 'At Risk'}</span>}
        </span>
      );

    case 'on_track':
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0 shadow-xs ${className}`}
          title={tooltipContent || 'Task is on track according to the planned schedule'}
        >
          <Clock className="h-3 w-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
          {!compact && <span>{rolePrefix}{label || 'On Track'}</span>}
        </span>
      );

    case 'unscheduled':
    default:
      return (
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-stone-100 text-stone-600 dark:bg-stone-800/80 dark:text-stone-400 border border-stone-200 dark:border-stone-700 shrink-0 ${className}`}
          title={tooltipContent || 'No schedule / due date set'}
        >
          <Calendar className="h-3 w-3 text-stone-400 shrink-0" />
          {!compact && <span>{label || 'Unscheduled'}</span>}
        </span>
      );
  }
};
