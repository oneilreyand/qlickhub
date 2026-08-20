import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MyTaskDetailWorkspaceDrawer } from '../MyTaskDetailWorkspaceDrawer';
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
            user: { id: 'u-1', name: 'Alice PO', email: 'alice@qlick.io' },
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

const mockTask: Task = {
  id: 't-100',
  workspaceId: 'ws-1',
  title: 'Payment Integration Milestone',
  description: 'Support multi-gateway transactions with Stripe & PayPal.',
  status: 'in_progress',
  priority: 'urgent',
  reporterId: 'u-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  subtasks: [],
};

describe('MyTaskDetailWorkspaceDrawer Organism', () => {
  it('renders drawer with role switcher tabs (PO Cockpit, Dev Workstation, QA Testing Desk)', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MyTaskDetailWorkspaceDrawer
          task={mockTask}
          userRole="po"
          isOpen={true}
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>
    );

    expect(screen.getByText('PO Cockpit & iCards')).toBeInTheDocument();
    expect(screen.getByText('Dev Working Desk')).toBeInTheDocument();
    expect(screen.getByText('QA Testing Desk')).toBeInTheDocument();
    expect(screen.getByText('Role: po')).toBeInTheDocument();
    expect(screen.getByText('PO Management Cockpit')).toBeInTheDocument();
  });

  it('switches views smoothly when clicking persona tabs', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <MyTaskDetailWorkspaceDrawer
          task={mockTask}
          userRole="po"
          isOpen={true}
          onClose={vi.fn()}
          onDataChanged={vi.fn()}
        />
      </Provider>
    );

    const devTab = screen.getByText('Dev Working Desk');
    fireEvent.click(devTab);
    expect(screen.getByText(/Dev Deliverables & Technical Implementation Notes/i)).toBeInTheDocument();

    const qaTab = screen.getByText('QA Testing Desk');
    fireEvent.click(qaTab);
    expect(screen.getByText(/Interactive Test Execution Checklist/i)).toBeInTheDocument();
  });
});
