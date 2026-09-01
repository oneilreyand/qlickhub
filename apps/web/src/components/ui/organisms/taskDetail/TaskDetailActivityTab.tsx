import React from 'react';
import {
  CheckCircle2,
  FileText,
  Clock,
  AlertCircle,
  User,
  Folder,
  Calendar,
  ListTodo,
  MessageSquare,
  History,
  Paperclip,
  Trash2,
} from 'lucide-react';
import type { TaskActivity } from '@qlick/contracts';

import { Button } from '../../atoms/Button';
import { Skeleton } from '../../atoms/Skeleton';
import { Alert } from '../../atoms/Alert';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';

export const EMPTY_ACTIVITY_ILLUSTRATION_URL =
  'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024043/ChatGPT_Image_Aug_18_2026_10_33_31_AM.png';

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getActivityIcon(action: string) {
  if (action === 'qa.sign_off.created')
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (action === 'release.decision.created')
    return <FileText className="h-3.5 w-3.5 text-stone-700 dark:text-[#B1E743]" />;
  if (action.includes('completed'))
    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
  if (action.includes('status'))
    return <Clock className="h-3.5 w-3.5 text-stone-700 dark:text-[#B1E743]" />;
  if (action.includes('priority')) return <AlertCircle className="h-3.5 w-3.5 text-amber-500" />;
  if (action.includes('assignee')) return <User className="h-3.5 w-3.5 text-blue-500" />;
  if (action.includes('date') || action.includes('schedule'))
    return <Calendar className="h-3.5 w-3.5 text-purple-500" />;
  if (action.includes('moved') || action.includes('folder'))
    return <Folder className="h-3.5 w-3.5 text-amber-500" />;
  if (action.includes('subtask'))
    return <ListTodo className="h-3.5 w-3.5 text-stone-700 dark:text-[#B1E743]" />;
  if (action.includes('requirement') || action.includes('brief') || action.includes('spec'))
    return <FileText className="h-3.5 w-3.5 text-emerald-500" />;
  if (action.includes('comment')) return <MessageSquare className="h-3.5 w-3.5 text-blue-500" />;
  if (action.includes('attachment')) {
    return action.includes('deleted') ? (
      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
    ) : (
      <Paperclip className="h-3.5 w-3.5 text-stone-700 dark:text-[#B1E743]" />
    );
  }
  if (action === 'deleted') return <Trash2 className="h-3.5 w-3.5 text-rose-500" />;
  return <History className="h-3.5 w-3.5 text-stone-400" />;
}

