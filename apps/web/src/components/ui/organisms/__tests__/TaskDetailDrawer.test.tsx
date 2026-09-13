import React from 'react';
import { render, screen, fireEvent, waitFor, act, within } from '@testing-library/react';
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
import { createDeliveryTraceFixture } from '../../../../test/deliveryTraceFixture';

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
  listRequirementsMock,
  getRequirementMock,
  updateRequirementMock,
  listTaskRequirementLinksMock,
  createRequirementMock,
  linkRequirementMock,
  unlinkRequirementMock,
  listSubtasksMock,
  getParentTaskDeliveryTraceMock,
  deleteTaskMock,
  listBugsMock,
  updateBugMock,
} = vi.hoisted(() => ({
  getProductBriefMock: vi.fn(),
  upsertProductBriefMock: vi.fn(),
  listTaskActivitiesMock: vi.fn(),
  listRequirementsMock: vi.fn().mockResolvedValue([]),
  getRequirementMock: vi.fn(),
  updateRequirementMock: vi.fn(),
  listTaskRequirementLinksMock: vi.fn(),
  createRequirementMock: vi.fn(),
  linkRequirementMock: vi.fn(),
  unlinkRequirementMock: vi.fn(),
  listSubtasksMock: vi.fn().mockResolvedValue({ tasks: [], total: 0, page: 1, limit: 50 }),
  getParentTaskDeliveryTraceMock: vi.fn(),
  deleteTaskMock: vi.fn(),
  listBugsMock: vi.fn(),
  updateBugMock: vi.fn(),
}));

vi.mock('../../../../lib/api/bugService', () => ({
  bugService: {
    listBugs: (...args: unknown[]) => listBugsMock(...args),
    updateBug: (...args: unknown[]) => updateBugMock(...args),
  },
}));

vi.mock('../../../../lib/api/traceabilityService', () => ({
  traceabilityService: {
    getParentTaskDeliveryTrace: (...args: unknown[]) => getParentTaskDeliveryTraceMock(...args),
  },
}));

