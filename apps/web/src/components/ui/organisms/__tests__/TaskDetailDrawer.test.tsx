import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { beforeEach, afterEach, describe, test, expect, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { TaskDetailDrawer } from '../TaskDetailDrawer';
import authReducer from '../../../../store/authSlice';
import taskReducer from '../../../../store/taskSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';
import { realtimeManager } from '../../../../hooks/useRealtimeEvents';
import type { Task } from '@qlick/contracts';

class MockEventSource {
  static instances: MockEventSource[] = [];
  listeners: Record<string, ((event: any) => void)[]> = {};
  url: string;
  options: any;

  constructor(url: string, options: any) {
    this.url = url;
    this.options = options;
    MockEventSource.instances.push(this);
  }

  addEventListener(event: string, callback: (event: any) => void) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach((cb) => cb({ data: JSON.stringify({ data }) }));
    }
  }

  close() {
    this.listeners = {};
  }
}

const {
  getProductBriefMock,
  upsertProductBriefMock,
  listTaskActivitiesMock,
  listTaskRequirementLinksMock,
  createRequirementMock,
  linkRequirementMock,
  unlinkRequirementMock,
  listSubtasksMock,
} = vi.hoisted(() => ({
  getProductBriefMock: vi.fn(),
  upsertProductBriefMock: vi.fn(),
  listTaskActivitiesMock: vi.fn(),
  listTaskRequirementLinksMock: vi.fn(),
  createRequirementMock: vi.fn(),
  linkRequirementMock: vi.fn(),
  unlinkRequirementMock: vi.fn(),
  listSubtasksMock: vi.fn().mockResolvedValue({ tasks: [], total: 0, page: 1, limit: 50 }),
}));

vi.mock('../../../../lib/api/requirementService', () => ({
  requirementService: {
    listTaskRequirementLinks: listTaskRequirementLinksMock,
    createRequirement: createRequirementMock,
    linkRequirement: linkRequirementMock,
    unlinkRequirement: unlinkRequirementMock,
  },
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
    listSubtasks: listSubtasksMock,
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
      mobile: { total: 0, completed: 0 },
      fullstack: { total: 0, completed: 0 },
      qa: { total: 0, completed: 0 },
    },
  },
};

