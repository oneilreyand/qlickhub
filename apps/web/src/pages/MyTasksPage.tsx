import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Task, WorkQueueItem } from '@qlick/contracts';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { selectCurrentUserId } from '../store/authSlice';
import { fetchTasks, fetchTaskById, setSelectedTaskId } from '../store/taskSlice';
import { enqueueSnackbar } from '../store/uiSlice';
import { MyTaskDetailWorkspaceDrawer, MyTasksDashboard } from '../features/myTasks';
import { CreateTaskModal } from '../features/tasks';
import { EmptyWorkspaceOnboarding } from '../features/workspaces';
import { useCreatedByMeTasks } from '../lib/hooks/useCreatedByMeTasks';
import { useReleaseReadinessMap } from '../lib/hooks/useReleaseReadinessMap';
import { useRoleAwareWorkQueue } from '../lib/hooks/useRoleAwareWorkQueue';

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
  const [queueFocusTarget, setQueueFocusTarget] = useState<'test_cases' | 'qa_sign_off' | null>(
    null,
  );
  const queueTriggerRef = useRef<HTMLElement | null>(null);

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
  const createdTasks = useCreatedByMeTasks(activeWorkspaceId || undefined);

  const handleOpenTaskById = async (taskId: string) => {
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
      dispatch(setSelectedTaskId(task.id));
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Pekerjaan ini tidak dapat dibuka.',
          'error',
        ),
      );
    }
  };

  const handleOpenQueueItem = async (item: WorkQueueItem) => {
    if (item.subjectType === 'bug') return;
    setQueueFocusTarget(
      item.bucketCode === 'qa_sign_off'
        ? 'qa_sign_off'
        : item.bucketCode === 'qa_test_work'
          ? 'test_cases'
          : null,
    );
    await handleOpenTaskById(item.subjectId);
  };

  const handleOpenCreatedTask = async (task: Task) => {
    setQueueFocusTarget(null);
    await handleOpenTaskById(task.id);
  };

  const handleCloseDrawer = () => {
    dispatch(setSelectedTaskId(null));
    setQueueFocusTarget(null);
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
        createdTasksState={createdTasks.state}
        createdTasksSearch={createdTasks.filters.search}
        createdTasksStatus={createdTasks.filters.status}
        createdTasksPriority={createdTasks.filters.priority}
        onRefreshQueue={reloadWorkQueue}
        onRefreshCreatedTasks={createdTasks.reload}
        onOpenQueueItem={handleOpenQueueItem}
        onOpenCreatedTask={handleOpenCreatedTask}
        onOpenTaskById={handleOpenTaskById}
        onCreatedTasksSearchChange={createdTasks.setSearch}
        onCreatedTasksStatusChange={createdTasks.setStatus}
        onCreatedTasksPriorityChange={createdTasks.setPriority}
        onCreatedTasksPageChange={createdTasks.setPage}
        onBugDataChanged={reloadWorkQueue}
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
        focusTarget={queueFocusTarget}
        onClose={handleCloseDrawer}
        onOpenFeature={(featureTaskId) => {
          if (!activeWorkspaceId) return;
          dispatch(setSelectedTaskId(featureTaskId));
          navigate(`/work?tab=tasks&taskId=${featureTaskId}`, {
            state: { returnTo: `${location.pathname}${location.search}` },
          });
        }}
        onDataChanged={() => {
          reloadTasks();
          reloadReleaseReadiness();
          reloadWorkQueue();
          createdTasks.reload();
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          reloadTasks();
          reloadWorkQueue();
          createdTasks.reload();
        }}
        folders={folders}
      />
    </>
  );
};
