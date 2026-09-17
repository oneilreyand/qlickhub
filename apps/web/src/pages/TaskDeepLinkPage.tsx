import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Task } from '@qlick/contracts';
import { Card } from '../components/ui/atoms/Card';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import { MyTaskDetailWorkspaceDrawer } from '../components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer';
import { TaskDetailDrawer, TaskHubDashboardTemplate } from '../features/tasks';
import { taskService } from '../lib/api/taskService';
import { useReleaseReadinessMap } from '../lib/hooks/useReleaseReadinessMap';
import { selectCurrentUserRole } from '../store/authSlice';
import { fetchFolderTree } from '../store/folderSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setActiveWorkspaceId } from '../store/workspaceSlice';

type RouteFailure = {
  status?: number;
  message: string;
};

function getFailure(error: unknown): RouteFailure {
  return {
    status:
      typeof error === 'object' && error !== null && 'status' in error
        ? Number(error.status)
        : undefined,
    message: error instanceof Error ? error.message : 'Task ini tidak dapat dimuat.',
  };
}

export const TaskDeepLinkPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const {
    workspaces,
    isInitialized,
    isLoading: isWorkspaceLoading,
  } = useAppSelector((state) => state.workspace);
  const folders = useAppSelector((state) => state.folder.folders);
  const userRole = useAppSelector(selectCurrentUserRole);

  const [task, setTask] = useState<Task | null>(null);
  const [parentTask, setParentTask] = useState<Task | null>(null);
  const [isTaskLoading, setIsTaskLoading] = useState(true);
  const [isParentTaskLoading, setIsParentTaskLoading] = useState(false);
  const [failure, setFailure] = useState<RouteFailure | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const featureTaskId = task?.parentTaskId || task?.id;
  const featureTaskIds = useMemo(() => (featureTaskId ? [featureTaskId] : []), [featureTaskId]);
  const { stateByFeatureTaskId: releaseReadinessStateByFeatureId, reload: reloadReleaseReadiness } =
    useReleaseReadinessMap(projectId, featureTaskIds);

  const returnTo = useMemo(() => {
    const candidate = (location.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof candidate === 'string' && candidate.startsWith('/')
      ? candidate
      : '/work?tab=tasks';
  }, [location.state]);

  useEffect(() => {
    if (!isInitialized || isWorkspaceLoading) return;

    if (!projectId || !taskId) {
      setFailure({ status: 404, message: 'The requested task route is incomplete.' });
      setIsTaskLoading(false);
      return;
    }

    let isCancelled = false;
    const workspace = workspaces.find((item) => item.id === projectId);
    if (workspace) {
      dispatch(setActiveWorkspaceId(projectId));
      void dispatch(fetchFolderTree(projectId));
    }

    setTask(null);
    setParentTask(null);
    setFailure(null);
    setIsTaskLoading(true);
    setIsParentTaskLoading(false);

    void taskService
      .getTask(projectId, taskId)
      .then(async (loadedTask) => {
        if (isCancelled) return;
        dispatch(setActiveWorkspaceId(projectId));
        setTask(loadedTask);
        setIsTaskLoading(false);

        if (!loadedTask.parentTaskId) return;
        setIsParentTaskLoading(true);
        try {
          const loadedParent = await taskService.getTask(projectId, loadedTask.parentTaskId);
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
  }, [dispatch, isInitialized, isWorkspaceLoading, projectId, reloadToken, taskId, workspaces]);

  const reload = useCallback(() => {
    setReloadToken((current) => current + 1);
    reloadReleaseReadiness();
  }, [reloadReleaseReadiness]);

  if (!isInitialized || isWorkspaceLoading) {
    return (
      <Card
        className="mx-auto max-w-3xl space-y-4 p-5 sm:p-8"
        aria-label="Memuat tautan langsung Task"
      >
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Card>
    );
  }

  if (isTaskLoading) {
    return (
      <TaskDetailDrawer
        task={null}
        folders={folders}
        pendingTaskId={taskId}
        onClose={() => navigate(returnTo)}
      />
    );
  }

  if (failure?.status === 403) {
    return (
      <AccessRestricted
        title="Akses Task dibatasi"
        description="Task ini berada di Workspace yang tidak dapat Anda akses, atau peran Anda tidak dapat membuka konteks Feature ini."
        actionHref="/work?tab=tasks"
      />
    );
  }

  if (failure?.status === 404) {
    return (
      <ErrorBoundaryFallback
        title="Task tidak ditemukan (404)"
        description="Task ini tidak ada di Workspace yang diminta atau sudah dihapus."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }

  if (failure || !task || !projectId) {
    return (
      <ErrorBoundaryFallback
        error={failure ? new Error(failure.message) : undefined}
        title="Task tidak tersedia"
        description="Task yang tersimpan tidak dapat dimuat. Coba lagi atau kembali ke Work Hub."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }

  const useQaWorkspace = userRole === 'qa' && task.deliveryArea === 'qa';

  return (
    <>
      <TaskHubDashboardTemplate />
      {useQaWorkspace ? (
        <MyTaskDetailWorkspaceDrawer
          task={task}
          userRole={userRole}
          isOpen
          releaseReadinessState={releaseReadinessStateByFeatureId[featureTaskId!]}
          onClose={() => navigate(returnTo)}
          onOpenFeature={(nextTaskId) =>
            navigate(`/projects/${projectId}/tasks/${nextTaskId}`, {
              state: { returnTo },
            })
          }
          onDataChanged={reload}
        />
      ) : (
        <TaskDetailDrawer
          task={task}
          folders={folders}
          parentTask={parentTask}
          isParentTaskLoading={isParentTaskLoading}
          releaseReadinessState={releaseReadinessStateByFeatureId[featureTaskId!]}
          onClose={() => navigate(returnTo)}
          onNavigateToTask={(nextTaskId) =>
            navigate(`/projects/${projectId}/tasks/${nextTaskId}`, {
              state: { returnTo },
            })
          }
          onDataChanged={reload}
        />
      )}
    </>
  );
};
