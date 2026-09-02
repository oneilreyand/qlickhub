import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { WorkQueueItem } from '@qlick/contracts';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { selectCurrentUserId } from '../store/authSlice';
import { fetchTasks, fetchTaskById, setSelectedTaskId } from '../store/taskSlice';
import { enqueueSnackbar } from '../store/uiSlice';
import { MyTaskDetailWorkspaceDrawer, MyTasksDashboard } from '../features/myTasks';
import { CreateTaskModal } from '../features/tasks';
import { EmptyWorkspaceOnboarding } from '../features/workspaces';
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

  const reloadTasks = () => {
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
  };

  useEffect(() => {
    reloadTasks();
  }, [activeWorkspaceId, currentUserId, dispatch]);

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

  const handleOpenQueueItem = async (item: WorkQueueItem) => {
    if (!activeWorkspaceId || item.subjectType === 'bug') return;
    queueTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    try {
      const task = await dispatch(
        fetchTaskById({
          workspaceId: activeWorkspaceId,
          taskId: item.subjectId,
        }),
      ).unwrap();
      dispatch(setSelectedTaskId(task.id));
    } catch (error) {
      dispatch(
        enqueueSnackbar(
          error instanceof Error ? error.message : 'Unable to open this work item.',
          'error',
        ),
      );
    }
  };

  const handleCloseDrawer = () => {
    dispatch(setSelectedTaskId(null));
    window.requestAnimationFrame(() => queueTriggerRef.current?.focus());
  };

  if (!isWsLoading && workspaces.length === 0) {
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
        }}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={reloadWorkQueue}
        folders={folders}
      />
    </>
  );
};
