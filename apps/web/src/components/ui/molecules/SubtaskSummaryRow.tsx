import React from 'react';
import {
  Code2,
  Layers,
  Bug,
  MessageSquare,
  Paperclip,
  FileText,
  Calendar,
  AlertCircle,
  User,
} from 'lucide-react';
import type { Task, TaskStatus, DeliveryArea } from '@qlick/contracts';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskScheduleHealthBadge } from './TaskScheduleHealthBadge';
import { Avatar } from '../atoms/Avatar';
import { calculateSubtaskScheduleHealth } from '../../../lib/utils/scheduleHealth';

export interface SubtaskSummaryRowProps {
  subtask: Task;
  assigneeName?: string;
  commentCount?: number;
  attachmentCount?: number;
  currentUserId?: string;
  currentUserRole?: string;
  onStatusChange?: (subtaskId: string, newStatus: TaskStatus) => void;
  canMutate?: boolean;
}

interface StatusOption {
  value: TaskStatus;
  label: string;
}

const ALL_STATUS_OPTIONS: StatusOption[] = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'changes_requested', label: 'Changes Requested' },
  { value: 'done', label: 'Done' },
  { value: 'canceled', label: 'Canceled' },
];

export function getAllowedSubtaskStatuses(
  subtask: Task,
  currentUserId?: string,
  currentUserRole?: string
): StatusOption[] {
  const isPlanner = Boolean(currentUserRole && ['owner', 'admin', 'po'].includes(currentUserRole));
  const isAssignee = Boolean(currentUserId && subtask.assigneeId === currentUserId);
  const isQaReviewer = currentUserRole === 'qa' && subtask.deliveryArea !== 'qa';

  // Planner: full management (excluding self-approval if assigned, unless owner)
  if (isPlanner) {
    if (subtask.status === 'in_review' && isAssignee && currentUserRole !== 'owner') {
      return ALL_STATUS_OPTIONS.filter((opt) => opt.value !== 'done');
    }
    return ALL_STATUS_OPTIONS;
  }

  // Assigned Member (Executor)
  if (isAssignee) {
    const current = subtask.status || 'todo';
    let allowedValues: TaskStatus[] = [current];

    if (current === 'todo') {
      allowedValues = ['todo', 'in_progress', 'in_review'];
    } else if (current === 'in_progress') {
      allowedValues = ['in_progress', 'in_review', 'todo'];
    } else if (current === 'changes_requested') {
      allowedValues = ['changes_requested', 'in_progress'];
    } else if (current === 'done') {
      allowedValues = ['done', 'in_progress'];
    } else if (current === 'canceled') {
      allowedValues = ['canceled', 'in_progress'];
    } else if (current === 'in_review') {
      allowedValues = ['in_review', 'in_progress'];
    }

    return ALL_STATUS_OPTIONS.filter((opt) => allowedValues.includes(opt.value));
  }

  // Independent QA Reviewer reviewing FE/BE subtask in review
  if (isQaReviewer && subtask.status === 'in_review') {
    return ALL_STATUS_OPTIONS.filter((opt) =>
      ['in_review', 'done', 'changes_requested'].includes(opt.value)
    );
  }

  // Fallback: show only current status
  return ALL_STATUS_OPTIONS.filter((opt) => opt.value === subtask.status);
}

