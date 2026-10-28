import React, { useCallback, useEffect, useMemo } from 'react';
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/atoms/Card';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import { TaskDetailDrawer } from '../features/tasks';
import { getTaskPagePath } from '../lib/utils/taskRoutes';
import { useTaskWithParent } from '../lib/hooks/useTaskWithParent';
import { useReleaseReadinessMap } from '../lib/hooks/useReleaseReadinessMap';
import { fetchFolderTree } from '../store/folderSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { setActiveWorkspaceId } from '../store/workspaceSlice';

export const TaskDeepLinkPage: React.FC = () => {
  const { projectId, taskId } = useParams<{ projectId: string; taskId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const {
    workspaces,
    activeWorkspaceId,
    isInitialized,
    isLoading: isWorkspaceLoading,
  } = useAppSelector((state) => state.workspace);
  const folders = useAppSelector((state) => state.folder.folders);

  const isWorkspaceReady = isInitialized && !isWorkspaceLoading;
  const {
    task,
    isTaskLoading,
    failure,
    reload: reloadTask,
  } = useTaskWithParent(projectId, taskId, isWorkspaceReady);

  const featureTaskId = task?.parentTaskId || task?.id;
  const featureTaskIds = useMemo(() => (featureTaskId ? [featureTaskId] : []), [featureTaskId]);
  const { reload: reloadReleaseReadiness } = useReleaseReadinessMap(projectId, featureTaskIds);

  const returnTo = useMemo(() => {
    const candidate = (location.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof candidate === 'string' && candidate.startsWith('/')
      ? candidate
      : '/work?tab=tasks';
  }, [location.state]);
  // Router state to restore on the page we return to, so a chain such as
  // My Tasks -> Subtask -> Feature closes back step by step instead of jumping to Task Hub.
  const returnState = (location.state as { returnState?: unknown } | null)?.returnState;
  const closeDrawer = () => navigate(returnTo, { state: returnState });

  useEffect(() => {
    if (!isWorkspaceReady || !projectId) return;
    if (workspaces.some((item) => item.id === projectId)) {
      dispatch(setActiveWorkspaceId(projectId));
      void dispatch(fetchFolderTree(projectId));
    }
  }, [dispatch, isWorkspaceReady, projectId, workspaces]);

  useEffect(() => {
    if (task && projectId) dispatch(setActiveWorkspaceId(projectId));
  }, [dispatch, projectId, task]);

  const reload = useCallback(() => {
    reloadTask();
    reloadReleaseReadiness();
  }, [reloadTask, reloadReleaseReadiness]);

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
        onClose={closeDrawer}
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

  // Pengalih (AC-2.3): tautan lama membuka halaman Feature atau halaman kerja subtask.
  // Tunggu Workspace aktif sama dengan tautan agar halaman tujuan memuat Task yang benar.
  if (activeWorkspaceId !== projectId) {
    return <Skeleton className="mx-auto h-64 w-full max-w-3xl rounded-xl" />;
  }
  return <Navigate to={getTaskPagePath(task)} replace state={location.state} />;
};
