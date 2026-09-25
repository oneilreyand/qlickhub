import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter } from 'react-router-dom';
import { CreateSubtaskModal } from '../CreateSubtaskModal';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { Task } from '@qlick/contracts';

const createSubtaskMock = vi.fn();
const listRequirementsMock = vi.fn();
const listTaskRequirementLinksMock = vi.fn();
const previewAssignmentConflictMock = vi.fn();

vi.mock('../../../../lib/api/capacityService', () => ({
  capacityService: {
    previewAssignmentConflict: (...args: any[]) => previewAssignmentConflictMock(...args),
  },
}));

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
        <MemoryRouter>
          <CreateSubtaskModal
            parentTask={mockParentTask}
            isOpen={true}
            onClose={vi.fn()}
            onCreated={vi.fn()}
          />
        </MemoryRouter>
      </Provider>,
    );

    expect(
      screen.getByText(/Rencanakan Subtask — Parent Task for Planning Subtask/),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Implementasi kontrak API/)).toBeInTheDocument();
    expect(screen.getByText(/Area Delivery/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Frontend/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Backend/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Mobile/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fullstack/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /QA Testing/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Pelaksana')).toBeInTheDocument();
    expect(screen.getByText('Buat Subtask')).toBeInTheDocument();
    expect(
      await screen.findByRole('checkbox', { name: /REQ-101.*OAuth login requirement/i }),
    ).toBeInTheDocument();

    const startDate = screen.getByLabelText('Tanggal Mulai (pasangan opsional)');
    const dueDate = screen.getByLabelText('Tanggal Tenggat (pasangan opsional)');
    fireEvent.change(dueDate, { target: { value: '2026-09-08' } });
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Tanggal mulai dan tanggal tenggat harus diisi bersama.',
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
        <MemoryRouter>
          <CreateSubtaskModal
            parentTask={mockParentTask}
            isOpen={true}
            initialRequirementIds={[requirementId]}
            onClose={vi.fn()}
            onCreated={vi.fn()}
          />
        </MemoryRouter>
      </Provider>,
    );

    const requirementCheckbox = await screen.findByRole('checkbox', {
      name: /REQ-101.*OAuth login requirement/i,
    });
    expect(requirementCheckbox).toBeChecked();

    fireEvent.change(screen.getByLabelText('Judul Subtask *'), {
      target: { value: 'Implement OAuth login' },
    });
    fireEvent.change(screen.getByLabelText('Pelaksana'), { target: { value: 'dev-1' } });
    fireEvent.change(screen.getByLabelText('Tanggal Mulai (pasangan opsional)'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(screen.getByLabelText('Tanggal Tenggat (pasangan opsional)'), {
      target: { value: '2026-09-05' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buat Subtask' }));

    await waitFor(() => {
      expect(createSubtaskMock).toHaveBeenCalledWith(
        mockParentTask.workspaceId,
        mockParentTask.id,
        expect.objectContaining({
          requirementIds: [requirementId],
          startDate: '2026-09-01',
          dueDate: '2026-09-05',
        }),
      );
    });
  });

  test('displays advisory conflict banner when schedule overlap is detected and permits submission', async () => {
    previewAssignmentConflictMock.mockResolvedValue({
      hasConflict: true,
      conflicts: [
        {
          subtaskId: 'sub-existing',
          title: 'Existing Feature Subtask',
          deliveryArea: 'frontend',
          status: 'in_progress',
          startDate: '2026-09-02',
          dueDate: '2026-09-06',
          isRedacted: false,
          workspaceId: mockParentTask.workspaceId,
          workspaceName: 'Test Workspace',
        },
      ],
      redactedCrossWorkspaceCount: 1,
      unscheduledActiveCount: 2,
      assigneeId: 'dev-1',
    });

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
        <MemoryRouter>
          <CreateSubtaskModal
            parentTask={mockParentTask}
            isOpen={true}
            onClose={vi.fn()}
            onCreated={vi.fn()}
          />
        </MemoryRouter>
      </Provider>,
    );

    fireEvent.change(screen.getByLabelText('Judul Subtask *'), {
      target: { value: 'Subtask with advisory conflict' },
    });
    fireEvent.change(screen.getByLabelText('Pelaksana'), { target: { value: 'dev-1' } });
    fireEvent.change(screen.getByLabelText('Tanggal Mulai (pasangan opsional)'), {
      target: { value: '2026-09-01' },
    });
    fireEvent.change(screen.getByLabelText('Tanggal Tenggat (pasangan opsional)'), {
      target: { value: '2026-09-05' },
    });

    // Wait for debounced conflict preview to render advisory banner
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'Peringatan Irisan Jadwal (Advisory)' }),
      ).toBeInTheDocument();
      expect(screen.getByText('Existing Feature Subtask')).toBeInTheDocument();
      expect(screen.getByText('Tidak Memblokir Simpan')).toBeInTheDocument();
    });

    // Crucial business rule: Assignment remains strictly advisory, user CAN still submit!
    fireEvent.click(screen.getByRole('button', { name: 'Buat Subtask' }));

    await waitFor(() => {
      expect(createSubtaskMock).toHaveBeenCalledWith(
        mockParentTask.workspaceId,
        mockParentTask.id,
        expect.objectContaining({
          title: 'Subtask with advisory conflict',
          assigneeId: 'dev-1',
          startDate: '2026-09-01',
          dueDate: '2026-09-05',
        }),
      );
    });
  });
});
