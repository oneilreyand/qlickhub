import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ListTodo,
  RefreshCw,
} from 'lucide-react';
import type { Task } from '@qlick/contracts';
import type {
  CreatedByMeTasksViewState,
  CreatedTaskPriorityFilter,
  CreatedTaskStatusFilter,
} from '../../../../lib/hooks/useCreatedByMeTasks';
import { Alert } from '../../atoms/Alert';
import { Badge } from '../../atoms/Badge';
import { Button } from '../../atoms/Button';
import { Card } from '../../atoms/Card';
import { ProgressBar } from '../../atoms/ProgressBar';
import { Select } from '../../atoms/Select';
import { Skeleton } from '../../atoms/Skeleton';
import { EmptyState } from '../../molecules/EmptyState';
import { SearchInput } from '../../molecules/SearchInput';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';

export interface CreatedByMeTaskPanelProps {
  state: CreatedByMeTasksViewState;
  search: string;
  status: CreatedTaskStatusFilter;
  priority: CreatedTaskPriorityFilter;
  selectedTaskId?: string | null;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: CreatedTaskStatusFilter) => void;
  onPriorityChange: (value: CreatedTaskPriorityFilter) => void;
  onPageChange: (page: number) => void;
  onRefresh: () => void;
  onOpenTask: (task: Task) => void | Promise<void>;
}

const priorityPresentation = {
  urgent: { label: 'Mendesak', variant: 'blocked' },
  high: { label: 'Tinggi', variant: 'review' },
  medium: { label: 'Sedang', variant: 'info' },
  low: { label: 'Rendah', variant: 'draft' },
} as const;

function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function scheduleLabel(task: Task) {
  if (!task.startDate || !task.dueDate) return 'Jadwal belum ditentukan';
  return `${formatDate(task.startDate)} – ${formatDate(task.dueDate)}`;
}