function renderWithRedux(ui: React.ReactElement, role?: 'owner' | 'admin' | 'po' | 'dev' | 'qa') {
  const store = configureStore({
    reducer: {
      auth: authReducer,
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
        isInitialized: true,
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

  let originalEventSource: any;

  beforeEach(() => {
    realtimeManager.disconnect();
    MockEventSource.instances = [];
    originalEventSource = (global as any).EventSource;
    (global as any).EventSource = MockEventSource;

    getProductBriefMock.mockResolvedValue(productBrief);
    upsertProductBriefMock.mockResolvedValue(productBrief);
    listTaskRequirementLinksMock.mockResolvedValue([]);
    createRequirementMock.mockResolvedValue({
      id: 'req-figma-1',
      workspaceId: mockTask.workspaceId,
      code: 'FIGMA-01',
      title: 'Checkout Flow UI Figma Prototype',
      url: 'https://www.figma.com/file/123/Checkout',
      status: 'active',
      createdBy: 'user-1',
    });
    linkRequirementMock.mockResolvedValue({
      id: 'link-1',
      workspaceId: mockTask.workspaceId,
      taskId: mockTask.id,
      requirementId: 'req-figma-1',
      linkedBy: 'user-1',
    });
    unlinkRequirementMock.mockResolvedValue(undefined);
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

  test('Renders task title, status, and tab controls', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    expect(await screen.findByRole('heading', { name: 'Test Parent Task Title' })).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText(/Subtasks/)).toBeInTheDocument();
    expect(screen.getByText(/^Activity \(/)).toBeInTheDocument();
    expect(screen.getByText(/Discussion/)).toBeInTheDocument();
  });

  test('Switches between detail tabs when clicked', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    expect(await screen.findByRole('heading', { name: 'Test Parent Task Title' })).toBeInTheDocument();

    const discussionTab = screen.getByRole('button', { name: /Discussion/ });
    fireEvent.click(discussionTab);
    expect(await screen.findByText('Task Discussion Thread')).toBeInTheDocument();

    const activityTab = screen.getByRole('button', { name: /Activity/ });
    fireEvent.click(activityTab);
    expect(await screen.findByText('Activity & Audit Trail')).toBeInTheDocument();
  });

  test('places the Specification Brief before requirements and supporting documents', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po'
    );

    fireEvent.click(screen.getByRole('button', { name: /Specs & Requirements/ }));

    const specificationBriefHeading = await screen.findByRole('heading', { name: 'Specification Brief' });
    const requirementsHeading = await screen.findByText(/Requirement & Reference Links/);

    expect(specificationBriefHeading.compareDocumentPosition(requirementsHeading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test('renders Requirement & Reference Links with Figma prototype and Google Sheet links and open reference button', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: mockTask.workspaceId,
        taskId: mockTask.id,
        requirementId: 'req-1',
        linkedBy: 'user-1',
        createdAt: '2026-08-14T00:00:00.000Z',
        requirement: {
          id: 'req-1',
          workspaceId: mockTask.workspaceId,
          code: 'FIGMA-01',
          title: 'Checkout Prototype UI',
          url: 'https://www.figma.com/file/xyz/Checkout',
          status: 'active',
          createdBy: 'user-1',
          createdAt: '2026-08-14T00:00:00.000Z',
          updatedAt: '2026-08-14T00:00:00.000Z',
        },
      },
      {
        id: 'link-2',
        workspaceId: mockTask.workspaceId,
        taskId: mockTask.id,
        requirementId: 'req-2',
        linkedBy: 'user-1',
        createdAt: '2026-08-14T00:00:00.000Z',
        requirement: {
          id: 'req-2',
          workspaceId: mockTask.workspaceId,
          code: 'SHEET-01',
          title: 'Coupon Calculation Matrix',
          url: 'https://docs.google.com/spreadsheets/d/abc/edit',
          status: 'active',
          createdBy: 'user-1',
          createdAt: '2026-08-14T00:00:00.000Z',
          updatedAt: '2026-08-14T00:00:00.000Z',
        },
      },
    ]);

    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po'
    );

    fireEvent.click(screen.getByRole('button', { name: /Specs & Requirements/ }));

    expect(await screen.findByText('Checkout Prototype UI')).toBeInTheDocument();
    expect(screen.getByText('Coupon Calculation Matrix')).toBeInTheDocument();
    expect(screen.getByText('Figma')).toBeInTheDocument();
    expect(screen.getByText('Spreadsheet')).toBeInTheDocument();

    const openLinks = screen.getAllByRole('link', { name: /Open Reference/ });
    expect(openLinks.length).toBe(2);
    expect(openLinks[0]).toHaveAttribute('href', 'https://www.figma.com/file/xyz/Checkout');
    expect(openLinks[0]).toHaveAttribute('target', '_blank');
    expect(openLinks[0]).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('QA and Developer roles see 1-click open reference links and guidance message without embed form', async () => {
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: mockTask.workspaceId,
        taskId: mockTask.id,
        requirementId: 'req-1',
        linkedBy: 'user-1',
        createdAt: '2026-08-14T00:00:00.000Z',
        requirement: {
          id: 'req-1',
          workspaceId: mockTask.workspaceId,
          code: 'FIGMA-01',
          title: 'Checkout Prototype UI',
          url: 'https://www.figma.com/file/xyz/Checkout',
          status: 'active',
          createdBy: 'user-1',
          createdAt: '2026-08-14T00:00:00.000Z',
          updatedAt: '2026-08-14T00:00:00.000Z',
        },
      },
    ]);

    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'qa'
    );

    fireEvent.click(screen.getByRole('button', { name: /Specs & Requirements/ }));

    expect(await screen.findByText('Checkout Prototype UI')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Reference/ })).toBeInTheDocument();
    expect(screen.getByText(/Reference links are provided by the Product Owner/)).toBeInTheDocument();
    expect(screen.queryByText(/Embed New Requirement Reference/)).not.toBeInTheDocument();
    expect(screen.queryByText('Unlink')).not.toBeInTheDocument();
  });

  test('renders parent tasks as read-only without a planning role', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    expect(await screen.findByLabelText('Task Overview & Description')).toBeDisabled();
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

  test('renders empty discussion illustration when thread has no messages', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'qa'
    );

    expect(await screen.findByRole('heading', { name: 'Test Parent Task Title' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }));

    expect(
      await screen.findByText(/No messages in this discussion thread. Be the first to start the conversation!/i)
    ).toBeInTheDocument();

    const img = screen.getByAltText('No discussion messages');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024196/ChatGPT_Image_Aug_18_2026_10_33_27_AM.png'
    );
  });

  test('renders empty subtasks illustration when task has no subtasks', async () => {
    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'qa'
    );

    expect(await screen.findByRole('heading', { name: 'Test Parent Task Title' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Subtasks/ }));

    expect(
      await screen.findByText(/No subtasks created under this task./i)
    ).toBeInTheDocument();

    const img = screen.getByAltText('No subtasks created');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024045/ChatGPT_Image_Aug_18_2026_10_32_51_AM.png'
    );
  });

  test('renders empty activity illustration when task has no activities', async () => {
    listTaskActivitiesMock.mockResolvedValueOnce({
      activities: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'qa'
    );

    expect(await screen.findByRole('heading', { name: 'Test Parent Task Title' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Activity/ }));

    expect(
      await screen.findByText(/No activity recorded yet/i)
    ).toBeInTheDocument();

    const img = screen.getByAltText('No activity recorded');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024043/ChatGPT_Image_Aug_18_2026_10_33_31_AM.png'
    );
  });

  test('preserves user draft input and active tab when task object reference updates for the same task id', async () => {
    const { rerender } = renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po'
    );

    expect(await screen.findByRole('heading', { name: 'Test Parent Task Title' })).toBeInTheDocument();

    // Navigate to discussion tab
    fireEvent.click(screen.getByRole('button', { name: /Discussion/ }));
    expect(await screen.findByText('Task Discussion Thread')).toBeInTheDocument();

    // Type a message in the composer
    const textarea = screen.getByPlaceholderText(/Write a message to your team/i);
    fireEvent.change(textarea, { target: { value: 'My in-progress draft comment' } });
    expect(textarea).toHaveValue('My in-progress draft comment');

    // Simulate task object reference change with rerender
    const updatedTaskReference = { ...mockTask, updatedAt: '2026-08-14T01:00:00.000Z' };
    rerender(
      <Provider
        store={configureStore({
          reducer: {
            auth: authReducer,
            task: taskReducer,
            workspace: workspaceReducer,
            ui: uiReducer,
          },
          preloadedState: {
            workspace: {
              workspaces: [
                {
                  id: 'ws-11111111-2222-3333-4444-555555555555',
                  name: 'Test workspace',
                  slug: 'test-workspace',
                  ownerId: '123e4567-e89b-12d3-a456-426614174000',
                  allowQaTaskCreation: false,
                  role: 'po' as const,
                  createdAt: '2026-08-14T00:00:00.000Z',
                  updatedAt: '2026-08-14T00:00:00.000Z',
                },
              ],
              activeWorkspaceId: 'ws-11111111-2222-3333-4444-555555555555',
              members: [],
              isLoading: false,
              isMembersLoading: false,
              isInitialized: true,
              error: null,
            },
          },
        })}
      >
        <TaskDetailDrawer task={updatedTaskReference} folders={[]} onClose={vi.fn()} />
      </Provider>
    );

    // Active tab and draft comment must NOT be lost
    expect(screen.getByText('Task Discussion Thread')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Write a message to your team/i)).toHaveValue('My in-progress draft comment');
  });

  afterEach(() => {
    realtimeManager.disconnect();
    (global as any).EventSource = originalEventSource;
  });

  test('displays unread discussion badge on Subtasks tab when a message arrives on a subtask', async () => {
    const mockSubtask = {
      id: 'sub-fe-99',
      workspaceId: mockTask.workspaceId,
      parentTaskId: mockTask.id,
      deliveryArea: 'frontend' as const,
      title: 'Subtask Frontend 99',
      description: 'Implement frontend UI',
      status: 'in_progress' as const,
      priority: 'high' as const,
      assigneeId: 'user-fe',
      reporterId: 'user-1',
      startDate: null,
      dueDate: null,
      completedAt: null,
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    };

    listSubtasksMock.mockResolvedValue({
      tasks: [mockSubtask],
      total: 1,
      page: 1,
      limit: 50,
    });

    renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
    );

    // Wait for subtasks to load and Subtasks (1) tab to appear
    expect(await screen.findByText(/Subtasks \(1\)/i)).toBeInTheDocument();

    // Initial state: Subtasks tab has no unread badge
    expect(screen.queryByText(/\+1 Baru/i)).not.toBeInTheDocument();

    // Verify SSE was established
    expect(MockEventSource.instances.length).toBe(1);

    // Another user posts a comment on the subtask
    const subtaskCommentPayload = {
      taskId: 'sub-fe-99',
      comment: {
        id: 'comm-sub-99',
        taskId: 'sub-fe-99',
        authorId: 'user-qa',
        body: 'Mohon update styling button nya ya.',
        createdAt: new Date().toISOString(),
      },
      authorId: 'user-qa',
      mentionedUserIds: [],
    };

    // Simulate incoming SSE event
    act(() => {
      MockEventSource.instances[0].emit('discussion:comment_created', subtaskCommentPayload);
    });

    // Subtasks tab must now display the animated unread badge: "+1 Baru"
    expect(await screen.findByText(/\+1 Baru/i)).toBeInTheDocument();
  });
});
