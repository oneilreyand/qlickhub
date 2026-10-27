import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { WorkQueueItem } from '@qlick/contracts';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { selectCurrentUserId } from '../store/authSlice';
import { fetchTasks, fetchTaskById, setSelectedTaskId } from '../store/taskSlice';
import { fetchMembers } from '../store/workspaceSlice';
import { taskService } from '../lib/api/taskService';
import { enqueueSnackbar } from '../store/uiSlice';
import { MyTaskDetailWorkspaceDrawer, MyTasksDashboard } from '../features/myTasks';
import { CreateTaskModal } from '../features/tasks';
import { EmptyWorkspaceOnboarding } from '../features/workspaces';
import { useReleaseReadinessMap } from '../lib/hooks/useReleaseReadinessMap';
import { useRoleAwareWorkQueue } from '../lib/hooks/useRoleAwareWorkQueue';
import { getTaskPagePath, shouldUseLegacyQaWorkspace } from '../lib/utils/taskRoutes';
import {
  buildWorkQueueRoute,
  clearWorkQueueRouteContext,
  getWorkQueueRouteContext,
} from '../lib/utils/workQueueRoute';

export const MyTasksPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    activeWorkspaceId,
    workspaces,
    isLoading: isWsLoading,
    isInitialized: isWsInitialized,
  } = useAppSelector((state: RootState) => state.workspace);
  const { tasks, selectedTaskId } = useAppSelector((state: RootState) => state.task);
  const { folders } = useAppSelector((state: RootState) => state.folder);
  const currentUserId = useAppSelector(selectCurrentUserId);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0],
    [workspaces, activeWorkspaceId],
  );
  const userRole = activeWorkspace?.role || activeWorkspace?.myRole || '';

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const queueTriggerRef = useRef<HTMLElement | null>(null);
  const queueRouteContext = useMemo(
    () => getWorkQueueRouteContext(location.search),
    [location.search],
  );

  const reloadTasks = useCallback(() => {
    if (activeWorkspaceId) {
      dispatch(
        fetchTasks({
          workspaceId: activeWorkspaceId,
          query: {
            myTasksOnly: true,
            includeSubtaskSummary: true,
          },
        }),
      );
    }
  }, [activeWorkspaceId, dispatch]);

  useEffect(() => {
    reloadTasks();
  }, [currentUserId, reloadTasks]);

  useEffect(() => {
    if (activeWorkspaceId) {
      dispatch(fetchMembers(activeWorkspaceId));
    }
  }, [activeWorkspaceId, dispatch]);

  useEffect(() => {
    return () => {
      dispatch(setSelectedTaskId(null));
    };
  }, [dispatch]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId],
  );
  const featureTaskIds = useMemo(() => tasks.map((task) => task.parentTaskId || task.id), [tasks]);
  const { stateByFeatureTaskId: releaseReadinessStateByFeatureId, reload: reloadReleaseReadiness } =
    useReleaseReadinessMap(activeWorkspaceId || undefined, featureTaskIds);
  const { state: workQueueState, reload: reloadWorkQueue } = useRoleAwareWorkQueue(
    activeWorkspaceId || undefined,
  );

  const handleOpenTaskById = useCallback(
    async (taskId: string) => {
      if (!activeWorkspaceId) return;
      queueTriggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      try {
        const task = await dispatch(
          fetchTaskById({
            workspaceId: activeWorkspaceId,
            taskId,
          }),
        ).unwrap();
        if (!shouldUseLegacyQaWorkspace(userRole, task, location.search)) {
          // Pengalih (AC-2.3): ?taskId= membuka halaman Feature atau halaman kerja subtask.
          navigate(getTaskPagePath(task), {
            replace: true,
            state: { returnTo: '/my-tasks' },
          });
          return;
        }
        dispatch(setSelectedTaskId(task.id));
      } catch (error) {
        dispatch(
          enqueueSnackbar(
            error instanceof Error ? error.message : 'Pekerjaan ini tidak dapat dibuka.',
            'error',
          ),
        );
      }
    },
    [activeWorkspaceId, dispatch, location.search, navigate, userRole],
  );

  useEffect(() => {
    if (!queueRouteContext.taskId) return;
    void handleOpenTaskById(queueRouteContext.taskId);
  }, [handleOpenTaskById, queueRouteContext.taskId]);

  const clearQueueContext = useCallback(() => {
    navigate(clearWorkQueueRouteContext(location.search), { replace: true });
  }, [location.search, navigate]);

  const handleOpenQueueItem = useCallback(
    async (item: WorkQueueItem) => {
      // AC-3.8: Persetujuan QA yang tertahan QA Subtask membuka subtask itu, bukan halaman Feature.
      if (
        item.bucketCode === 'qa_sign_off' &&
        item.workState === 'blocked' &&
        activeWorkspaceId &&
        currentUserId
      ) {
        try {
          const result = await taskService.listSubtasks(
            activeWorkspaceId,
            item.featureTaskId ?? item.subjectId,
            1,
            100,
          );
          const mine = result.tasks.filter(
            (task) =>
              task.deliveryArea === 'qa' &&
              task.assigneeId === currentUserId &&
              task.status !== 'done' &&
              task.status !== 'canceled',
          );
          if (mine.length >= 1) {
            navigate(`/work/subtasks/${mine[0].id}`, { state: { returnTo: '/my-tasks' } });
          } else {
            dispatch(
              enqueueSnackbar(
                'Tidak ada subtask QA aktif milik Anda di Feature ini. Buka Feature untuk melihat siapa yang menahan.',
                'info',
              ),
            );
          }
        } catch (error) {
          dispatch(
            enqueueSnackbar(
              error instanceof Error ? error.message : 'Subtask QA tidak dapat dimuat.',
              'error',
            ),
          );
        }
        return;
      }
      navigate(buildWorkQueueRoute(item, location.search));
    },
    [activeWorkspaceId, currentUserId, dispatch, location.search, navigate],
  );

  const handleCloseDrawer = () => {
    dispatch(setSelectedTaskId(null));
    clearQueueContext();
    window.requestAnimationFrame(() => queueTriggerRef.current?.focus());
  };

  if (!isWsInitialized || (isWsLoading && workspaces.length === 0)) {
    return (
      <div className="py-24 flex items-center justify-center" aria-label="Memuat workspace">
        <div className="h-8 w-8 rounded-full border-2 border-stone-300 border-t-stone-800 dark:border-stone-700 dark:border-t-[#B1E743] animate-spin" />
      </div>
    );
  }

  if (workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  return (
    <>
      <MyTasksDashboard
        selectedTaskId={selectedTaskId}
        userRole={userRole}
        workspaceId={activeWorkspaceId || undefined}
        queueState={workQueueState}
        onRefreshQueue={reloadWorkQueue}
        onOpenQueueItem={handleOpenQueueItem}
        onOpenTaskById={handleOpenTaskById}
        onBugDataChanged={reloadWorkQueue}
        focusedBugId={queueRouteContext.bugId}
        onOpenBug={handleOpenQueueItem}
        onCloseBug={clearQueueContext}
        onCreateTaskClick={() => setIsCreateModalOpen(true)}
      />

      {/* Role-tailored Collaborative Workspace Drawer */}
      <MyTaskDetailWorkspaceDrawer
        task={selectedTask}
        userRole={userRole}
        isOpen={Boolean(selectedTaskId && selectedTask)}
        releaseReadinessState={
          selectedTask
            ? releaseReadinessStateByFeatureId[selectedTask.parentTaskId || selectedTask.id]
            : undefined
        }
        focusTarget={queueRouteContext.focusTarget}
        onClose={handleCloseDrawer}
        onOpenFeature={(featureTaskId) => {
          if (!activeWorkspaceId) return;
          // The deep link honours returnTo, so closing the Feature brings the user back here.
          navigate(`/projects/${activeWorkspaceId}/tasks/${featureTaskId}`, {
            state: { returnTo: `${location.pathname}${location.search}` },
          });
        }}
        onDataChanged={() => {
          reloadTasks();
          reloadReleaseReadiness();
          reloadWorkQueue();
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          reloadTasks();
          reloadWorkQueue();
        }}
        folders={folders}
      />
    </>
  );
};
