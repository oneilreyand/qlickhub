import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { PoTeamICardGrid } from '../PoTeamICardGrid';
import authReducer from '../../../../../store/authSlice';
import taskReducer from '../../../../../store/taskSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import uiReducer from '../../../../../store/uiSlice';
import type { Task } from '@qlick/contracts';

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
      </Provider>
    );

    expect(screen.getByText('PO Management Cockpit')).toBeInTheDocument();
    expect(screen.getByText('User Authentication Flow')).toBeInTheDocument();
    expect(screen.getByText('Frontend Team')).toBeInTheDocument();
    expect(screen.getByText('Backend Team')).toBeInTheDocument();
    expect(screen.getByText('QA & Quality')).toBeInTheDocument();

    expect(screen.getByText('Build Login Form UI')).toBeInTheDocument();
    expect(screen.getByText('JWT Auth Endpoint')).toBeInTheDocument();
    expect(screen.getByText('Smoke Test Login & Edge Cases')).toBeInTheDocument();
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
      </Provider>
    );

    const feSubtaskCard = screen.getByText('Build Login Form UI');
    fireEvent.click(feSubtaskCard);

    await waitFor(() => {
      expect(screen.getByText('Subtask Details: Build Login Form UI')).toBeInTheDocument();
    });
  });
});