function renderHumanActivityDescription(act: TaskActivity) {
  const meta = (act.metadataJson || {}) as Record<string, any>;
  const action = act.action;
  const changes = meta.changes || {};

  if (action === 'qa.sign_off.created') {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        recorded QA Sign-off as{' '}
        <span
          className={
            meta.decision === 'approved'
              ? 'font-semibold text-emerald-600 dark:text-emerald-400'
              : 'font-semibold text-rose-600 dark:text-rose-400'
          }
        >
          {meta.decision === 'approved' ? 'Approved' : 'Rejected'}
        </span>
      </span>
    );
  }

  if (action === 'release.decision.created') {
    return (
      <span className="inline-flex flex-wrap items-center gap-1 text-stone-700 dark:text-stone-300">
        <span>recorded Release Decision as</span>
        <span
          className={
            meta.decision === 'approved'
              ? 'font-semibold text-emerald-600 dark:text-emerald-400'
              : 'font-semibold text-rose-600 dark:text-rose-400'
          }
        >
          {meta.decision === 'approved' ? 'Approved' : 'Rejected'}
        </span>
        {meta.isOverride && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
            QA override
          </span>
        )}
      </span>
    );
  }

  // Status changes (task or subtask)
  if (
    action.includes('status_updated') ||
    action.includes('status_changed') ||
    action === 'task.status' ||
    action === 'subtask.status' ||
    Boolean(changes.status)
  ) {
    const oldStatus = changes.status?.old ?? meta.oldStatus ?? meta.previousStatus;
    const newStatus = changes.status?.new ?? meta.newStatus ?? meta.status;

    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap text-stone-700 dark:text-stone-300">
        <span>changed status</span>
        {oldStatus && (
          <>
            <span>from</span>
            <TaskStatusBadge state={oldStatus} />
          </>
        )}
        {newStatus && (
          <>
            <span>to</span>
            <TaskStatusBadge state={newStatus} />
          </>
        )}
        {meta.reviewNotes && (
          <span className="text-[11px] italic text-rose-600 dark:text-rose-400">
            (Review notes: &ldquo;{meta.reviewNotes}&rdquo;)
          </span>
        )}
        {meta.roleMismatchOverride && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-semibold">
            Role Override ({meta.assigneeRole})
          </span>
        )}
      </span>
    );
  }

  // Priority changes
  if (
    action.includes('priority_updated') ||
    action.includes('priority_changed') ||
    action === 'task.priority' ||
    action === 'subtask.priority' ||
    Boolean(changes.priority)
  ) {
    const oldP = changes.priority?.old ?? meta.oldPriority ?? meta.previousPriority;
    const newP = changes.priority?.new ?? meta.newPriority ?? meta.priority;

    return (
      <span className="inline-flex items-center gap-1.5 flex-wrap text-stone-700 dark:text-stone-300">
        <span>changed priority</span>
        {oldP && (
          <>
            <span>from</span>
            <span className="font-bold uppercase tracking-wider text-stone-600 dark:text-stone-400">
              {oldP}
            </span>
          </>
        )}
        {newP && (
          <>
            <span>to</span>
            <span className="font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              {newP}
            </span>
          </>
        )}
      </span>
    );
  }

  // Assignee changes
  if (
    action.includes('assignee_updated') ||
    action.includes('assignee_changed') ||
    Boolean(changes.assigneeId)
  ) {
    const newAssignee = meta.newAssigneeName || meta.assigneeName;
    if (
      changes.assigneeId?.new === null ||
      (!newAssignee && changes.assigneeId && !changes.assigneeId.new)
    ) {
      return <span className="text-stone-700 dark:text-stone-300">unassigned this task</span>;
    }
    return (
      <span className="text-stone-700 dark:text-stone-300">
        assigned task to{' '}
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          {newAssignee || 'team member'}
        </span>
      </span>
    );
  }

  // Due date changes
  if (
    action.includes('dueDate_updated') ||
    action.includes('dates_changed') ||
    action.includes('date_updated') ||
    Boolean(changes.dueDate) ||
    Boolean(changes.startDate)
  ) {
    const oldDue = changes.dueDate?.old ?? meta.oldDueDate;
    const newDue = changes.dueDate?.new ?? meta.newDueDate ?? meta.dueDate;

    if (oldDue && newDue) {
      return (
        <span className="text-stone-700 dark:text-stone-300">
          changed due date from{' '}
          <span className="font-semibold text-stone-900 dark:text-stone-100">{oldDue}</span> to{' '}
          <span className="font-semibold text-stone-900 dark:text-stone-100">{newDue}</span>
        </span>
      );
    }
    if (newDue) {
      return (
        <span className="text-stone-700 dark:text-stone-300">
          set due date to{' '}
          <span className="font-semibold text-stone-900 dark:text-stone-100">{newDue}</span>
        </span>
      );
    }
    return <span className="text-stone-700 dark:text-stone-300">updated task schedule dates</span>;
  }

  // Title changes
  if (action.includes('title_updated') || Boolean(changes.title)) {
    const newTitle = changes.title?.new ?? meta.title;
    return (
      <span className="text-stone-700 dark:text-stone-300">
        renamed to{' '}
        <span className="font-semibold text-stone-900 dark:text-stone-100">"{newTitle}"</span>
      </span>
    );
  }

  // Description changes
  if (action.includes('description_updated') || Boolean(changes.description)) {
    return <span className="text-stone-700 dark:text-stone-300">updated task description</span>;
  }

  // Generic multiple updates
  if (action === 'task.updated' || action === 'subtask.updated' || action === 'updated') {
    const changedFields = Object.keys(changes);
    if (changedFields.length > 0) {
      return (
        <span className="text-stone-700 dark:text-stone-300">
          updated {changedFields.join(', ')}
        </span>
      );
    }
    return <span className="text-stone-700 dark:text-stone-300">updated task details</span>;
  }

  // Task created
  if (action === 'task.created' || action === 'created') {
    return <span className="text-stone-700 dark:text-stone-300">created this task</span>;
  }

  // Subtask created
  if (action === 'subtask.created' || action === 'subtask_created') {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        created subtask{' '}
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          "{meta.title || act.taskTitle || 'Subtask'}"
        </span>
        {meta.deliveryArea && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-[#B1E743]/20 dark:bg-[#B1E743]/20 text-[#141413] dark:text-[#B1E743] text-[10px] font-bold uppercase">
            {meta.deliveryArea}
          </span>
        )}
      </span>
    );
  }

  // Task / Subtask completed
  if (action.includes('completed')) {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        marked as{' '}
        <span className="font-semibold text-emerald-600 dark:text-emerald-400">Completed</span>
      </span>
    );
  }

  // Task reopened
  if (action.includes('reopened')) {
    return <span className="text-stone-700 dark:text-stone-300">reopened this task</span>;
  }

  // Task / Subtask moved
  if (action.includes('moved')) {
    const folderName = meta.targetFolderName || meta.newFolderName || 'another folder';
    return (
      <span className="text-stone-700 dark:text-stone-300">
        moved to folder{' '}
        <span className="font-semibold text-stone-900 dark:text-stone-100">{folderName}</span>
      </span>
    );
  }

  // Requirement linked/unlinked
  if (action === 'requirement.linked' || action === 'requirement_linked') {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        linked requirement{' '}
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          [{meta.code || 'REQ'}] {meta.title || ''}
        </span>
      </span>
    );
  }
  if (action === 'requirement.unlinked' || action === 'requirement_unlinked') {
    return <span className="text-stone-700 dark:text-stone-300">unlinked a requirement</span>;
  }

  // Specification Brief
  if (action.includes('brief')) {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        updated specification brief {meta.version ? `to version v${meta.version}` : ''}
      </span>
    );
  }

  // Comments
  if (action === 'attachment_deleted') {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        deleted attachment{' '}
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          {meta.fileName || 'file'}
        </span>
      </span>
    );
  }

  if (action === 'attachment_created') {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        added attachment{' '}
        <span className="font-semibold text-stone-900 dark:text-stone-100">
          {meta.fileName || 'file'}
        </span>
      </span>
    );
  }

  if (action === 'deleted') {
    return (
      <span className="text-stone-700 dark:text-stone-300">
        removed {meta.recordType === 'subtask' ? 'a subtask' : 'this task'} from active views
      </span>
    );
  }

  if (action === 'comment.deleted') {
    return <span className="text-stone-700 dark:text-stone-300">deleted a discussion message</span>;
  }

  if (action.includes('comment')) {
    return (
      <span className="text-stone-700 dark:text-stone-300">posted a comment in discussion</span>
    );
  }

  return (
    <span className="text-stone-700 dark:text-stone-300">
      recorded {action.replace(/\./g, ' ')}
    </span>
  );
}