export const SubtaskSummaryRow: React.FC<SubtaskSummaryRowProps> = ({
  subtask,
  assigneeName,
  commentCount = 0,
  attachmentCount = 0,
  currentUserId,
  currentUserRole,
  onStatusChange,
  canMutate = true,
}) => {
  const isCompleted = subtask.status === 'done';
  const isChangesRequested = subtask.status === 'changes_requested';
  const hasDescription = Boolean(subtask.description && subtask.description.trim().length > 0);

  const scheduleHealth = React.useMemo(() => {
    return calculateSubtaskScheduleHealth(subtask);
  }, [subtask]);

  const allowedStatusOptions = React.useMemo(() => {
    if (!currentUserId && !currentUserRole) return ALL_STATUS_OPTIONS;
    return getAllowedSubtaskStatuses(subtask, currentUserId, currentUserRole);
  }, [subtask, currentUserId, currentUserRole]);

  const dateRangeDisplay = React.useMemo(() => {
    if (subtask.startDate && subtask.dueDate) {
      return `${subtask.startDate} → ${subtask.dueDate}`;
    }
    if (subtask.dueDate) return `Due ${subtask.dueDate}`;
    if (subtask.startDate) return `Starts ${subtask.startDate}`;
    return null;
  }, [subtask.startDate, subtask.dueDate]);

  const renderDeliveryBadge = (area?: DeliveryArea | null) => {
    switch (area) {
      case 'frontend':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200 dark:border-sky-800 shrink-0">
            <Code2 className="h-3 w-3" /> FE
          </span>
        );
      case 'backend':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
            <Layers className="h-3 w-3" /> BE
          </span>
        );
      case 'qa':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0">
            <Bug className="h-3 w-3" /> QA
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 shrink-0">
            SUBTASK
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
      {/* Left side: Area badge, Title, and Indicators */}
      <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
        {renderDeliveryBadge(subtask.deliveryArea)}

        <span
          className={`font-semibold text-xs sm:text-sm truncate max-w-full ${
            isCompleted
              ? 'line-through text-stone-400 dark:text-stone-500'
              : 'text-stone-900 dark:text-stone-100'
          }`}
        >
          {subtask.title}
        </span>

        {/* Schedule Health Badge */}
        <TaskScheduleHealthBadge
          status={scheduleHealth.status}
          label={scheduleHealth.label}
          compact={false}
        />

        {/* Micro Indicators */}
        <div className="flex items-center gap-1.5 ml-0 sm:ml-1 shrink-0">
          {hasDescription && (
            <span
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              title="Has technical description"
            >
              <FileText className="h-3 w-3 text-stone-400" />
            </span>
          )}

          {commentCount > 0 && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800"
              title={`${commentCount} discussion comments`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>{commentCount}</span>
            </span>
          )}

          {attachmentCount > 0 && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300 border border-stone-200 dark:border-stone-700"
              title={`${attachmentCount} attachments/evidence`}
            >
              <Paperclip className="h-3 w-3 text-stone-400" />
              <span>{attachmentCount}</span>
            </span>
          )}

          {isChangesRequested && (
            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border border-rose-200 dark:border-rose-900"
              title="Changes requested by reviewer"
            >
              <AlertCircle className="h-3 w-3" />
              <span>Revise</span>
            </span>
          )}

          {dateRangeDisplay && (
            <span
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${
                scheduleHealth.isOverdue
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800 font-bold'
                  : 'bg-stone-100 text-stone-600 dark:bg-stone-800/80 dark:text-stone-400'
              }`}
              title={dateRangeDisplay}
            >
              <Calendar className="h-3 w-3" />
              <span>{dateRangeDisplay}</span>
            </span>
          )}
        </div>
      </div>

      {/* Right side: Assignee & Quick Status dropdown */}
      <div
        className="flex items-center gap-2 shrink-0 self-end sm:self-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Assignee Avatar / Name */}
        <div
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-stone-100/80 dark:bg-stone-800/70 text-[11px] text-stone-700 dark:text-stone-300"
          title={`Assignee: ${assigneeName || 'Unassigned'}`}
        >
          {assigneeName ? (
            <Avatar name={assigneeName} size="sm" className="h-4 w-4 text-[9px]" />
          ) : (
            <User className="h-3 w-3 text-stone-400" />
          )}
          <span className="max-w-[100px] truncate font-medium">
            {assigneeName || 'Unassigned'}
          </span>
        </div>

        {/* Quick Status Selector */}
        {canMutate && onStatusChange && allowedStatusOptions.length > 1 ? (
          <select
            value={subtask.status}
            onChange={(e) => onStatusChange(subtask.id, e.target.value as TaskStatus)}
            className="h-7 rounded-lg border border-stone-200 bg-white px-2 text-[11px] font-bold text-stone-800 outline-none focus:ring-1 focus:ring-indigo-400 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
            title="Change Subtask Status"
          >
            {allowedStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <TaskStatusBadge state={subtask.status} />
        )}
      </div>
    </div>
  );
};
