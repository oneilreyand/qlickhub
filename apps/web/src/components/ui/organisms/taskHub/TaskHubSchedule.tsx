import React from 'react';
import { CalendarDays, ChevronRight, ListTodo } from 'lucide-react';
import type { Task } from '@qlick/contracts';
import { EmptyState } from '../../molecules/EmptyState';
import { Skeleton } from '../../atoms/Skeleton';

interface TaskHubScheduleProps {
  tasks: Task[];
  isLoading: boolean;
  onSelect: (task: Task) => void;
}

const formatDate = (date?: string | null) =>
  date
    ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(
        new Date(`${date}T00:00:00`),
      )
    : '—';

export const TaskHubSchedule: React.FC<TaskHubScheduleProps> = ({ tasks, isLoading, onSelect }) => {
  if (isLoading) return <Skeleton variant="rectangular" className="h-72 rounded-2xl" />;
  if (!tasks.length) {
    return (
      <EmptyState
        icon={<CalendarDays className="h-6 w-6" />}
        title="Tidak ada jadwal Feature"
        description="Ubah filter atau pilih folder lain untuk melihat jadwal."
      />
    );
  }

  return (
    <section
      aria-label="Jadwal Feature"
      className="overflow-hidden rounded-2xl border border-stone-200 bg-white dark:border-slate-700 dark:bg-[#151a20]"
    >
      <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3 text-sm font-bold text-stone-800 dark:border-slate-700 dark:text-slate-200">
        <span>{tasks[0].status === 'todo' ? 'Belum dikerjakan' : 'Jadwal Feature'}</span>
        <span className="text-xs font-medium text-stone-500 dark:text-slate-400">Feature</span>
      </div>
      <div className="divide-y divide-stone-200 dark:divide-slate-800">
        {tasks.map((task) => {
          const total = task.subtaskSummary?.total ?? task.subtasks?.length ?? 0;
          const completed =
            task.subtaskSummary?.completed ??
            task.subtasks?.filter((item) => item.status === 'done').length ??
            0;
          const progress = total
            ? Math.round((completed / total) * 100)
            : task.status === 'done'
              ? 100
              : 0;
          return (
            <button
              key={task.id}
              type="button"
              onClick={() => onSelect(task)}
              className="w-full p-5 text-left transition hover:bg-stone-50 focus:outline-none focus:ring-2 focus:ring-[#B1E743] focus:ring-inset dark:hover:bg-slate-800/60"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-stone-900 dark:text-white">{task.title}</h3>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-xs font-medium text-stone-500 dark:text-slate-400 sm:max-w-xl">
                    <span>{formatDate(task.startDate)}</span>
                    <span className="text-center">{formatDate(task.dueDate)}</span>
                    <span className="text-center">{formatDate(task.dueDate)}</span>
                    <span className="text-right">{formatDate(task.dueDate)}</span>
                  </div>
                  <div
                    className="mt-3 h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-slate-700"
                    role="progressbar"
                    aria-label={`Kemajuan ${task.title}`}
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div
                      className="h-full rounded-full bg-[#B1E743] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <div className="mt-4 flex items-center gap-1.5 text-sm text-stone-500 dark:text-slate-400">
                    <ListTodo className="h-4 w-4" />
                    {total} subtask · {completed} selesai
                  </div>
                </div>
                <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-stone-400 dark:text-slate-400" />
              </div>
              <span className="mt-5 block rounded-xl border border-stone-300 px-4 py-3 text-center text-sm font-semibold text-stone-700 dark:border-slate-600 dark:text-slate-200">
                Lihat konteks Feature
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
};
