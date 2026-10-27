import { useCallback, useEffect, useState } from 'react';
import type { Task } from '@qlick/contracts';
import { taskService } from '../api/taskService';

export type TaskRouteFailure = {
  status?: number;
  message: string;
};

function getFailure(error: unknown): TaskRouteFailure {
  return {
    status:
      typeof error === 'object' && error !== null && 'status' in error
        ? Number(error.status)
        : undefined,
    message: error instanceof Error ? error.message : 'Task ini tidak dapat dimuat.',
  };
}

/**
 * Memuat satu Task beserta induknya (bila subtask) untuk halaman yang dibuka lewat URL.
 * Dipakai tautan langsung Task dan halaman detail Feature.
 * Tidak memuat apa pun selama `enabled` false (mis. Workspace belum siap).
 */
export function useTaskWithParent(
  workspaceId: string | undefined,
  taskId: string | undefined,
  enabled = true,
) {
  const [task, setTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [isTaskLoading, setIsTaskLoading] = useState(true);
  const [isParentTaskLoading, setIsParentTaskLoading] = useState(false);
  const [failure, setFailure] = useState<TaskRouteFailure | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    if (!workspaceId || !taskId) {
      setFailure({ status: 404, message: 'The requested task route is incomplete.' });
      setIsTaskLoading(false);
      return;
    }

    let isCancelled = false;
    setTask(null);
    setParentTask(null);
    setFailure(null);
    setIsTaskLoading(true);
    setIsParentTaskLoading(false);

    void taskService
      .getTask(workspaceId, taskId)
      .then(async (loadedTask) => {
        if (isCancelled) return;
        setTask(loadedTask);
        setIsTaskLoading(false);

        if (!loadedTask.parentTaskId) return;
        setIsParentTaskLoading(true);
        try {
          const loadedParent = await taskService.getTask(workspaceId, loadedTask.parentTaskId);
          if (!isCancelled) setParentTask(loadedParent);
        } finally {
          if (!isCancelled) setIsParentTaskLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (isCancelled) return;
        setFailure(getFailure(error));
        setIsTaskLoading(false);
        setIsParentTaskLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [enabled, reloadToken, taskId, workspaceId]);

  const reload = useCallback(() => setReloadToken((current) => current + 1), []);

  return { task, parentTask, isTaskLoading, isParentTaskLoading, failure, reload };
}
