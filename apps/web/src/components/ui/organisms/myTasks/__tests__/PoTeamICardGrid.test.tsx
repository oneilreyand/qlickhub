import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PoTeamICardGrid } from '../PoTeamICardGrid';
import authReducer from '../../../../../store/authSlice';
import taskReducer from '../../../../../store/taskSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import uiReducer from '../../../../../store/uiSlice';
import type { Task } from '@qlick/contracts';

const releaseServiceMocks = vi.hoisted(() => ({
  listFeatureReleaseRecords: vi.fn().mockResolvedValue({
    workspaceId: 'ws-1',
    featureTaskId: 't-parent-1',
    qaSignOffs: [],
    releaseDecisions: [],
  }),
  createQaSignOff: vi.fn(),
  createReleaseDecision: vi.fn(),
}));

const taskServiceMocks = vi.hoisted(() => ({
  listSubtasks: vi.fn().mockResolvedValue({ tasks: [], total: 0, page: 1, limit: 50 }),
  listTaskComments: vi.fn().mockResolvedValue({ comments: [], total: 0, page: 1, limit: 50 }),
  createTaskComment: vi.fn(),
  deleteTask: vi.fn(),
}));

vi.mock('../../../../../lib/api/releaseDecisionService', () => ({
  releaseDecisionService: releaseServiceMocks,
}));

vi.mock('../../../../../lib/api/taskService', () => ({
  taskService: taskServiceMocks,
}));

const createTestStore = () => {
  return configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      workspace: {
        activeWorkspaceId: 'ws-1',
        workspaces: [
          {
            id: 'ws-1',
            name: 'Workspace Alpha',
            slug: 'ws-alpha',
            role: 'po' as const,
            ownerId: 'u-1',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        members: [
          {
            id: 'm-1',
            workspaceId: 'ws-1',
            userId: 'u-1',
            role: 'po' as const,
            joinedAt: new Date().toISOString(),
            user: { id: 'u-1', name: 'Product Owner Alice', email: 'alice@qlick.io' },
          },
          {
            id: 'm-2',
            workspaceId: 'ws-1',
            userId: 'u-2',
            role: 'dev' as const,
            joinedAt: new Date().toISOString(),
            user: { id: 'u-2', name: 'FE Bob', email: 'bob@qlick.io' },
          },
          {
            id: 'm-3',
            workspaceId: 'ws-1',
            userId: 'u-3',
            role: 'qa' as const,
            joinedAt: new Date().toISOString(),
            user: { id: 'u-3', name: 'QA Charlie', email: 'charlie@qlick.io' },
          },
        ],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });
};

const mockParentTask: Task = {
  id: 't-parent-1',
  workspaceId: 'ws-1',
  title: 'User Authentication Flow',
  description: 'Implement secure login, registration, and QA test cases.',
  status: 'in_progress',
  priority: 'high',
  reporterId: 'u-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  subtasks: [
    {
      id: 'st-fe-1',
      workspaceId: 'ws-1',
      parentTaskId: 't-parent-1',
      deliveryArea: 'frontend',
      title: 'Build Login Form UI',
      status: 'in_progress',
      priority: 'high',
      assigneeId: 'u-2',
      reporterId: 'u-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'st-be-1',
      workspaceId: 'ws-1',
      parentTaskId: 't-parent-1',
      deliveryArea: 'backend',
      title: 'JWT Auth Endpoint',
      status: 'done',
      priority: 'high',
      assigneeId: 'u-2',
      reporterId: 'u-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'st-qa-1',
      workspaceId: 'ws-1',
      parentTaskId: 't-parent-1',
      deliveryArea: 'qa',
      title: 'Smoke Test Login & Edge Cases',
      status: 'todo',
      priority: 'medium',
      assigneeId: 'u-3',
      reporterId: 'u-1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ],
};

describe('PoTeamICardGrid Organism', () => {
  beforeEach(() => {
    taskServiceMocks.listSubtasks.mockResolvedValue({
      tasks: mockParentTask.subtasks,
      total: mockParentTask.subtasks?.length || 0,
      page: 1,
      limit: 50,
    });
    taskServiceMocks.deleteTask.mockResolvedValue({ success: true });
  });

  it('renders executive summary and all three team iCards (Frontend, Backend, QA)', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <PoTeamICardGrid
          task={mockParentTask}
          workspaceId="ws-1"
          currentUserId="u-1"
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    expect(screen.getByText('Kokpit Pengelolaan PO')).toBeInTheDocument();
    expect(screen.getByText('User Authentication Flow')).toBeInTheDocument();
    expect(screen.getByText('Tim Frontend')).toBeInTheDocument();
    expect(screen.getByText('Tim Backend')).toBeInTheDocument();
    expect(screen.getByText('QA & Mutu')).toBeInTheDocument();

    expect(screen.getByText('Build Login Form UI')).toBeInTheDocument();
    expect(screen.getByText('JWT Auth Endpoint')).toBeInTheDocument();
    expect(screen.getByText('Smoke Test Login & Edge Cases')).toBeInTheDocument();
    expect(await screen.findByText('Belum ada Keputusan Rilis')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PO Sign-off & Done' })).not.toBeInTheDocument();
  });

  it('opens subtask drill-down modal on subtask click', async () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <PoTeamICardGrid
          task={mockParentTask}
          workspaceId="ws-1"
          currentUserId="u-1"
          onDataChanged={vi.fn()}
        />
      </Provider>,
    );

    await screen.findByText('Belum ada Keputusan Rilis');

    const feSubtaskCard = screen.getByText('Build Login Form UI');
    fireEvent.click(feSubtaskCard);

    await waitFor(() => {
      expect(screen.getByText('Detail Subtask: Build Login Form UI')).toBeInTheDocument();
    });
  });

  it('lets a planner delete sebuah Subtask from the PO Cockpit after confirmation', async () => {
    const onDataChanged = vi.fn();
    const store = createTestStore();
    render(
      <Provider store={store}>
        <PoTeamICardGrid
          task={mockParentTask}
          workspaceId="ws-1"
          currentUserId="u-1"
          userRole="po"
          onDataChanged={onDataChanged}
        />
      </Provider>,
    );

    fireEvent.click(await screen.findByText('Build Login Form UI'));
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus Subtask' }));

    const confirmation = await screen.findByRole('dialog', { name: 'Hapus Subtask?' });
    expect(confirmation).toHaveTextContent(/bukti QA permanen/i);

    fireEvent.click(within(confirmation).getByRole('button', { name: 'Hapus Subtask' }));

    await waitFor(() => {
      expect(taskServiceMocks.deleteTask).toHaveBeenCalledWith('ws-1', 'st-fe-1');
      expect(onDataChanged).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText('Build Login Form UI')).not.toBeInTheDocument();
  });
});
