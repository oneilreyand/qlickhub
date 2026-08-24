import React from 'react';
import { ArrowLeft, ChevronRight, Layers3 } from 'lucide-react';
import type { Task } from '@qlick/contracts';
import { Button } from '../atoms/Button';

interface TaskHierarchyBreadcrumbProps {
  task: Task;
  parentTask?: Task | null;
  isParentTaskLoading?: boolean;
  onNavigateToTask?: (taskId: string) => void;
}

function deliveryAreaLabel(task: Task) {
  return task.deliveryArea ? `${task.deliveryArea} subtask` : 'Subtask';
}

export const TaskHierarchyBreadcrumb: React.FC<TaskHierarchyBreadcrumbProps> = ({
  task,
  parentTask,
  isParentTaskLoading = false,
  onNavigateToTask,
}) => {
  const isSubtask = Boolean(task.parentTaskId);
  const parentLabel =
    parentTask?.title || (isParentTaskLoading ? 'Loading Feature…' : 'Feature / Story');

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-stone-50/70 p-3 dark:border-stone-800 dark:bg-stone-950/40 sm:flex-row sm:items-center sm:justify-between">
      <nav
        aria-label="Task hierarchy breadcrumb"
        className="flex min-w-0 flex-wrap items-center gap-1.5 text-[11px] font-semibold text-stone-500"
      >
        <Layers3 className="h-3.5 w-3.5 shrink-0 text-stone-700 dark:text-[#B1E743]" />
        {isSubtask ? (
          <>
            {onNavigateToTask && task.parentTaskId ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateToTask(task.parentTaskId!)}
                className="!min-h-[44px] max-w-full justify-start px-2 text-left font-bold text-stone-800 underline-offset-4 hover:underline dark:text-stone-100"
                aria-label={`Open parent Feature ${parentLabel}`}
                disabled={isParentTaskLoading}
              >
                <span className="block max-w-[16rem] truncate sm:max-w-sm">{parentLabel}</span>
              </Button>
            ) : (
              <span className="max-w-[16rem] truncate font-bold text-stone-800 dark:text-stone-100 sm:max-w-sm">
                {parentLabel}
              </span>
            )}
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="capitalize">{deliveryAreaLabel(task)}</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </>
        ) : (
          <>
            <span>Feature / Story</span>
            <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </>
        )}
        <span className="max-w-[16rem] truncate text-stone-700 dark:text-stone-300 sm:max-w-md">
          {task.title}
        </span>
      </nav>

      {isSubtask && task.parentTaskId && onNavigateToTask && (
        <Button
          variant="outline"
          size="sm"
          className="!min-h-[44px] w-full shrink-0 sm:w-auto"
          leftIcon={<ArrowLeft className="h-3.5 w-3.5" />}
          onClick={() => onNavigateToTask(task.parentTaskId!)}
          disabled={isParentTaskLoading}
        >
          Back to Feature
        </Button>
      )}
    </div>
  );
};