export const CreatedByMeTaskPanel: React.FC<CreatedByMeTaskPanelProps> = ({
  state,
  search,
  status,
  priority,
  selectedTaskId,
  onSearchChange,
  onStatusChange,
  onPriorityChange,
  onPageChange,
  onRefresh,
  onOpenTask,
}) => {
  const [openingTaskId, setOpeningTaskId] = useState<string | null>(null);
  const hasFilters = Boolean(search.trim()) || status !== 'all' || priority !== 'all';
  const totalPages = Math.max(1, Math.ceil(state.total / state.limit));
  const firstVisible = state.total === 0 ? 0 : (state.page - 1) * state.limit + 1;
  const lastVisible = Math.min(state.page * state.limit, state.total);

  const openTask = async (task: Task) => {
    setOpeningTaskId(task.id);
    try {
      await onOpenTask(task);
    } finally {
      setOpeningTaskId(null);
    }
  };

  if (state.permissionDenied) {
    return (
      <Alert
        tone="warning"
        title="Akses Task buatan Anda ditolak"
        icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
      >
        Keanggotaan Workspace Anda tidak mengizinkan akses ke daftar ini.
      </Alert>
    );
  }

  if (state.error) {
    return (
      <div className="space-y-3">
        <Alert
          tone="error"
          title="Task buatan Anda tidak dapat dimuat"
          icon={<AlertTriangle className="h-4 w-4" aria-hidden="true" />}
        >
          {state.error}
        </Alert>
        <Button
          variant="outline"
          size="md"
          onClick={onRefresh}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
        >
          Coba lagi
        </Button>
      </div>
    );
  }

  return (
    <section
      className="space-y-5"
      aria-labelledby="created-by-me-title"
      aria-busy={state.isLoading}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="created-by-me-title"
              className="text-lg font-extrabold text-stone-900 dark:text-stone-100"
            >
              Task yang Anda buat
            </h2>
            <Badge variant={state.total > 0 ? 'brand' : 'neutral'} size="sm">
              {state.total} Task
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Root Task di Workspace aktif yang tercatat dibuat oleh akun Anda.
          </p>
        </div>
        <Button
          variant="outline"
          size="md"
          onClick={onRefresh}
          leftIcon={<RefreshCw className="h-4 w-4" aria-hidden="true" />}
          aria-label="Muat ulang Task yang dibuat oleh saya"
        >
          Muat ulang
        </Button>
      </div>

      <Card className="p-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_180px_180px] md:items-end">
          <SearchInput
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            onClear={() => onSearchChange('')}
            placeholder="Cari judul atau deskripsi Task"
            aria-label="Cari Task yang dibuat oleh saya"
          />
          <Select
            value={status}
            onChange={(event) => onStatusChange(event.target.value as CreatedTaskStatusFilter)}
            aria-label="Filter Task buatan saya berdasarkan status"
          >
            <option value="all">Semua status</option>
            <option value="todo">Belum Dikerjakan</option>
            <option value="in_progress">Sedang Dikerjakan</option>
            <option value="in_review">Dalam Review</option>
            <option value="changes_requested">Perlu Perbaikan</option>
            <option value="done">Selesai</option>
            <option value="canceled">Dibatalkan</option>
          </Select>
          <Select
            value={priority}
            onChange={(event) => onPriorityChange(event.target.value as CreatedTaskPriorityFilter)}
            aria-label="Filter Task buatan saya berdasarkan prioritas"
          >
            <option value="all">Semua prioritas</option>
            <option value="urgent">Mendesak</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </Select>
        </div>
      </Card>

      {state.isLoading ? (
        <div
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
          aria-label="Memuat Task buatan Anda"
        >
          {[1, 2, 3].map((id) => (
            <Skeleton key={id} variant="rectangular" className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : state.tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-5 w-5" aria-hidden="true" />}
          title={hasFilters ? 'Tidak ada Task yang cocok' : 'Belum ada Task yang Anda buat'}
          description={
            hasFilters
              ? 'Ubah pencarian atau filter untuk melihat Task buatan Anda yang lain.'
              : 'Root Task yang Anda buat di Workspace ini akan muncul di sini.'
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.tasks.map((task) => {
            const summary = task.subtaskSummary;
            const completedSubtasks = summary?.completed || 0;
            const totalSubtasks = summary?.total || 0;
            const priorityInfo = priorityPresentation[task.priority];
            const isSelected = selectedTaskId === task.id;

            return (
              <Card
                key={task.id}
                className={`flex min-h-64 flex-col justify-between gap-5 p-4 transition-colors ${
                  isSelected ? 'border-[#B1E743] bg-[#B1E743]/5 ring-2 ring-[#B1E743]/20' : ''
                }`}
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <TaskStatusBadge state={task.status} />
                    <Badge variant={priorityInfo.variant} size="sm">
                      Prioritas {priorityInfo.label}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-mono text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                      {task.id.slice(0, 8)}
                    </p>
                    <h3 className="mt-1 break-words text-sm font-extrabold leading-snug text-stone-900 dark:text-stone-100">
                      {task.title}
                    </h3>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-stone-600 dark:text-stone-300">
                    <CalendarDays
                      className="mt-0.5 h-4 w-4 shrink-0 text-stone-400"
                      aria-hidden="true"
                    />
                    <span>{scheduleLabel(task)}</span>
                  </div>
                  <ProgressBar
                    value={completedSubtasks}
                    max={Math.max(totalSubtasks, 1)}
                    label={`Subtask ${completedSubtasks}/${totalSubtasks}`}
                    showPercentage={totalSubtasks > 0}
                    size="sm"
                  />
                </div>
                <Button
                  variant="primary"
                  size="md"
                  className="w-full"
                  isLoading={openingTaskId === task.id}
                  disabled={openingTaskId !== null && openingTaskId !== task.id}
                  onClick={() => void openTask(task)}
                  rightIcon={<ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  aria-label={`Buka Task ${task.title}`}
                >
                  Buka Task
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      {!state.isLoading && state.total > state.limit && (
        <nav
          className="flex flex-col gap-3 border-t border-stone-200/80 pt-4 dark:border-stone-800 sm:flex-row sm:items-center sm:justify-between"
          aria-label="Halaman Task yang dibuat oleh saya"
        >
          <p className="text-xs text-stone-500 dark:text-stone-400" aria-live="polite">
            Menampilkan {firstVisible}–{lastVisible} dari {state.total} Task
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              disabled={state.page <= 1}
              onClick={() => onPageChange(state.page - 1)}
              leftIcon={<ChevronLeft className="h-4 w-4" aria-hidden="true" />}
            >
              Sebelumnya
            </Button>
            <span className="min-w-16 text-center text-xs font-semibold text-stone-700 dark:text-stone-300">
              {state.page}/{totalPages}
            </span>
            <Button
              variant="outline"
              size="md"
              disabled={state.page >= totalPages}
              onClick={() => onPageChange(state.page + 1)}
              rightIcon={<ChevronRight className="h-4 w-4" aria-hidden="true" />}
            >
              Berikutnya
            </Button>
          </div>
        </nav>
      )}
    </section>
  );
};
