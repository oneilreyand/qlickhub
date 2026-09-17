import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { TaskDeepLinkPage } from '../TaskDeepLinkPage';
import authReducer from '../../store/authSlice';
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
    pendingTaskId,
    parentTask,
    onClose,
    onNavigateToTask,
  }: {
    task: Task | null;
    pendingTaskId?: string | null;
    parentTask?: Task | null;
    onClose: () => void;
    onNavigateToTask: (taskId: string) => void;
  }) => {
    if (!task) {
      return pendingTaskId ? (
        <div role="status" aria-label="Memuat detail task">
          Loading {pendingTaskId}
        </div>
      ) : null;
    }
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

vi.mock('../../components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer', () => ({
  MyTaskDetailWorkspaceDrawer: ({ task, userRole }: { task: Task; userRole: string }) => (
    <div data-testid="qa-deep-link-workspace">
      {task.title} · Peran: {userRole}
    </div>
  ),
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

function createStore(includeWorkspace = true, role = 'po') {
  return configureStore({
    reducer: {
      auth: authReducer,
      folder: folderReducer,
      workspace: workspaceReducer,
      task: taskReducer,
    },
    preloadedState: {
      auth: {
        currentUser: {
          id: '10000000-0000-4000-8000-000000000099',
          email: `${role}@example.test`,
          name: `E2E ${role}`,
          role,
          onboardingCompletedAt: '2026-08-23T00:00:00.000Z',
        },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'succeeded' as const,
        error: null,
      },
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

function renderRoute(includeWorkspace = true, role = 'po') {
  const store = createStore(includeWorkspace, role);
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

  it('shows the detail loading drawer while the persisted task request is pending', async () => {
    let resolveTask!: (value: Task) => void;
    getTaskMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveTask = resolve;
        }),
    );
    renderRoute();

    expect(await screen.findByRole('status', { name: 'Memuat detail task' })).toHaveTextContent(
      taskId,
    );
    expect(screen.queryByTestId('task-deep-link-drawer')).not.toBeInTheDocument();

    await act(async () => {
      resolveTask(task);
    });

    expect(await screen.findByTestId('task-deep-link-drawer')).toHaveTextContent(task.title);
  });

  it('renders an explicit forbidden state from the authenticated task endpoint', async () => {
    const forbidden = Object.assign(new Error('Task access denied.'), { status: 403 });
    getTaskMock.mockRejectedValue(forbidden);
    renderRoute(false);

    expect(await screen.findByRole('heading', { name: 'Akses Task dibatasi' })).toBeInTheDocument();
    expect(screen.getByText(/Workspace yang tidak dapat Anda akses/)).toBeInTheDocument();
    expect(getTaskMock).toHaveBeenCalledWith(workspaceId, taskId);
  });

  it('renders an explicit missing-record state for a valid deep link', async () => {
    const missing = Object.assign(new Error('Task not found in this workspace.'), { status: 404 });
    getTaskMock.mockRejectedValue(missing);
    renderRoute();

    expect(
      await screen.findByRole('heading', { name: 'Task tidak ditemukan (404)' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/tidak ada di Workspace yang diminta/)).toBeInTheDocument();
  });

  it('loads sebuah Subtask parent and navigates Kembali ke Feature without losing the return path', async () => {
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

  it('opens a QA subtask deep link in the QA workspace for the authenticated QA actor', async () => {
    const qaSubtask = {
      ...task,
      parentTaskId: '10000000-0000-4000-8000-000000000004',
      deliveryArea: 'qa' as const,
      title: 'Checkout QA subtask',
    };
    getTaskMock.mockResolvedValue(qaSubtask);
    renderRoute(true, 'qa');

    expect(await screen.findByTestId('qa-deep-link-workspace')).toHaveTextContent(
      'Checkout QA subtask · Peran: qa',
    );
    expect(screen.queryByTestId('task-deep-link-drawer')).not.toBeInTheDocument();
  });
});
