import React from 'react';
import {
  Code2,
  Layers,
  Bug,
  Smartphone,
  Cpu,
  MessageSquare,
  FileText,
  Calendar,
  AlertCircle,
  User,
} from 'lucide-react';
import type { Task, DeliveryArea } from '@qlick/contracts';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskScheduleHealthBadge } from './TaskScheduleHealthBadge';
import { Avatar } from '../atoms/Avatar';
import { calculateSubtaskScheduleHealth } from '../../../lib/utils/scheduleHealth';

export interface SubtaskSummaryRowProps {
  subtask: Task;
  assigneeName?: string;
  commentCount?: number;
  hasUnreadComment?: boolean;
  unreadCommentCount?: number;
  currentUserId?: string;
  currentUserRole?: string;
}

export const SubtaskSummaryRow: React.FC<SubtaskSummaryRowProps> = ({
  subtask,
  assigneeName,
  commentCount = 0,
  hasUnreadComment = false,
  unreadCommentCount = 0,
}) => {

  const isCompleted = subtask.status === 'done';
  const isChangesRequested = subtask.status === 'changes_requested';
  const hasDescription = Boolean(subtask.description && subtask.description.trim().length > 0);

  const scheduleHealth = React.useMemo(() => {
    return calculateSubtaskScheduleHealth(subtask);
  }, [subtask]);

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
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shrink-0">
            <Code2 className="h-3 w-3" /> FE
          </span>
        );
      case 'backend':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
            <Layers className="h-3 w-3" /> BE
          </span>
        );
      case 'mobile':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shrink-0">
            <Smartphone className="h-3 w-3" /> MOB
          </span>
        );
      case 'fullstack':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-stone-100 text-stone-800 dark:bg-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 shrink-0">
            <Cpu className="h-3 w-3" /> FS
          </span>
        );
      case 'qa':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743] border border-[#B1E743]/50 shrink-0">
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

          {hasUnreadComment ? (
            <span
              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-gradient-to-r from-amber-400 to-amber-500 text-stone-950 shadow-xs ring-1 ring-amber-500/50 animate-pulse"
              title={`${unreadCommentCount} pesan baru di subtask ini`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>{commentCount}</span>
              <span className="text-[9px] font-extrabold uppercase">• +{unreadCommentCount} Baru</span>
            </span>
          ) : commentCount > 0 ? (

            <span
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743] border border-[#B1E743]/50"
              title={`${commentCount} discussion comments`}
            >
              <MessageSquare className="h-3 w-3" />
              <span>{commentCount}</span>
            </span>


          ) : null}


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

      {/* Right side: Assignee & Static Status Badge */}
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

        {/* Static Status Badge (Read-Only) */}
        <TaskStatusBadge state={subtask.status} />
      </div>
    </div>
  );
};
