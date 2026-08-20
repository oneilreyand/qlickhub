import React, { useEffect, useMemo, useState } from 'react';
import { Task } from '@qlick/contracts';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { RootState } from '../store/store';
import { selectCurrentUserId } from '../store/authSlice';
import {
  fetchTasks,
  completeTask,
  updateTask,
  setSelectedTaskId,
} from '../store/taskSlice';
import { enqueueSnackbar } from '../store/uiSlice';
import { MyTaskDetailWorkspaceDrawer } from '../components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer';
import { CreateTaskModal } from '../components/ui/organisms/CreateTaskModal';
import { EmptyWorkspaceOnboarding } from '../components/ui/organisms/EmptyWorkspaceOnboarding';
import { MyTasksDashboard } from '../components/ui/organisms/MyTasksDashboard';

export const MyTasksPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { activeWorkspaceId, workspaces, isLoading: isWsLoading } = useAppSelector((state: RootState) => state.workspace);
  const { tasks, isLoading, selectedTaskId } = useAppSelector((state: RootState) => state.task);
  const { folders } = useAppSelector((state: RootState) => state.folder);
  const currentUserId = useAppSelector(selectCurrentUserId);

  const activeWorkspace = useMemo(
    () => workspaces.find((w) => w.id === activeWorkspaceId) || workspaces[0],
    [workspaces, activeWorkspaceId]
  );
  const userRole = activeWorkspace?.role || activeWorkspace?.myRole || 'dev';

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const reloadTasks = () => {
    if (activeWorkspaceId) {
      dispatch(
        fetchTasks({
          workspaceId: activeWorkspaceId,
          query: {
            myTasksOnly: true,
            includeSubtaskSummary: true,
          },
        })
      );
    }
  };

  useEffect(() => {
    reloadTasks();
  }, [activeWorkspaceId, currentUserId, dispatch]);

  const selectedTask = useMemo(
    () => tasks.find((t) => t.id === selectedTaskId) || null,
    [tasks, selectedTaskId]
  );

  const handleToggleComplete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (!activeWorkspaceId) return;
    try {
      if (task.status === 'done') {
        await dispatch(updateTask({ workspaceId: activeWorkspaceId, taskId: task.id, input: { status: 'todo' } })).unwrap();
        dispatch(enqueueSnackbar('Task reopened', 'success'));
      } else {
        await dispatch(completeTask({ workspaceId: activeWorkspaceId, taskId: task.id, input: { status: 'done' } })).unwrap();
        dispatch(enqueueSnackbar('Task marked as Done', 'success'));
      }
    } catch (err) {
      dispatch(enqueueSnackbar(err instanceof Error ? err.message : 'Failed to update task status', 'error'));
    }
  };

  if (!isWsLoading && workspaces.length === 0) {
    return <EmptyWorkspaceOnboarding />;
  }

  return (
    <>
      <MyTasksDashboard
        tasks={tasks}
        isLoading={isLoading}
        selectedTaskId={selectedTaskId}
        userRole={userRole}
        onSelectTask={(taskId) => dispatch(setSelectedTaskId(taskId))}
        onToggleComplete={handleToggleComplete}
        onCreateTaskClick={() => setIsCreateModalOpen(true)}
      />

      {/* Role-tailored Collaborative Workspace Drawer */}
      <MyTaskDetailWorkspaceDrawer
        task={selectedTask}
        userRole={userRole}
        isOpen={Boolean(selectedTaskId && selectedTask)}
        onClose={() => dispatch(setSelectedTaskId(null))}
        onDataChanged={reloadTasks}
      />

      {/* Create Task Modal */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        folders={folders}
      />
    </>
  );
};
