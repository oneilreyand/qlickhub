import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { CreateSubtaskModal } from '../CreateSubtaskModal';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { Task } from '@qlick/contracts';

const createSubtaskMock = vi.fn();
const listRequirementsMock = vi.fn();
const listTaskRequirementLinksMock = vi.fn();

vi.mock('../../../../lib/api/taskService', () => ({
  taskService: {
    createSubtask: (...args: any[]) => createSubtaskMock(...args),
  },
}));

vi.mock('../../../../lib/api/requirementService', () => ({
  requirementService: {
    listRequirements: (...args: any[]) => listRequirementsMock(...args),
    listTaskRequirementLinks: (...args: any[]) => listTaskRequirementLinksMock(...args),
  },
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
    listRequirementsMock.mockResolvedValue([
      {
        id: 'req-11111111-2222-4333-8444-555555555555',
        workspaceId: mockParentTask.workspaceId,
        code: 'REQ-101',
        title: 'OAuth login requirement',
        description: null,
        url: null,
        status: 'active',
        createdBy: 'user-1',
        createdAt: '2026-09-11T00:00:00.000Z',
        updatedAt: '2026-09-11T00:00:00.000Z',
      },
    ]);
    listTaskRequirementLinksMock.mockResolvedValue([
      {
        id: 'link-1',
        workspaceId: mockParentTask.workspaceId,
        taskId: mockParentTask.id,
        requirementId: 'req-11111111-2222-4333-8444-555555555555',
        linkedBy: 'user-1',
        createdAt: '2026-09-11T00:00:00.000Z',
      },
    ]);
    createSubtaskMock.mockResolvedValue({ id: 'subtask-1' });
  });

  test('Renders plan subtask modal fields when open', async () => {
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
      </Provider>,
    );

    expect(screen.getByText(/Plan Subtask — Parent Task for Planning Subtask/)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Implement API contracts/)).toBeInTheDocument();
    expect(screen.getByText(/Delivery Area/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Frontend/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Backend/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mobile/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fullstack/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /QA Testing/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Assignee')).toBeInTheDocument();
    expect(screen.getByText('Create Subtask')).toBeInTheDocument();
    expect(
      await screen.findByRole('checkbox', { name: /REQ-101.*OAuth login requirement/i }),
    ).toBeInTheDocument();

    const startDate = screen.getByLabelText('Start Date (Optional pair)');
    const dueDate = screen.getByLabelText('Due Date (Optional pair)');
    fireEvent.change(dueDate, { target: { value: '2026-09-08' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Start Date and Due Date must be provided together.',
    );
    expect(startDate).toHaveAttribute('aria-invalid', 'true');
    expect(dueDate).toHaveAttribute('aria-invalid', 'true');
  });

  test('preselects a parent Requirement and submits it with the new Subtask', async () => {
    const requirementId = 'req-11111111-2222-4333-8444-555555555555';
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
          members: [
            {
              id: 'member-dev-1',
              workspaceId: mockParentTask.workspaceId,
              userId: 'dev-1',
              role: 'dev' as const,
              specialties: ['frontend' as const],
              joinedAt: '2026-08-14T00:00:00.000Z',
              user: { id: 'dev-1', name: 'Frontend Developer', email: 'dev@example.com' },
            },
          ],
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
          initialRequirementIds={[requirementId]}
          onClose={vi.fn()}
          onCreated={vi.fn()}
        />
      </Provider>,
    );

    const requirementCheckbox = await screen.findByRole('checkbox', {
      name: /REQ-101.*OAuth login requirement/i,
    });
    expect(requirementCheckbox).toBeChecked();

    fireEvent.change(screen.getByLabelText('Subtask Title *'), {
      target: { value: 'Implement OAuth login' },
    });
    fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: 'dev-1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create Subtask' }));

    await waitFor(() => {
      expect(createSubtaskMock).toHaveBeenCalledWith(
        mockParentTask.workspaceId,
        mockParentTask.id,
        expect.objectContaining({ requirementIds: [requirementId] }),
      );
    });
  });
});
