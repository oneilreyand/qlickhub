import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, test, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { TaskDetailDrawer } from '../TaskDetailDrawer';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import type { Task } from '@qa/contracts';

const { getProductBriefMock, upsertProductBriefMock, listTaskActivitiesMock } = vi.hoisted(() => ({
  getProductBriefMock: vi.fn(),
  upsertProductBriefMock: vi.fn(),
  listTaskActivitiesMock: vi.fn(),
}));

vi.mock('../../../../lib/api/qaDocumentService', () => ({
  qaDocumentService: {
    getProductBrief: getProductBriefMock,
    upsertProductBrief: upsertProductBriefMock,
    listTaskDocumentLinks: vi.fn().mockResolvedValue([]),
    listWorkspaceDocuments: vi.fn().mockResolvedValue([]),
    createDocument: vi.fn(),
    linkDocument: vi.fn(),
    unlinkDocument: vi.fn(),
  },
}));

vi.mock('../../../../lib/api/taskService', () => ({
  taskService: {
    listTaskActivity: listTaskActivitiesMock,
    listTaskActivities: listTaskActivitiesMock,
    listTaskComments: vi.fn().mockResolvedValue({ comments: [], total: 0, page: 1, limit: 50 }),
    listSubtasks: vi.fn().mockResolvedValue({ tasks: [], total: 0, page: 1, limit: 50 }),
    updateTask: vi.fn(),
    moveTask: vi.fn(),
    completeTask: vi.fn(),
  },
}));

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

function renderWithRedux(ui: React.ReactElement, role?: 'owner' | 'admin' | 'po' | 'dev' | 'qa') {
  const store = configureStore({
    reducer: {
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      workspace: {
        workspaces: role
          ? [{
              id: 'ws-11111111-2222-3333-4444-555555555555',
              name: 'Test workspace',
              slug: 'test-workspace',
              ownerId: '123e4567-e89b-12d3-a456-426614174000',
              allowQaTaskCreation: false,
              role,
              createdAt: '2026-08-14T00:00:00.000Z',
              updatedAt: '2026-08-14T00:00:00.000Z',
            }]
          : [],
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
  const productBrief = {
    document: {
      id: '123e4567-e89b-12d3-a456-426614174001',
      workspaceId: mockTask.workspaceId,
      title: 'Checkout Product Brief',
      docType: 'product_brief' as const,
      status: 'draft' as const,
      ownerId: '123e4567-e89b-12d3-a456-426614174000',
      currentVersion: 1,
      createdBy: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    },
    currentVersion: {
      id: '123e4567-e89b-12d3-a456-426614174002',
      workspaceId: mockTask.workspaceId,
      documentId: '123e4567-e89b-12d3-a456-426614174001',
      version: 1,
      title: 'Checkout Product Brief',
      contentMarkdown: '## Goal\nMake checkout clearer.',
      inScope: [{ id: '123e4567-e89b-12d3-a456-426614174003', text: 'Saved payment methods', position: 0 }],
      outScope: [{ id: '123e4567-e89b-12d3-a456-426614174004', text: 'Native mobile checkout', position: 0 }],
      acceptanceCriteria: [{ id: '123e4567-e89b-12d3-a456-426614174005', text: 'User can review payment details before confirmation', position: 0 }],
      createdBy: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2026-08-14T00:00:00.000Z',
    },
  };

  beforeEach(() => {
    getProductBriefMock.mockResolvedValue(productBrief);
    upsertProductBriefMock.mockResolvedValue(productBrief);
    listTaskActivitiesMock.mockResolvedValue({
      activities: [
        {
          id: '123e4567-e89b-12d3-a456-426614174020',
          workspaceId: mockTask.workspaceId,
          taskId: mockTask.id,
          actorName: 'Alex River',
          action: 'task.status_changed',
          metadataJson: { oldStatus: 'todo', newStatus: 'in_progress' },
          createdAt: '2026-08-14T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });
  });

  test('Renders task title, status, and tab controls', () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    expect(screen.getByRole('heading', { name: 'Test Parent Task Title' })).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText(/Subtasks/)).toBeInTheDocument();
    expect(screen.getByText(/^Activity \(/)).toBeInTheDocument();
    expect(screen.getByText(/Discussion/)).toBeInTheDocument();
  });

  test('Switches between detail tabs when clicked', () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    const discussionTab = screen.getByRole('button', { name: /Discussion/ });
    fireEvent.click(discussionTab);
    expect(screen.getByText('Task Discussion Thread')).toBeInTheDocument();

    const activityTab = screen.getByRole('button', { name: /Activity/ });
    fireEvent.click(activityTab);
    expect(screen.getByText('Activity & Audit Trail')).toBeInTheDocument();
  });

  test('places the Specification Brief before requirements and supporting documents', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po'
    );

    fireEvent.click(screen.getByRole('button', { name: /Specs & Requirements/ }));

    const specificationBriefHeading = await screen.findByRole('heading', { name: 'Specification Brief' });
    const requirementsHeading = screen.getByText(/Linked Workspace Requirements/);

    expect(specificationBriefHeading.compareDocumentPosition(requirementsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('renders parent tasks as read-only without a planning role', () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    expect(screen.getByLabelText('Task Overview & Description')).toBeDisabled();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
    expect(screen.queryByText('Complete Task')).not.toBeInTheDocument();
  });

  test('loads and saves the persisted Product Brief with separate scope', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po'
    );

    fireEvent.click(screen.getByRole('button', { name: /Specs & Requirements/ }));

    expect(await screen.findByDisplayValue('Checkout Product Brief')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Saved payment methods')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Native mobile checkout')).toBeInTheDocument();
    expect(screen.getByDisplayValue('User can review payment details before confirmation')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save new version' }));
    await waitFor(() => {
      expect(upsertProductBriefMock).toHaveBeenCalledWith(
        mockTask.workspaceId,
        mockTask.id,
        expect.objectContaining({
          title: 'Checkout Product Brief',
          inScope: expect.arrayContaining([expect.objectContaining({ text: 'Saved payment methods' })]),
          outScope: expect.arrayContaining([expect.objectContaining({ text: 'Native mobile checkout' })]),
          acceptanceCriteria: expect.arrayContaining([expect.objectContaining({ text: 'User can review payment details before confirmation' })]),
        })
      );
    });
  });

  test('renders human-friendly activity timeline items with actor and action descriptions', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po'
    );

    fireEvent.click(screen.getByRole('button', { name: /Activity/ }));

    expect(await screen.findByText('Activity & Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Alex River')).toBeInTheDocument();
    expect(screen.getByText(/changed status/)).toBeInTheDocument();
  });
});
