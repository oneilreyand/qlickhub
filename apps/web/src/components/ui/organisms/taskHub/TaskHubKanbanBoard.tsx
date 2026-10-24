import React, { useMemo } from 'react';
import { CalendarDays, Folder, Layers3, ListTodo } from 'lucide-react';
import type { Task } from '@qlick/contracts';
import { EmptyState } from '../../molecules/EmptyState';
import { Skeleton } from '../../atoms/Skeleton';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';

interface TaskHubKanbanBoardProps {
  tasks: Task[];
  isLoading: boolean;
  onSelect: (task: Task) => void;
}

const columns: Array<{ status: Task['status']; label: string; accent: string }> = [
  { status: 'todo', label: 'Belum Dikerjakan', accent: 'border-stone-300 dark:border-stone-700' },
  {
    status: 'in_progress',
    label: 'Sedang Dikerjakan',
    accent: 'border-blue-300 dark:border-blue-800',
  },
  { status: 'in_review', label: 'Dalam Review', accent: 'border-amber-300 dark:border-amber-800' },
  { status: 'done', label: 'Selesai', accent: 'border-emerald-300 dark:border-emerald-800' },
];

const formatDate = (date?: string | null) =>
  date
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(
        new Date(`${date}T00:00:00`),
      )
    : 'Tanpa tenggat';

/** Read-only Feature board. It deliberately exposes no drag/drop or mutation controls. */
export const TaskHubKanbanBoard: React.FC<TaskHubKanbanBoardProps> = ({
  tasks,
  isLoading,
  onSelect,
}) => {
  const tasksByStatus = useMemo(
    () =>
      new Map(
        columns.map((column) => [
          column.status,
          tasks.filter((task) => task.status === column.status),
        ]),
      ),
    [tasks],
  );

  if (isLoading) {
    return (
      <div className="grid gap-4 lg:grid-cols-4" aria-label="Memuat Kanban Feature">
        {columns.map((column) => (
          <Skeleton key={column.status} variant="rectangular" className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <EmptyState
        icon={<Layers3 className="h-6 w-6" />}
        title="Tidak ada Feature"
        description="Ubah filter atau pilih folder lain untuk melihat Feature."
      />
    );
  }

  return (
    <section aria-label="Kanban Feature" className="grid gap-4 lg:grid-cols-4">
      {columns.map((column) => {
        const columnTasks = tasksByStatus.get(column.status) || [];
        return (
          <div
            key={column.status}
            className={`min-w-0 rounded-2xl border-t-2 ${column.accent} bg-stone-50/80 p-3 dark:bg-stone-950/35`}
          >
            <div className="mb-3 flex items-center justify-between gap-2 px-1">
              <h3 className="text-xs font-extrabold text-stone-800 dark:text-stone-100">
                {column.label}
              </h3>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-stone-600 shadow-xs dark:bg-stone-900 dark:text-stone-300">
                {columnTasks.length}
              </span>
            </div>
            <div className="space-y-3">
              {columnTasks.map((task) => (
                <button
                  type="button"
                  key={task.id}
                  onClick={() => onSelect(task)}
                  className="w-full rounded-xl border border-stone-200 bg-white p-3 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-[#B1E743] hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-[#B1E743] dark:border-stone-800 dark:bg-[#1c1a19]"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-sm font-bold text-stone-900 dark:text-white">
                      {task.title}
                    </span>
                    <TaskStatusBadge state={task.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                    <span className="inline-flex items-center gap-1">
                      <ListTodo className="h-3.5 w-3.5" />
                      {task.subtaskSummary?.total ?? task.subtasks?.length ?? 0} subtask
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(task.dueDate)}
                    </span>
                  </div>
                  {task.folderId && (
                    <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-stone-500 dark:text-stone-400">
                      <Folder className="h-3 w-3" />
                      Feature
                    </span>
                  )}
                </button>
              ))}
              {columnTasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                  <Layers3 className="mx-auto mb-1.5 h-4 w-4" />
                  Belum ada Feature
                </div>
              )}
            </div>
          </div>
        );
      })}
    </section>
  );
};
