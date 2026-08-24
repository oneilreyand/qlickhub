import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import type { Task } from '@qlick/contracts';
import { Card } from '../components/ui/atoms/Card';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import { TaskDetailDrawer } from '../components/ui/organisms/TaskDetailDrawer';
import { taskService } from '../lib/api/taskService';
import { useReleaseReadinessMap } from '../lib/hooks/useReleaseReadinessMap';
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
    message: error instanceof Error ? error.message : 'Unable to load this task.',
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

  if (!isInitialized || isWorkspaceLoading || isTaskLoading) {
    return (
      <Card className="mx-auto max-w-3xl space-y-4 p-5 sm:p-8" aria-label="Loading task deep link">
        <Skeleton className="h-5 w-48 rounded-lg" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </Card>
    );
  }

  if (failure?.status === 403) {
    return (
      <AccessRestricted
        title="Task access restricted"
        description="This task belongs to a Workspace you cannot access, or your role cannot open this Feature context."
        actionHref="/work?tab=tasks"
      />
    );
  }

  if (failure?.status === 404) {
    return (
      <ErrorBoundaryFallback
        title="Task not found (404)"
        description="This task does not exist in the requested Workspace, or it has been removed."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }

  if (failure || !task || !projectId) {
    return (
      <ErrorBoundaryFallback
        error={failure ? new Error(failure.message) : undefined}
        title="Task unavailable"
        description="The persisted task could not be loaded. Try again or return to the Work Hub."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }

  return (
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
  );
};
