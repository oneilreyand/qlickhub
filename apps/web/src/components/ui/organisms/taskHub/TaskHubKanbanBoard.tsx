import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Layers3, RotateCcw } from 'lucide-react';
import type { Task } from '@qlick/contracts';
import { EmptyState } from '../../molecules/EmptyState';
import { Skeleton } from '../../atoms/Skeleton';
import { TaskStatusBadge } from '../../molecules/TaskStatusBadge';
import { Select } from '../../atoms/Select';
import { Button } from '../../atoms/Button';
import { Alert } from '../../atoms/Alert';
import { AccessRestricted } from '../../organisms/AccessRestricted';
import { taskService } from '../../../../lib/api/taskService';

interface TaskHubKanbanBoardProps {
  workspaceId: string | null;
  features: Task[];
  selectedFeatureId: string | null;
  isLoadingFeatures: boolean;
  onSelectFeature: (featureId: string | null) => void;
  onSelect: (task: Task) => void;
}

const PAGE_SIZE = 24;

const columns: Array<{ status: Task['status']; label: string; accent: string }> = [
  { status: 'todo', label: 'Belum Dikerjakan', accent: 'border-stone-300 dark:border-stone-700' },
  {
    status: 'in_progress',
    label: 'Sedang Dikerjakan',
    accent: 'border-blue-300 dark:border-blue-800',
  },
  { status: 'in_review', label: 'Dalam Review', accent: 'border-amber-300 dark:border-amber-800' },
  {
    status: 'changes_requested',
    label: 'Perlu Perbaikan',
    accent: 'border-rose-300 dark:border-rose-900',
  },
  { status: 'done', label: 'Selesai', accent: 'border-emerald-300 dark:border-emerald-800' },
  { status: 'canceled', label: 'Dibatalkan', accent: 'border-stone-300 dark:border-stone-700' },
];

const getErrorStatus = (error: unknown): number | undefined =>
  typeof error === 'object' && error !== null && 'status' in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

/**
 * Read-only Kanban for the paginated subtasks of one selected Feature.
 * The parent scope is supplied through a presentation-only URL parameter;
 * no Kanban control changes task status or assignment.
 */
