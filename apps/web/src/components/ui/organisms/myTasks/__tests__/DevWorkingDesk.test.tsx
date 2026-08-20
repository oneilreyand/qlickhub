import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { DevWorkingDesk } from '../DevWorkingDesk';
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
        workspaces: [],
        members: [
          {
            id: 'm-1',
            workspaceId: 'ws-1',
            userId: 'u-1',
            role: 'po' as const,
            joinedAt: new Date().toISOString(),
            user: { id: 'u-1', name: 'Alice PO', email: 'alice@qlick.io' },
          },
          {
            id: 'm-2',
            workspaceId: 'ws-1',
            userId: 'u-2',
            role: 'dev' as const,
            joinedAt: new Date().toISOString(),
            user: { id: 'u-2', name: 'Bob Dev', email: 'bob@qlick.io' },
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

const mockSubtask: Task = {
  id: 'st-dev-1',
  workspaceId: 'ws-1',
  parentTaskId: 't-parent-1',
  deliveryArea: 'frontend',
  title: 'Implement Navigation Bar Component',
  description: 'Create responsive navigation with dark mode support.\n- **PR Link**: https://github.com/org/repo/pull/123\n- **Branch**: `feature/nav-bar`\n- **Staging URL**: https://staging.app.io/nav',
  status: 'in_progress',
  priority: 'medium',
  reporterId: 'u-1',
  assigneeId: 'u-2',
  startDate: '2026-08-01',
  dueDate: '2026-08-25',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockParent: Task = {
  id: 't-parent-1',
  workspaceId: 'ws-1',
  title: 'Global App Shell',
  description: 'PRD: Must include header, sidebar, and theme toggle.',
  status: 'in_progress',
  priority: 'high',
  reporterId: 'u-1',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('DevWorkingDesk Organism', () => {
  it('renders developer workstation with workflow stepper, schedule timeline, and separated PO vs Dev notes', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <DevWorkingDesk
          subtask={mockSubtask}
          parentTask={mockParent}
          workspaceId="ws-1"
          currentUserId="u-2"
          onDataChanged={vi.fn()}
        />
      </Provider>
    );

    // Header & Roles
    expect(screen.getByText('Frontend Workstation')).toBeInTheDocument();
    expect(screen.getByText('Implement Navigation Bar Component')).toBeInTheDocument();
    expect(screen.getByText('Global App Shell')).toBeInTheDocument();
    expect(screen.getByText('Handoff to QA')).toBeInTheDocument();
    expect(screen.getByText('Assigned Developer')).toBeInTheDocument();
    expect(screen.getByText('Bob Dev')).toBeInTheDocument();
    expect(screen.getByText('Alice PO')).toBeInTheDocument();

    // Schedule Timeline
    expect(screen.getByText('Schedule Timeline & Commitment Status')).toBeInTheDocument();
    expect(screen.getByText(/Start: 2026-08-01/i)).toBeInTheDocument();
    expect(screen.getByText(/Due: 2026-08-25/i)).toBeInTheDocument();

    // PO Brief (read-only)
    expect(screen.getByText('PO Product Brief & Specifications')).toBeInTheDocument();
    expect(screen.getByText(/PRD: Must include header, sidebar, and theme toggle/i)).toBeInTheDocument();

    // Dev Deliverables inputs pre-populated from description
    const prInput = screen.getByDisplayValue('https://github.com/org/repo/pull/123');
    expect(prInput).toBeInTheDocument();
    const branchInput = screen.getByDisplayValue('feature/nav-bar');
    expect(branchInput).toBeInTheDocument();
    const stagingInput = screen.getByDisplayValue('https://staging.app.io/nav');
    expect(stagingInput).toBeInTheDocument();

    // Dev implementation notes textarea
    expect(screen.getByDisplayValue(/Create responsive navigation with dark mode support/i)).toBeInTheDocument();

    // 2-Tab Navigation
    expect(screen.getByText('Work & Deliverables')).toBeInTheDocument();
    const discussionTab = screen.getByText('Team Discussion');
    expect(discussionTab).toBeInTheDocument();

    // Switch to Team Discussion tab
    fireEvent.click(discussionTab);
    expect(screen.getByText(/Subtask Collaboration Discussion/i)).toBeInTheDocument();
  });

  it('opens Handoff to QA modal when clicking Handoff to QA button', () => {
    const store = createTestStore();
    render(
      <Provider store={store}>
        <DevWorkingDesk
          subtask={mockSubtask}
          parentTask={mockParent}
          workspaceId="ws-1"
          currentUserId="u-2"
          onDataChanged={vi.fn()}
        />
      </Provider>
    );

    const handoffBtn = screen.getByText('Handoff to QA');
    fireEvent.click(handoffBtn);

    expect(screen.getByText('Submit Handoff to QA Team')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/E.g. Login with test-qa@qlick.io/i)).toBeInTheDocument();
  });
});
