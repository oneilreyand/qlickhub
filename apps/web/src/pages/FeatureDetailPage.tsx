import React, { useCallback, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Skeleton } from '../components/ui/atoms/Skeleton';
import { AccessRestricted } from '../components/ui/organisms/AccessRestricted';
import { ErrorBoundaryFallback } from '../components/ui/organisms/ErrorBoundary';
import { TaskDetailDrawer } from '../components/ui/organisms/TaskDetailDrawer';
import { useReleaseReadinessMap } from '../lib/hooks/useReleaseReadinessMap';
import { useTaskWithParent } from '../lib/hooks/useTaskWithParent';
import { firstTabForStage, isFeatureStageParam, stageForTab } from '../lib/utils/featureStages';
import { fetchFolderTree } from '../store/folderSlice';
import { useAppDispatch, useAppSelector } from '../store/hooks';

/**
 * Halaman detail Feature (ADR-035): tampil di area konten dengan Sidebar tetap terlihat,
 * dengan stepper Plan · PRD · Task · Apply. Tahap ada di `?tahap=plan|prd|task`.
 */
export const FeatureDetailPage: React.FC = () => {
  const { featureId } = useParams<{ featureId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const folders = useAppSelector((state) => state.folder.folders);
  const { activeWorkspaceId, isInitialized } = useAppSelector((state) => state.workspace);

  const isReady = isInitialized && Boolean(activeWorkspaceId);

  // Sidebar menampilkan folder di halaman ini, termasuk saat halaman dibuka langsung dari URL.
  useEffect(() => {
    if (isReady && activeWorkspaceId) void dispatch(fetchFolderTree(activeWorkspaceId));
  }, [dispatch, isReady, activeWorkspaceId]);
  const { task, parentTask, isTaskLoading, isParentTaskLoading, failure, reload } =
    useTaskWithParent(activeWorkspaceId || undefined, featureId, isReady);

  const featureTaskId = task?.parentTaskId || task?.id;
  const featureTaskIds = useMemo(() => (featureTaskId ? [featureTaskId] : []), [featureTaskId]);
  const { stateByFeatureTaskId: releaseReadinessStateByFeatureId, reload: reloadReleaseReadiness } =
    useReleaseReadinessMap(activeWorkspaceId || undefined, featureTaskIds);

  const returnTo = useMemo(() => {
    const candidate = (location.state as { returnTo?: unknown } | null)?.returnTo;
    return typeof candidate === 'string' && candidate.startsWith('/')
      ? candidate
      : '/work?tab=tasks';
  }, [location.state]);
  const returnState = (location.state as { returnState?: unknown } | null)?.returnState;

  const handleClose = () => navigate(returnTo, { state: returnState });
  const handleNavigateToTask = (nextTaskId: string) =>
    navigate(`/projects/${activeWorkspaceId}/tasks/${nextTaskId}`, {
      state: { returnTo: `${location.pathname}${location.search}`, returnState: location.state },
    });
  const handleDataChanged = useCallback(() => {
    reload();
    reloadReleaseReadiness();
  }, [reload, reloadReleaseReadiness]);

  const tahap = searchParams.get('tahap');
  const initialTab = useMemo(() => {
    if (!isFeatureStageParam(tahap)) return undefined;
    // Subtask tidak punya Brief Produk, jadi PRD langsung ke Requirement.
    if (tahap === 'prd' && task?.parentTaskId) return 'prd';
    return firstTabForStage(tahap);
  }, [tahap, task?.parentTaskId]);

  const handleTabChange = useCallback(
    (tabId: string) => {
      const stage = stageForTab(tabId);
      if (!stage) return;
      setSearchParams(
        (current) => {
          if (current.get('tahap') === stage) return current;
          const next = new URLSearchParams(current);
          next.set('tahap', stage);
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  if (!isReady || isTaskLoading) {
    return (
      <div
        className="mx-auto w-full max-w-6xl space-y-4"
        role="status"
        aria-label="Memuat detail Feature"
      >
        <Skeleton className="h-8 w-64 rounded-lg" />
        <Skeleton className="h-9 w-80 rounded-full" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    );
  }

  if (failure?.status === 403) {
    return (
      <AccessRestricted
        title="Akses Feature dibatasi"
        description="Feature ini berada di Workspace yang tidak dapat Anda akses, atau peran Anda tidak dapat membuka konteksnya."
        actionHref="/work?tab=tasks"
      />
    );
  }

  if (failure?.status === 404) {
    return (
      <ErrorBoundaryFallback
        title="Feature tidak ditemukan (404)"
        description="Feature ini tidak ada di Workspace aktif atau sudah dihapus."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }

  if (failure || !task) {
    return (
      <ErrorBoundaryFallback
        error={failure ? new Error(failure.message) : undefined}
        title="Feature tidak tersedia"
        description="Feature yang tersimpan tidak dapat dimuat. Coba lagi atau kembali ke Task Hub."
        resetErrorBoundary={reload}
        showHomeButton
      />
    );
  }

  return (
    <TaskDetailDrawer
      layout="page"
      backLabel="Task Hub"
      initialTab={initialTab}
      onTabChange={handleTabChange}
      task={task}
      folders={folders}
      parentTask={parentTask}
      isParentTaskLoading={isParentTaskLoading}
      releaseReadinessState={releaseReadinessStateByFeatureId[featureTaskId!]}
      onClose={handleClose}
      onNavigateToTask={handleNavigateToTask}
      onDataChanged={handleDataChanged}
    />
  );
};
