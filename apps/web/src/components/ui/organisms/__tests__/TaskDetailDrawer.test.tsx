import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { TaskDetailDrawer } from '../TaskDetailDrawer';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { Task } from '@qa/contracts';

const mockTask: Task = {
  id: 'task-12345678-aaaa-bbbb-cccc-ddddeeeeffff',
  workspaceId: 'ws-11111111-2222-3333-4444-555555555555',
  folderId: null,
  parentTaskId: null,
  deliveryArea: null,
  title: 'Test Parent Task Title',
  description: 'Test task description content',
  status: 'in_progress',
  priority: 'high',
  assigneeId: null,
  reporterId: 'user-1',
  position: 0,
  startDate: '2026-08-01',
  dueDate: '2026-08-15',
  completedAt: null,
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
  subtaskSummary: {
    total: 2,
    completed: 1,
    areas: {
      frontend: { total: 1, completed: 1 },
      backend: { total: 1, completed: 0 },
      qa: { total: 0, completed: 0 },
    },
  },
};

function renderWithRedux(ui: React.ReactElement) {
  const store = configureStore({
    reducer: {
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      workspace: {
        workspaces: [],
        activeWorkspaceId: 'ws-11111111-2222-3333-4444-555555555555',
        members: [],
        isLoading: false,
        isMembersLoading: false,
        error: null,
      },
    },
  });
  return render(<Provider store={store}>{ui}</Provider>);
}

describe('TaskDetailDrawer UI Component', () => {
  test('Renders task title, status, and tab controls', () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    expect(screen.getByDisplayValue('Test Parent Task Title')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText(/Subtasks/)).toBeInTheDocument();
    expect(screen.getByText('Activity Audit')).toBeInTheDocument();
    expect(screen.getByText(/Discussion/)).toBeInTheDocument();
  });

  test('Switches between detail tabs when clicked', () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    const discussionTab = screen.getByText(/Discussion/);
    fireEvent.click(discussionTab);
    expect(screen.getByText('Task Discussion Thread')).toBeInTheDocument();

    const activityTab = screen.getByText('Activity Audit');
    fireEvent.click(activityTab);
    expect(screen.getByText('Immutable Audit Trail')).toBeInTheDocument();
  });
});