vi.mock('../../../../lib/api/requirementService', () => ({
  requirementService: {
    listRequirements: (...args: any[]) => listRequirementsMock(...args),
    getRequirement: (...args: any[]) => getRequirementMock(...args),
    updateRequirement: (...args: any[]) => updateRequirementMock(...args),
    listTaskRequirementLinks: (...args: any[]) => listTaskRequirementLinksMock(...args),
    createRequirement: (...args: any[]) => createRequirementMock(...args),
    linkRequirement: (...args: any[]) => linkRequirementMock(...args),
    unlinkRequirement: (...args: any[]) => unlinkRequirementMock(...args),
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

vi.mock('../../../../lib/api/attachmentService', () => ({
  attachmentService: {
    listAttachments: vi.fn().mockResolvedValue([]),
    deleteAttachment: vi.fn(),
    getDownloadUrl: vi.fn(),
  },
}));

vi.mock('../../../../lib/api/taskService', () => ({
  taskService: {
    listTaskActivity: listTaskActivitiesMock,
    listTaskActivities: listTaskActivitiesMock,
    listTaskComments: vi.fn().mockResolvedValue({ comments: [], total: 0, page: 1, limit: 50 }),
    listSubtasks: listSubtasksMock,
    deleteTask: deleteTaskMock,
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
      auth: {
        currentUser: role
          ? {
              id: 'user-current',
              email: `${role}@example.com`,
              name: `Test ${role}`,
              role,
              onboardingCompletedAt: '2026-08-14T00:00:00.000Z',
            }
          : null,
        isAuthenticated: Boolean(role),
        showOnboardingModal: false,
        status: role ? ('succeeded' as const) : ('idle' as const),
        error: null,
      },
      workspace: {
        workspaces: role
          ? [
              {
                id: 'ws-11111111-2222-3333-4444-555555555555',
                name: 'Test workspace',
                slug: 'test-workspace',
                ownerId: '123e4567-e89b-12d3-a456-426614174000',
                allowQaTaskCreation: false,
                role,
                createdAt: '2026-08-14T00:00:00.000Z',
                updatedAt: '2026-08-14T00:00:00.000Z',
              },
            ]
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
      title: 'Checkout Ringkasan Produk',
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
      title: 'Checkout Ringkasan Produk',
      contentMarkdown: '## Goal\nMake checkout clearer.',
      inScope: [
        {
          id: '123e4567-e89b-12d3-a456-426614174003',
          text: 'Simpand payment methods',
          position: 0,
        },
      ],
      outScope: [
        { id: '123e4567-e89b-12d3-a456-426614174004', text: 'Native mobile checkout', position: 0 },
      ],
      acceptanceCriteria: [
        {
          id: '123e4567-e89b-12d3-a456-426614174005',
          text: 'User can review payment details before confirmation',
          position: 0,
        },
      ],
      createdBy: '123e4567-e89b-12d3-a456-426614174000',
      createdAt: '2026-08-14T00:00:00.000Z',
    },
  };

  let originalEventSource: any;

  beforeEach(() => {
    vi.clearAllMocks();
    realtimeManager.disconnect();
    MockEventSource.instances = [];
    originalEventSource = (global as any).EventSource;
    (global as any).EventSource = MockEventSource;

    getProductBriefMock.mockResolvedValue(productBrief);
    upsertProductBriefMock.mockResolvedValue(productBrief);
    listRequirementsMock.mockResolvedValue([]);
    listTaskRequirementLinksMock.mockResolvedValue([]);
    getParentTaskDeliveryTraceMock.mockResolvedValue(createDeliveryTraceFixture());
    deleteTaskMock.mockResolvedValue({ success: true });
    listBugsMock.mockResolvedValue([]);
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

  test('keeps persisted detail behind an explicit loading state until initial requests settle', async () => {
    let resolveSubtasks!: (value: {
      tasks: Task[];
      total: number;
      page: number;
      limit: number;
    }) => void;
    listSubtasksMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSubtasks = resolve;
        }),
    );

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    expect(await screen.findByRole('status', { name: 'Memuat detail task' })).toBeInTheDocument();
    expect(
      screen.queryByRole('heading', { name: 'Test Parent Task Title' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('0 items')).not.toBeInTheDocument();

    await act(async () => {
      resolveSubtasks({ tasks: [], total: 0, page: 1, limit: 50 });
    });

    expect(
      await screen.findByRole('heading', { name: 'Test Parent Task Title' }),
    ).toBeInTheDocument();
    expect(screen.queryByRole('status', { name: 'Memuat detail task' })).not.toBeInTheDocument();
  });

  test('shows loading and retryable error drawers while a selected task is absent from the list', () => {
    const onRetryDetail = vi.fn();
    const { rerender } = renderWithRedux(
      <TaskDetailDrawer task={null} folders={[]} pendingTaskId={mockTask.id} onClose={vi.fn()} />,
    );

    expect(screen.getByRole('status', { name: 'Memuat detail task' })).toBeInTheDocument();

    rerender(
      <Provider
        store={configureStore({
          reducer: {
            auth: authReducer,
            task: taskReducer,
            workspace: workspaceReducer,
            ui: uiReducer,
          },
        })}
      >
        <TaskDetailDrawer
          task={null}
          folders={[]}
          pendingTaskId={mockTask.id}
          detailLoadError="Jaringan terputus"
          onRetryDetail={onRetryDetail}
          onClose={vi.fn()}
        />
      </Provider>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Jaringan terputus');
    fireEvent.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(onRetryDetail).toHaveBeenCalledOnce();
  });

  test('ignores a late initial response after the user switches to another task', async () => {
    let resolveFirstSubtasks!: (value: {
      tasks: Task[];
      total: number;
      page: number;
      limit: number;
    }) => void;
    listSubtasksMock
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirstSubtasks = resolve;
          }),
      )
      .mockResolvedValueOnce({ tasks: [], total: 0, page: 1, limit: 50 });

    const secondTask: Task = {
      ...mockTask,
      id: 'task-87654321-aaaa-bbbb-cccc-ddddeeeeffff',
      title: 'Second persisted task',
    };
    const store = configureStore({
      reducer: {
        auth: authReducer,
        task: taskReducer,
        workspace: workspaceReducer,
        ui: uiReducer,
      },
    });
    const { rerender } = render(
      <Provider store={store}>
        <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />
      </Provider>,
    );

    expect(await screen.findByRole('status', { name: 'Memuat detail task' })).toBeInTheDocument();

    rerender(
      <Provider store={store}>
        <TaskDetailDrawer task={secondTask} folders={[]} onClose={vi.fn()} />
      </Provider>,
    );

    expect(await screen.findByRole('heading', { name: secondTask.title })).toBeInTheDocument();

    await act(async () => {
      resolveFirstSubtasks({ tasks: [], total: 0, page: 1, limit: 50 });
    });

    expect(screen.getByRole('heading', { name: secondTask.title })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: mockTask.title })).not.toBeInTheDocument();
  });

  test('Renders task title, status, and tab controls', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />);

    expect(
      await screen.findByRole('heading', { name: 'Test Parent Task Title' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Ringkasan')).toBeInTheDocument();
    expect(screen.getByText(/Subtask/)).toBeInTheDocument();
    expect(screen.getByText(/^Aktivitas \(/)).toBeInTheDocument();
    expect(screen.getByText(/Diskusi/)).toBeInTheDocument();

    const drawerToolbar = screen.getByRole('toolbar', {
      name: 'Test Parent Task Title navigation and controls',
    });
    expect(drawerToolbar).toContainElement(screen.getByRole('tab', { name: 'Ringkasan' }));
    expect(drawerToolbar).toContainElement(
      screen.getByRole('button', { name: 'Kembali ke tampilan normal' }),
    );
    expect(drawerToolbar).toContainElement(screen.getByRole('button', { name: 'Tutup panel' }));
  });

  test('Switches between detail tabs when clicked', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />);

    expect(
      await screen.findByRole('heading', { name: 'Test Parent Task Title' }),
    ).toBeInTheDocument();

    const discussionTab = screen.getByRole('tab', { name: /Diskusi/ });
    fireEvent.click(discussionTab);
    expect(await screen.findByText('Diskusi Task')).toBeInTheDocument();

    const activityTab = screen.getByRole('tab', { name: /Aktivitas/ });
    fireEvent.click(activityTab);
    expect(await screen.findByText('Aktivitas & Jejak Audit')).toBeInTheDocument();
  });

  test('renders attachment deletion activity with a human-readable record name', async () => {
    listTaskActivitiesMock.mockResolvedValueOnce({
      activities: [
        {
          id: '123e4567-e89b-12d3-a456-426614174021',
          workspaceId: mockTask.workspaceId,
          taskId: mockTask.id,
          actorName: 'Product Owner Alice',
          action: 'attachment_deleted',
          metadataJson: { fileName: 'obsolete-wireframe.png', category: 'general' },
          createdAt: '2026-08-31T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');
    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: /Aktivitas/ }));

    expect(await screen.findByText('menghapus lampiran')).toBeInTheDocument();
    expect(screen.getByText('obsolete-wireframe.png')).toBeInTheDocument();
  });

  test('renders bulk Requirement deletion activity as a human-readable audit entry', async () => {
    listTaskActivitiesMock.mockResolvedValueOnce({
      activities: [
        {
          id: '123e4567-e89b-12d3-a456-426614174022',
          workspaceId: mockTask.workspaceId,
          taskId: mockTask.id,
          actorName: 'Product Owner Alice',
          action: 'requirements_bulk_deleted',
          metadataJson: { affectedCount: 9 },
          createdAt: '2026-09-11T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      limit: 50,
    });

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');
    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: /Aktivitas/ }));

    expect(await screen.findByText('9 Requirement yang keliru')).toBeInTheDocument();
  });

  test('opens Jejak Delivery inside the existing task drawer', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'qa');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Jejak Delivery' }));

    expect(
      await screen.findByRole('heading', { name: 'Jejak Delivery Feature' }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('task-delivery-trace-panel')).toBeInTheDocument();
    expect(getParentTaskDeliveryTraceMock).toHaveBeenCalledWith(mockTask.workspaceId, mockTask.id);
    expect(screen.getByRole('button', { name: 'Tutup panel' })).toBeInTheDocument();
  });

  test('opens contextual linked Bug inside the existing Task Hub drawer', async () => {
    listBugsMock.mockResolvedValueOnce([
      {
        id: '10000000-0000-4000-8000-000000000009',
        workspaceId: mockTask.workspaceId,
        featureTaskId: mockTask.id,
        requirementId: '10000000-0000-4000-8000-000000000003',
        testResultId: '10000000-0000-4000-8000-000000000004',
        assigneeId: '10000000-0000-4000-8000-000000000007',
        title: 'Checkout request returns 500',
        severity: 'critical',
        status: 'open',
        reproductionDetails: 'Submit checkout with a saved card.',
        resolutionNotes: null,
        createdBy: '10000000-0000-4000-8000-000000000008',
        resolvedAt: null,
        verifiedAt: null,
        createdAt: '2026-08-22T08:00:00.000Z',
        updatedAt: '2026-08-22T08:00:00.000Z',
        featureTask: { id: mockTask.id, title: mockTask.title },
        requirement: {
          id: '10000000-0000-4000-8000-000000000003',
          code: 'REQ-CHECKOUT',
          title: 'Simpand card payment',
        },
        assignee: {
          id: '10000000-0000-4000-8000-000000000007',
          name: 'Checkout Developer',
          email: 'dev@example.com',
        },
        originatingTestResult: {
          id: '10000000-0000-4000-8000-000000000004',
          status: 'failed',
          actualResult: 'Checkout API returned 500.',
          executedAt: '2026-08-22T08:00:00.000Z',
          testRun: {
            id: '10000000-0000-4000-8000-000000000005',
            testCaseId: '10000000-0000-4000-8000-000000000006',
            build: 'checkout-web-2026.08.22.1',
            environment: 'staging',
          },
        },
      },
    ]);

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Bug' }));

    expect(await screen.findByText('Checkout request returns 500')).toBeInTheDocument();
    expect(screen.getByText('Terbuka')).toBeInTheDocument();
    expect(screen.getByText('REQ-CHECKOUT · Simpand card payment')).toBeInTheDocument();
    expect(listBugsMock).toHaveBeenCalledWith(mockTask.workspaceId, { featureTaskId: mockTask.id });
    expect(screen.getByRole('button', { name: 'Tutup panel' })).toBeInTheDocument();
  });

  test('shows only Requirement management in the Requirement tab', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Requirement' }));

    expect(await screen.findByTestId('requirement-manager')).toBeInTheDocument();
    expect(screen.getByText('Requirement Tertaut (0)')).toBeInTheDocument();
    expect(screen.queryByText('Specification Brief')).not.toBeInTheDocument();
    expect(screen.queryByText(/QA Rencana Pengujians & Verification Docs/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New QA Doc/ })).not.toBeInTheDocument();
  });

  test('continues from a newly created Requirement to Subtask planning with it selected', async () => {
    const plannedRequirement = {
      id: 'req-guided-plan-1',
      workspaceId: mockTask.workspaceId,
      code: 'REQ-GUIDED-01',
      title: 'Guided implementation requirement',
      description: null,
      url: null,
      status: 'active' as const,
      createdBy: 'user-1',
      createdAt: '2026-09-11T00:00:00.000Z',
      updatedAt: '2026-09-11T00:00:00.000Z',
    };
    const plannedLink = {
      id: 'link-guided-plan-1',
      workspaceId: mockTask.workspaceId,
      taskId: mockTask.id,
      requirementId: plannedRequirement.id,
      linkedBy: 'user-1',
      createdAt: '2026-09-11T00:00:00.000Z',
    };
    let isLinked = false;
    listRequirementsMock.mockResolvedValue([plannedRequirement]);
    listTaskRequirementLinksMock.mockImplementation(async () => (isLinked ? [plannedLink] : []));
    createRequirementMock.mockResolvedValue(plannedRequirement);
    linkRequirementMock.mockImplementation(async () => {
      isLinked = true;
      return plannedLink;
    });

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Requirement' }));
    fireEvent.click(await screen.findByTestId('create-requirement-btn'));
    fireEvent.change(screen.getByLabelText(/Judul Requirement/i), {
      target: { value: plannedRequirement.title },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Buat & Rencanakan Subtask' }));

    const planDialog = await screen.findByRole('dialog', {
      name: `Rencanakan Subtask — ${mockTask.title}`,
    });
    expect(planDialog).toBeInTheDocument();
    expect(
      await within(planDialog).findByRole('checkbox', {
        name: /REQ-GUIDED-01.*Guided implementation requirement/i,
      }),
    ).toBeChecked();
  });

  test('shows Feature scope and external references in a separate Ringkasan Produk tab', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Ringkasan Produk' }));

    expect(await screen.findByRole('heading', { name: 'Ringkasan Produk' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Simpand payment methods')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Native mobile checkout')).toBeInTheDocument();
    expect(screen.getByLabelText('Konteks produk dan referensi eksternal')).toHaveValue(
      '## Goal\nMake checkout clearer.',
    );
    expect(screen.queryByTestId('requirement-manager')).not.toBeInTheDocument();
  });

  test('protects an unsaved Ringkasan Produk draft before changing tabs', async () => {
    const onClose = vi.fn();
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={onClose} />, 'po');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Ringkasan Produk' }));
    const titleInput = await screen.findByDisplayValue('Checkout Ringkasan Produk');

    expect(screen.queryByRole('button', { name: 'Simpan Perubahan' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tutup Detail' })).toBeInTheDocument();

    fireEvent.change(titleInput, { target: { value: 'Ringkasan Produk yang diperbarui' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tutup panel' }));

    expect(screen.getByRole('dialog', { name: 'Perubahan belum disimpan' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Tetap Mengedit' }));

    fireEvent.click(screen.getByRole('tab', { name: 'Requirement' }));

    expect(screen.getByRole('dialog', { name: 'Perubahan belum disimpan' })).toBeInTheDocument();
    expect(screen.getByDisplayValue('Ringkasan Produk yang diperbarui')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tetap Mengedit' }));
    expect(
      screen.queryByRole('dialog', { name: 'Perubahan belum disimpan' }),
    ).not.toBeInTheDocument();
    expect(screen.getByDisplayValue('Ringkasan Produk yang diperbarui')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Requirement' }));
    fireEvent.click(screen.getByRole('button', { name: 'Buang Perubahan' }));

    expect(await screen.findByTestId('requirement-manager')).toBeInTheDocument();
    expect(upsertProductBriefMock).not.toHaveBeenCalled();
  });

  test('renders Requirement Manager with structured requirement and external link', async () => {
    listRequirementsMock.mockResolvedValueOnce([
      {
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
    ]);
    listTaskRequirementLinksMock.mockResolvedValueOnce([
      {
        id: 'link-1',
        workspaceId: mockTask.workspaceId,
        taskId: mockTask.id,
        requirementId: 'req-1',
        linkedBy: 'user-1',
        createdAt: '2026-08-14T00:00:00.000Z',
      },
    ]);

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Requirement' }));

    expect(await screen.findByText('Checkout Prototype UI')).toBeInTheDocument();
    expect(screen.getByText('Tertaut ke Task ini')).toBeInTheDocument();

    const openLink = screen.getByRole('link', {
      name: /https:\/\/www.figma.com\/file\/xyz\/Checkout/,
    });
    expect(openLink).toHaveAttribute('href', 'https://www.figma.com/file/xyz/Checkout');
    expect(openLink).toHaveAttribute('target', '_blank');
    expect(openLink).toHaveAttribute('rel', 'noopener noreferrer');
  });

  test('QA and Developer roles see only linked Requirement in read-only mode', async () => {
    listRequirementsMock.mockResolvedValueOnce([
      {
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
    ]);
    listTaskRequirementLinksMock.mockResolvedValueOnce([]);

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'qa');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Requirement' }));

    expect(await screen.findByText('Requirement Tertaut (0)')).toBeInTheDocument();
    expect(screen.getByText('Belum ada Requirement tertaut')).toBeInTheDocument();
    expect(screen.queryByText('Checkout Prototype UI')).not.toBeInTheDocument();
    expect(screen.queryByText(/Requirement Workspace yang Tersedia/)).not.toBeInTheDocument();
    expect(screen.getByText('Hanya Baca')).toBeInTheDocument();
    expect(screen.queryByTestId('create-requirement-btn')).not.toBeInTheDocument();
  });

  test('renders parent tasks as read-only without a planning role', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />);

    expect(await screen.findByLabelText('Ringkasan & Deskripsi Task')).toBeDisabled();
    expect(screen.queryByText('Simpan Changes')).not.toBeInTheDocument();
    expect(screen.queryByText('Complete Task')).not.toBeInTheDocument();
  });

  test.each(['owner', 'admin', 'po'] as const)(
    'shows the delete action to %s members',
    async (role) => {
      renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, role);

      expect(await screen.findByRole('button', { name: 'Hapus Task' })).toBeInTheDocument();
    },
  );

  test.each(['dev', 'qa'] as const)('hides the delete action from %s members', async (role) => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, role);

    expect(await screen.findByRole('heading', { name: mockTask.title })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Hapus Task' })).not.toBeInTheDocument();
  });

  test('confirms deletion, calls the persisted API, closes, and refreshes Task Hub', async () => {
    const onClose = vi.fn();
    const onDataChanged = vi.fn();

    renderWithRedux(
      <TaskDetailDrawer
        task={mockTask}
        folders={[]}
        onClose={onClose}
        onDataChanged={onDataChanged}
      />,
      'po',
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Hapus Task' }));

    const confirmation = await screen.findByRole('dialog', { name: 'Hapus Task?' });
    expect(
      within(confirmation).getByText(/2 Subtask langsung juga akan dihapus/i),
    ).toBeInTheDocument();
    expect(confirmation).toHaveTextContent(
      /Tautan Requirement\/dokumen dan lampiran yang dapat dihapus harus dibersihkan lebih dahulu/i,
    );
    expect(confirmation).toHaveTextContent(
      /persetujuan QA dan keputusan rilis aktif harus dibatalkan sebelum penghapusan; bukti QA permanen dan Bug akan memblokir penghapusan/i,
    );

    fireEvent.click(within(confirmation).getByRole('button', { name: 'Hapus Task' }));

    await waitFor(() => {
      expect(deleteTaskMock).toHaveBeenCalledWith(mockTask.workspaceId, mockTask.id);
      expect(onClose).toHaveBeenCalledOnce();
      expect(onDataChanged).toHaveBeenCalledOnce();
    });
  });

  test('labels and confirms direct-link deletion as a Subtask action', async () => {
    const onClose = vi.fn();
    const onDataChanged = vi.fn();
    const directSubtask = {
      ...mockTask,
      id: '123e4567-e89b-12d3-a456-426614174099',
      parentTaskId: '123e4567-e89b-12d3-a456-426614174098',
      deliveryArea: 'frontend' as const,
      title: 'Direct-link frontend Subtask',
      subtaskSummary: undefined,
    };

    renderWithRedux(
      <TaskDetailDrawer
        task={directSubtask}
        folders={[]}
        onClose={onClose}
        onDataChanged={onDataChanged}
      />,
      'po',
    );

    fireEvent.click(await screen.findByRole('button', { name: 'Hapus Subtask' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Hapus Subtask?' });
    expect(
      within(confirmation).getByText(/Subtask akan dihapus dari tampilan aktif/i),
    ).toBeInTheDocument();
    expect(confirmation).toHaveTextContent(
      /Tautan Requirement\/dokumen dan lampiran yang dapat dihapus harus dibersihkan lebih dahulu/i,
    );
    expect(confirmation).toHaveTextContent(
      /persetujuan QA dan keputusan rilis aktif harus dibatalkan sebelum penghapusan; bukti QA permanen dan Bug akan memblokir penghapusan/i,
    );
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Hapus Subtask' }));

    await waitFor(() => {
      expect(deleteTaskMock).toHaveBeenCalledWith(directSubtask.workspaceId, directSubtask.id);
      expect(onClose).toHaveBeenCalledOnce();
      expect(onDataChanged).toHaveBeenCalledOnce();
    });
  });

  test('refreshes parent Activity after deleting a direct Subtask', async () => {
    const deletedSubtask: Task = {
      ...mockTask,
      id: '123e4567-e89b-12d3-a456-426614174097',
      parentTaskId: mockTask.id,
      deliveryArea: 'backend',
      title: 'Backend task to remove',
      subtaskSummary: undefined,
    };
    listSubtasksMock.mockResolvedValueOnce({
      tasks: [deletedSubtask],
      total: 1,
      page: 1,
      limit: 50,
    });
    listTaskActivitiesMock
      .mockResolvedValueOnce({
        activities: [],
        total: 0,
        page: 1,
        limit: 50,
      })
      .mockResolvedValueOnce({
        activities: [
          {
            id: '123e4567-e89b-12d3-a456-426614174096',
            workspaceId: mockTask.workspaceId,
            taskId: deletedSubtask.id,
            taskTitle: deletedSubtask.title,
            isSubtask: true,
            deliveryArea: 'backend',
            actorName: 'Product Owner',
            action: 'deleted',
            metadataJson: { recordType: 'subtask', title: deletedSubtask.title },
            createdAt: '2026-08-31T04:30:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
      });

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    await waitFor(() => expect(listTaskActivitiesMock).toHaveBeenCalled());
    await screen.findByRole('heading', { name: mockTask.title });
    listTaskActivitiesMock.mockClear();
    fireEvent.click(screen.getByRole('tab', { name: /Subtask/ }));
    fireEvent.click((await screen.findByText(deletedSubtask.title)).closest('button')!);
    fireEvent.click(await screen.findByRole('tab', { name: /^detail$/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Subtask' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Hapus Subtask?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Hapus Subtask' }));

    await waitFor(() =>
      expect(deleteTaskMock).toHaveBeenCalledWith(mockTask.workspaceId, deletedSubtask.id),
    );
    await waitFor(() => expect(listTaskActivitiesMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('tab', { name: /Aktivitas/ }));
    const deletedRecord = await screen.findByText(`Subtask: ${deletedSubtask.title}`);
    expect(deletedRecord.parentElement?.parentElement).toHaveTextContent(
      /menghapus sebuah Subtask/i,
    );
  });

  test('keeps the confirmation open when the delete API fails', async () => {
    const onClose = vi.fn();
    deleteTaskMock.mockRejectedValueOnce(new Error('Delete task request failed'));

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={onClose} />, 'admin');

    fireEvent.click(await screen.findByRole('button', { name: 'Hapus Task' }));
    const confirmation = await screen.findByRole('dialog', { name: 'Hapus Task?' });
    fireEvent.click(within(confirmation).getByRole('button', { name: 'Hapus Task' }));

    await waitFor(() =>
      expect(deleteTaskMock).toHaveBeenCalledWith(mockTask.workspaceId, mockTask.id),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Hapus Task?' })).toBeInTheDocument();
  });

  test('keeps Ringkasan Produk data out of the Requirement-only tab', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: 'Requirement' }));

    expect(await screen.findByTestId('requirement-manager')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Checkout Ringkasan Produk')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('Simpand payment methods')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Simpan Versi Baru' })).not.toBeInTheDocument();
    expect(upsertProductBriefMock).not.toHaveBeenCalled();
  });

  test('renders human-friendly activity timeline items with actor and action descriptions', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'po');

    await screen.findByRole('heading', { name: mockTask.title });
    fireEvent.click(screen.getByRole('tab', { name: /Aktivitas/ }));

    expect(await screen.findByText('Aktivitas & Jejak Audit')).toBeInTheDocument();
    expect(screen.getByText('Alex River')).toBeInTheDocument();
    expect(screen.getByText(/mengubah status/)).toBeInTheDocument();
  });

  test('renders empty discussion illustration when thread has no messages', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'qa');

    expect(
      await screen.findByRole('heading', { name: 'Test Parent Task Title' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Diskusi/ }));

    expect(
      await screen.findByText(/Belum ada pesan dalam diskusi ini. Mulai percakapan pertama!/i),
    ).toBeInTheDocument();

    const img = screen.getByAltText('Belum ada pesan diskusi');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024196/ChatGPT_Image_Aug_18_2026_10_33_27_AM.png',
    );
  });

  test('renders empty subtasks illustration when task has no subtasks', async () => {
    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'qa');

    expect(
      await screen.findByRole('heading', { name: 'Test Parent Task Title' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Subtask/ }));

    expect(
      await screen.findByText(/Belum ada Subtask yang dibuat di bawah Task ini./i),
    ).toBeInTheDocument();

    const img = screen.getByAltText('Belum ada Subtask');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024043/ChatGPT_Image_Aug_18_2026_10_33_31_AM.png',
    );
  });

  test('renders empty activity illustration when task has no activities', async () => {
    listTaskActivitiesMock.mockResolvedValueOnce({
      activities: [],
      total: 0,
      page: 1,
      limit: 50,
    });

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />, 'qa');

    expect(
      await screen.findByRole('heading', { name: 'Test Parent Task Title' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /Aktivitas/ }));

    expect(await screen.findByText(/Belum ada aktivitas/i)).toBeInTheDocument();

    const img = screen.getByAltText('Belum ada aktivitas');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute(
      'src',
      'https://res.cloudinary.com/dxgnzhn8l/image/upload/v1787024043/ChatGPT_Image_Aug_18_2026_10_33_31_AM.png',
    );
  });

  test('preserves user draft input and active tab when task object reference updates for the same task id', async () => {
    const { rerender } = renderWithRedux(
      <TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />,
      'po',
    );

    expect(
      await screen.findByRole('heading', { name: 'Test Parent Task Title' }),
    ).toBeInTheDocument();

    // Navigate to discussion tab
    fireEvent.click(screen.getByRole('tab', { name: /Diskusi/ }));
    expect(await screen.findByText('Diskusi Task')).toBeInTheDocument();

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
      </Provider>,
    );

    // Active tab and draft comment must NOT be lost
    expect(screen.getByText('Diskusi Task')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Write a message to your team/i)).toHaveValue(
      'My in-progress draft comment',
    );
  });

  afterEach(() => {
    realtimeManager.disconnect();
    (global as any).EventSource = originalEventSource;
  });

  test('displays unread discussion badge on Subtask tab when a message arrives on sebuah Subtask', async () => {
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

    renderWithRedux(<TaskDetailDrawer task={mockTask} folders={[]} onClose={vi.fn()} />);

    // Wait for subtasks to load and Subtasks (1) tab to appear
    expect(await screen.findByText(/Subtask \(1\)/i)).toBeInTheDocument();

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