export interface TaskDetailActivityTabProps {
  activities: TaskActivity[];
  activityTotal: number;
  activityPage: number;
  isLoadingActivity: boolean;
  activityError: string | null;
  onLoadActivity: (page?: number, append?: boolean) => void;
  pageSize?: number;
}

export const TaskDetailActivityTab: React.FC<TaskDetailActivityTabProps> = ({
  activities,
  activityTotal,
  activityPage,
  isLoadingActivity,
  activityError,
  onLoadActivity,
  pageSize = 50,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100">
            Activity & Audit Trail
          </h3>
          <p className="text-[11px] text-stone-500 dark:text-stone-400">
            Chronological history of all updates made to this task and its subtasks.
          </p>
        </div>
        <span className="text-[11px] font-semibold text-stone-400">{activityTotal} events</span>
      </div>

      {isLoadingActivity ? (
        <div className="space-y-2 py-2">
          <Skeleton variant="text" className="h-14 w-full rounded-xl" />
          <Skeleton variant="text" className="h-14 w-full rounded-xl" />
        </div>
      ) : activityError ? (
        <Alert tone="error" title="Audit trail unavailable">
          <div className="flex items-center justify-between gap-3">
            <span>{activityError}</span>
            <Button variant="outline" size="sm" onClick={() => onLoadActivity()}>
              Retry
            </Button>
          </div>
        </Alert>
      ) : activities.length === 0 ? (
        <div className="py-10 sm:py-12 px-4 text-center border border-dashed border-stone-200 dark:border-stone-800 rounded-2xl bg-stone-50/50 dark:bg-stone-900/30 space-y-4 animate-fadeIn">
          <div className="flex justify-center">
            <img
              src={EMPTY_ACTIVITY_ILLUSTRATION_URL}
              alt="No activity recorded"
              className="dark:hidden w-full max-w-[260px] sm:max-w-[320px] md:max-w-[380px] h-auto max-h-60 sm:max-h-72 object-contain mx-auto transition-transform duration-300 hover:scale-[1.03] drop-shadow-xs"
              loading="lazy"
            />
            <div className="hidden dark:flex items-center justify-center py-2">
              <div className="relative grid h-16 w-16 place-items-center rounded-2xl bg-stone-900 border border-stone-800 shadow-inner">
                <div className="absolute inset-0 rounded-2xl bg-[#B1E743]/10 blur-lg pointer-events-none" />
                <History className="h-7 w-7 text-[#B1E743]" />
              </div>
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-stone-700 dark:text-stone-200 font-bold">
              No activity recorded yet
            </p>
            <p className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 max-w-sm mx-auto leading-relaxed">
              Any status updates, assignments, or edits will appear here.
            </p>
          </div>
        </div>
      ) : (
        <div className="relative pl-3 space-y-3 before:absolute before:left-6 before:top-3 before:bottom-3 before:w-0.5 before:bg-stone-200 dark:before:bg-stone-800">
          {activities.map((act) => (
            <div key={act.id} className="relative flex items-start gap-3 pl-0 group">
              {/* Avatar / Icon circle */}
              <div className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 shadow-xs z-10">
                {getActivityIcon(act.action)}
              </div>

              {/* Card Content */}
              <div className="min-w-0 flex-1 rounded-xl border border-stone-200/80 bg-white/80 p-3 shadow-xs dark:border-stone-800 dark:bg-stone-900/70">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap text-xs">
                    <span className="font-bold text-stone-900 dark:text-stone-100">
                      {act.actorName || 'Team member'}
                    </span>
                    {renderHumanActivityDescription(act)}
                  </div>
                  <span
                    className="text-[11px] font-medium text-stone-400 dark:text-stone-500 shrink-0"
                    title={new Date(act.createdAt).toLocaleString()}
                  >
                    {formatRelativeTime(act.createdAt)}
                  </span>
                </div>

                {act.isSubtask && act.taskTitle && (
                  <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-md">
                    <ListTodo className="h-3 w-3" />
                    <span>Subtask: {act.taskTitle}</span>
                    {act.deliveryArea && (
                      <span className="uppercase text-[9px] font-bold px-1 bg-amber-200/60 dark:bg-amber-900/60 rounded">
                        {act.deliveryArea}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {!activityError && activityTotal > activities.length && (
        <div className="flex flex-col items-center gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full sm:w-auto"
            isLoading={isLoadingActivity}
            onClick={() => onLoadActivity(activityPage + 1, true)}
          >
            Load older activities ({activityTotal - activities.length} remaining)
          </Button>
        </div>
      )}
      {!activityError && activityTotal > pageSize && activities.length === activityTotal && (
        <p className="text-center text-[11px] text-stone-400 pt-1">
          All {activityTotal} activity events loaded.
        </p>
      )}
    </div>
  );
};