export const TaskHubKanbanBoard: React.FC<TaskHubKanbanBoardProps> = ({
  workspaceId,
  features,
  selectedFeatureId,
  isLoadingFeatures,
  onSelectFeature,
  onSelect,
}) => {
  const [subtasks, setSubtasks] = useState<Task[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoadingSubtasks, setIsLoadingSubtasks] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [retryKey, setRetryKey] = useState(0);

  const selectedFeature = useMemo(
    () => features.find((feature) => feature.id === selectedFeatureId) || null,
    [features, selectedFeatureId],
  );

  useEffect(() => {
    setPage(1);
  }, [selectedFeatureId]);

  useEffect(() => {
    if (!workspaceId || !selectedFeature) {
      setSubtasks([]);
      setTotal(0);
      setError(null);
      setIsLoadingSubtasks(false);
      return;
    }

    let cancelled = false;
    setIsLoadingSubtasks(true);
    setError(null);

    void taskService
      .listSubtasks(workspaceId, selectedFeature.id, page, PAGE_SIZE)
      .then((result) => {
        if (cancelled) return;
        setSubtasks(result.tasks);
        setTotal(result.total);
      })
      .catch((nextError: unknown) => {
        if (cancelled) return;
        setSubtasks([]);
        setTotal(0);
        setError(nextError);
      })
      .finally(() => {
        if (!cancelled) setIsLoadingSubtasks(false);
      });

    return () => {
      cancelled = true;
    };
  }, [workspaceId, selectedFeature, page, retryKey]);

  const tasksByStatus = useMemo(
    () =>
      new Map(
        columns.map((column) => [
          column.status,
          subtasks.filter((task) => task.status === column.status),
        ]),
      ),
    [subtasks],
  );
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isForbidden = getErrorStatus(error) === 403;

  if (isLoadingFeatures) {
    return (
      <div className="grid gap-4 lg:grid-cols-3" aria-label="Memuat Feature untuk Kanban">
        {columns.map((column) => (
          <Skeleton key={column.status} variant="rectangular" className="h-56 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (features.length === 0) {
    return (
      <EmptyState
        icon={<Layers3 className="h-6 w-6" />}
        title="Tidak ada Feature"
        description="Ubah filter atau pilih folder lain untuk memilih scope Kanban."
      />
    );
  }

  return (
    <section aria-label="Kanban Subtask Feature" className="space-y-4">
      <div className="rounded-2xl border border-stone-200 bg-stone-50/80 p-4 dark:border-stone-800 dark:bg-stone-950/35">
        <label
          htmlFor="kanban-feature-scope"
          className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400"
        >
          Feature untuk Kanban
        </label>
        <Select
          id="kanban-feature-scope"
          aria-label="Pilih Feature untuk Kanban"
          value={selectedFeatureId || ''}
          onChange={(event) => onSelectFeature(event.target.value || null)}
          className="w-full"
        >
          <option value="">Pilih Feature</option>
          {features.map((feature) => (
            <option key={feature.id} value={feature.id}>
              {feature.title}
            </option>
          ))}
        </Select>
        {selectedFeature && (
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
            Menampilkan subtask dari <strong>{selectedFeature.title}</strong>. Status di bawah
            berasal dari halaman data yang sedang dimuat.
          </p>
        )}
      </div>

      {!selectedFeature ? (
        <EmptyState
          icon={<Layers3 className="h-6 w-6" />}
          title="Pilih Feature terlebih dahulu"
          description="Kanban hanya menampilkan subtask dari satu Feature agar konteks delivery tetap jelas."
        />
      ) : isForbidden ? (
        <AccessRestricted
          title="Subtask Feature tidak dapat dibuka"
          description="Anda tidak memiliki akses untuk membaca subtask pada Feature ini."
          actionLabel="Pilih Feature lain"
          onAction={() => onSelectFeature(null)}
        />
      ) : error ? (
        <Alert tone="error" title="Kanban tidak dapat dimuat">
          <div className="space-y-3">
            <p>Subtask Feature gagal dimuat. Coba lagi tanpa mengubah data tugas.</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              leftIcon={<RotateCcw className="h-4 w-4" />}
              onClick={() => setRetryKey((current) => current + 1)}
            >
              Coba lagi
            </Button>
          </div>
        </Alert>
      ) : isLoadingSubtasks ? (
        <div className="grid gap-4 lg:grid-cols-3" aria-label="Memuat subtask Kanban">
          {columns.map((column) => (
            <Skeleton key={column.status} variant="rectangular" className="h-56 rounded-2xl" />
          ))}
        </div>
      ) : subtasks.length === 0 ? (
        <EmptyState
          icon={<Layers3 className="h-6 w-6" />}
          title="Belum ada subtask"
          description="Feature ini belum memiliki subtask pada halaman data yang tersedia."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3">
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
                        <p className="mt-3 text-[11px] font-semibold text-stone-500 dark:text-stone-400">
                          {task.deliveryArea || 'delivery'} · Subtask
                        </p>
                      </button>
                    ))}
                    {columnTasks.length === 0 && (
                      <div className="rounded-xl border border-dashed border-stone-300 p-4 text-center text-xs text-stone-500 dark:border-stone-700 dark:text-stone-400">
                        Belum ada subtask
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {totalPages > 1 && (
            <nav
              className="flex items-center justify-between gap-3"
              aria-label="Pagination subtask Kanban"
            >
              <Button
                type="button"
                variant="outline"
                size="sm"
                leftIcon={<ChevronLeft className="h-4 w-4" />}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page === 1}
              >
                Sebelumnya
              </Button>
              <span
                className="text-sm font-medium text-stone-600 dark:text-stone-300"
                aria-live="polite"
              >
                Halaman {page} dari {totalPages} · {total} subtask
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                rightIcon={<ChevronRight className="h-4 w-4" />}
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page === totalPages}
              >
                Berikutnya
              </Button>
            </nav>
          )}
        </>
      )}
    </section>
  );
};
