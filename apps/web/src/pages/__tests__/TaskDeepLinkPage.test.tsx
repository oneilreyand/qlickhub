import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { TaskDeepLinkPage } from '../TaskDeepLinkPage';
import folderReducer from '../../store/folderSlice';
import workspaceReducer from '../../store/workspaceSlice';
import taskReducer from '../../store/taskSlice';

const { getTaskMock, getFolderTreeMock } = vi.hoisted(() => ({
  getTaskMock: vi.fn(),
  getFolderTreeMock: vi.fn(),
}));

vi.mock('../../lib/api/taskService', () => ({
  taskService: {
    getTask: (...args: unknown[]) => getTaskMock(...args),
  },
}));

vi.mock('../../lib/api/folderService', () => ({
  folderService: {
    getFolderTree: (...args: unknown[]) => getFolderTreeMock(...args),
  },
}));

vi.mock('../../lib/hooks/useReleaseReadinessMap', () => ({
  useReleaseReadinessMap: () => ({
    stateByFeatureTaskId: {},
    reload: vi.fn(),
  }),
}));

vi.mock('../../components/ui/organisms/TaskDetailDrawer', () => ({
  TaskDetailDrawer: ({
    task,
    parentTask,
    onClose,
    onNavigateToTask,
  }: {
    task: Task | null;
    parentTask?: Task | null;
    onClose: () => void;
    onNavigateToTask: (taskId: string) => void;
  }) => {
    if (!task) return null;
    return (
      <div data-testid="task-deep-link-drawer">
        <span>{task.title}</span>
        {parentTask && <span>Parent: {parentTask.title}</span>}
        <button type="button" onClick={onClose}>
          Close task
        </button>
        {task.parentTaskId && (
          <button type="button" onClick={() => onNavigateToTask(task.parentTaskId!)}>
            Open parent
          </button>
        )}
      </div>
    );
  },
}));

const workspaceId = '10000000-0000-4000-8000-000000000001';
const taskId = '10000000-0000-4000-8000-000000000002';

const task: Task = {
  id: taskId,
  workspaceId,
  title: 'Persisted Checkout Feature',
  status: 'in_progress',
  priority: 'high',
  reporterId: '10000000-0000-4000-8000-000000000003',
  createdAt: '2026-08-23T00:00:00.000Z',
  updatedAt: '2026-08-23T00:00:00.000Z',
};

function createStore(includeWorkspace = true) {
  return configureStore({
    reducer: {
      folder: folderReducer,
      workspace: workspaceReducer,
      task: taskReducer,
    },
    preloadedState: {
      workspace: {
        workspaces: includeWorkspace
          ? [
              {
                id: workspaceId,
                name: 'Checkout Workspace',
                slug: 'checkout-workspace',
                ownerId: '10000000-0000-4000-8000-000000000003',
                role: 'po' as const,
                createdAt: '2026-08-23T00:00:00.000Z',
                updatedAt: '2026-08-23T00:00:00.000Z',
              },
            ]
          : [],
        activeWorkspaceId: null,
        members: [],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });
}

function renderRoute(includeWorkspace = true) {
  const store = createStore(includeWorkspace);
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/projects/${workspaceId}/tasks/${taskId}`]}>
        <Routes>
          <Route path="/projects/:projectId/tasks/:taskId" element={<TaskDeepLinkPage />} />
          <Route path="/work" element={<div>Work Hub destination</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
  return store;
}

describe('TaskDeepLinkPage', () => {
  beforeEach(() => {
    getTaskMock.mockReset();
    getFolderTreeMock.mockReset();
    getFolderTreeMock.mockResolvedValue([]);
  });

  it('loads an authorized persisted task after a direct refresh and restores its Workspace', async () => {
    getTaskMock.mockResolvedValue(task);
    const store = renderRoute();

    expect(await screen.findByTestId('task-deep-link-drawer')).toHaveTextContent(task.title);
    expect(getTaskMock).toHaveBeenCalledWith(workspaceId, taskId);
    expect(getFolderTreeMock).toHaveBeenCalledWith(workspaceId);
    expect(store.getState().workspace.activeWorkspaceId).toBe(workspaceId);

    fireEvent.click(screen.getByRole('button', { name: 'Close task' }));
    expect(await screen.findByText('Work Hub destination')).toBeInTheDocument();
  });

  it('renders an explicit forbidden state from the authenticated task endpoint', async () => {
    const forbidden = Object.assign(new Error('Task access denied.'), { status: 403 });
    getTaskMock.mockRejectedValue(forbidden);
    renderRoute(false);

    expect(
      await screen.findByRole('heading', { name: 'Task access restricted' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Workspace you cannot access/)).toBeInTheDocument();
    expect(getTaskMock).toHaveBeenCalledWith(workspaceId, taskId);
  });

  it('renders an explicit missing-record state for a valid deep link', async () => {
    const missing = Object.assign(new Error('Task not found in this workspace.'), { status: 404 });
    getTaskMock.mockRejectedValue(missing);
    renderRoute();

    expect(
      await screen.findByRole('heading', { name: 'Task not found (404)' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/does not exist in the requested Workspace/)).toBeInTheDocument();
  });

  it('loads a subtask parent and navigates Back to Feature without losing the return path', async () => {
    const parentTask = {
      ...task,
      id: '10000000-0000-4000-8000-000000000004',
      title: 'Parent Feature',
    };
    const subtask = {
      ...task,
      parentTaskId: parentTask.id,
      deliveryArea: 'frontend' as const,
      title: 'Checkout frontend subtask',
    };
    getTaskMock.mockImplementation((_workspaceId: string, requestedTaskId: string) =>
      Promise.resolve(requestedTaskId === taskId ? subtask : parentTask),
    );
    renderRoute();

    expect(await screen.findByText('Parent: Parent Feature')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open parent' }));

    await waitFor(() => {
      expect(getTaskMock).toHaveBeenCalledWith(workspaceId, parentTask.id);
    });
    expect(await screen.findByText('Parent Feature')).toBeInTheDocument();
  });
});
