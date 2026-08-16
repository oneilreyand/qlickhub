import { render, screen } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CreateSubtaskModal } from '../CreateSubtaskModal';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { Task } from '@qa/contracts';

const mockParentTask: Task = {
  id: 'parent-12345678-aaaa-bbbb-cccc-ddddeeeeffff',
  workspaceId: 'ws-11111111-2222-3333-4444-555555555555',
  folderId: null,
  parentTaskId: null,
  deliveryArea: null,
  title: 'Parent Task for Planning Subtask',
  description: null,
  status: 'todo',
  priority: 'high',
  assigneeId: null,
  reporterId: 'user-1',
  position: 0,
  startDate: null,
  dueDate: null,
  completedAt: null,
  createdAt: '2026-08-14T00:00:00.000Z',
  updatedAt: '2026-08-14T00:00:00.000Z',
};

describe('CreateSubtaskModal UI Component', () => {
  test('Renders plan subtask modal fields when open', () => {
    const store = configureStore({
      reducer: {
        task: taskReducer,
        workspace: workspaceReducer,
        ui: uiReducer,
      },
      preloadedState: {
        workspace: {
          workspaces: [
            {
              id: mockParentTask.workspaceId,
              name: 'Test Workspace',
              slug: 'test-workspace',
              ownerId: 'user-1',
              role: 'owner' as const,
              createdAt: '2026-08-14T00:00:00.000Z',
              updatedAt: '2026-08-14T00:00:00.000Z',
            },
          ],
          activeWorkspaceId: mockParentTask.workspaceId,
          members: [],
          isLoading: false,
          isMembersLoading: false,
          isInitialized: true,
          error: null,
        },
      },
    });
    render(
      <Provider store={store}>
        <CreateSubtaskModal
          parentTask={mockParentTask}
          isOpen={true}
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      </Provider>
    );

    expect(screen.getByText(/Plan Subtask — Parent Task for Planning Subtask/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Implement API contracts/)).toBeInTheDocument();
    expect(screen.getByText(/Delivery Area/)).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Create Subtask')).toBeInTheDocument();
  });
});
