import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QaTestingDesk } from '../QaTestingDesk';
import authReducer from '../../../../../store/authSlice';
import taskReducer from '../../../../../store/taskSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import uiReducer from '../../../../../store/uiSlice';
import type { Task, TaskTestExecutionWorkspace, TestRun } from '@qlick/contracts';

const serviceMocks = vi.hoisted(() => ({
  getTaskTestExecutions: vi.fn(),
  createTestRun: vi.fn(),
  recordTestResult: vi.fn(),
  addTestResultEvidenceLink: vi.fn(),
  downloadTemplate: vi.fn(),
  previewImport: vi.fn(),
  commitImport: vi.fn(),
  listImportAudits: vi.fn(),
  downloadErrorReport: vi.fn(),
}));

const bugServiceMocks = vi.hoisted(() => ({
  createBug: vi.fn(),
  addBugEvidenceLink: vi.fn(),
}));

const taskServiceMocks = vi.hoisted(() => ({
  listTaskComments: vi.fn().mockResolvedValue({ comments: [] }),
  createTaskComment: vi.fn(),
  updateTask: vi.fn(),
}));

const releaseServiceMocks = vi.hoisted(() => ({
  listFeatureReleaseRecords: vi.fn(),
  createQaSignOff: vi.fn(),
  createReleaseDecision: vi.fn(),
}));

vi.mock('../../../../../lib/api/testManagementService', () => ({
  testManagementService: serviceMocks,
}));

vi.mock('../../../../../lib/api/bugService', () => ({
  bugService: bugServiceMocks,
}));

vi.mock('../../../../../lib/api/taskService', () => ({
  taskService: taskServiceMocks,
}));

vi.mock('../../../../../lib/api/releaseDecisionService', () => ({
  releaseDecisionService: releaseServiceMocks,
}));

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  feature: '10000000-0000-4000-8000-000000000002',
  subtask: '10000000-0000-4000-8000-000000000003',
  reporter: '10000000-0000-4000-8000-000000000004',
  qa: '10000000-0000-4000-8000-000000000005',
  testCase: '10000000-0000-4000-8000-000000000006',
  requirement: '10000000-0000-4000-8000-000000000007',
  run: '10000000-0000-4000-8000-000000000008',
  result: '10000000-0000-4000-8000-000000000009',
  dev: '10000000-0000-4000-8000-000000000010',
  bug: '10000000-0000-4000-8000-000000000011',
};

const now = '2026-08-22T08:00:00.000Z';

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      task: taskReducer,
      workspace: workspaceReducer,
      ui: uiReducer,
    },
    preloadedState: {
      workspace: {
        workspaces: [],
        activeWorkspaceId: ids.workspace,
        members: [
          {
            id: '10000000-0000-4000-8000-000000000012',
            workspaceId: ids.workspace,
            userId: ids.dev,
            role: 'dev' as const,
            joinedAt: now,
            user: {
              id: ids.dev,
              email: 'developer@example.com',
              name: 'Checkout Developer',
              avatarUrl: null,
            },
          },
        ],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });

const mockQaSubtask: Task = {
  id: ids.subtask,
  workspaceId: ids.workspace,
  parentTaskId: ids.feature,
  deliveryArea: 'qa',
  title: 'QA Smoke & Integration Verification',
  description: 'PR: https://github.com/org/repo/pull/12\nStaging: https://staging.app.io/checkout',
  status: 'in_progress',
  priority: 'high',
  reporterId: ids.reporter,
  assigneeId: ids.qa,
  createdAt: now,
  updatedAt: now,
};

const inProgressRun: TestRun = {
  id: ids.run,
  workspaceId: ids.workspace,
  testCaseId: ids.testCase,
  build: 'checkout-web-2026.08.22.1',
  environment: 'staging',
  status: 'in_progress',
  executorId: ids.qa,
  startedAt: now,
  completedAt: null,
  result: null,
  createdAt: now,
};

const executionWorkspace = (runs: TestRun[] = []): TaskTestExecutionWorkspace => ({
  workspaceId: ids.workspace,
  requestedTaskId: ids.subtask,
  featureTaskId: ids.feature,
  executions: [
    {
      testCase: {
        id: ids.testCase,
        workspaceId: ids.workspace,
        title: 'Returning customer completes checkout',
        externalReference: 'TC-001',
        description: 'Persisted checkout regression case.',
        testType: 'e2e',
        priority: 'high',
        status: 'active',
        scenarioKind: 'positive',
        source: 'native',
        preconditions: 'Customer has one saved card.',
        steps: ['Open checkout', 'Confirm payment'],
        expectedResult: 'Payment confirmation is displayed.',
        testData: 'Card 4242',
        requirementIds: [ids.requirement],
        createdBy: ids.reporter,
        createdAt: now,
        updatedAt: now,
      },
      latestRun: runs[0] || null,
      testRuns: runs,
    },
  ],
});

const renderDesk = (userRole = 'qa') =>
  render(
    <Provider store={createTestStore()}>
      <QaTestingDesk
        subtask={mockQaSubtask}
        workspaceId={ids.workspace}
        currentUserId={ids.qa}
        userRole={userRole}
        onDataChanged={vi.fn()}
      />
    </Provider>,
  );

describe('QaTestingDesk Organism', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.getTaskTestExecutions.mockResolvedValue({
      workspaceId: ids.workspace,
      requestedTaskId: ids.subtask,
      featureTaskId: ids.feature,
      executions: [],
    });
    serviceMocks.createTestRun.mockResolvedValue(inProgressRun);
    serviceMocks.recordTestResult.mockResolvedValue({
      ...inProgressRun,
      status: 'completed',
      completedAt: now,
      result: {
        id: ids.result,
        workspaceId: ids.workspace,
        testRunId: ids.run,
        status: 'failed',
        executorId: ids.qa,
        actualResult: 'Payment API returned 500.',
        notes: null,
        executedAt: now,
        evidence: [],
        evidenceLinks: [],
        createdAt: now,
      },
    });
    bugServiceMocks.createBug.mockResolvedValue({ id: ids.bug });
    releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue({
      workspaceId: ids.workspace,
      featureTaskId: ids.feature,
      qaSignOffs: [],
      releaseDecisions: [],
    });
  });

  it('renders Canonical Test Management workspace with Native Authoring and Import buttons for Planners', async () => {
    renderDesk('po');

    expect(await screen.findByText('No Test Cases linked to this Feature')).toBeInTheDocument();
    expect(screen.getByText('QA Testing & Quality Desk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /New Test Case/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Import Spreadsheet/i })).toBeInTheDocument();
  });

  it('hides Native Authoring and Import buttons for QA role under ADR-001', async () => {
    renderDesk('qa');

    expect(await screen.findByText('No Test Cases linked to this Feature')).toBeInTheDocument();
    expect(screen.getByText('QA Testing & Quality Desk')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New Test Case/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Import Spreadsheet/i })).not.toBeInTheDocument();
  });

  it('refetches and renders persisted Test Case and Run history after reopening', async () => {
    const completedRun: TestRun = {
      ...inProgressRun,
      status: 'completed',
      completedAt: now,
      result: {
        id: ids.result,
        workspaceId: ids.workspace,
        testRunId: ids.run,
        status: 'passed',
        executorId: ids.qa,
        actualResult: 'Payment confirmation displayed.',
        notes: null,
        executedAt: now,
        evidence: [],
        evidenceLinks: [],
        createdAt: now,
      },
    };
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace([completedRun]));

    const firstRender = renderDesk();
    expect(await screen.findByText('Returning customer completes checkout')).toBeInTheDocument();
    expect(screen.getByText('checkout-web-2026.08.22.1')).toBeInTheDocument();
    firstRender.unmount();

    renderDesk();
    expect(await screen.findByText('Payment confirmation displayed.')).toBeInTheDocument();
    expect(serviceMocks.getTaskTestExecutions).toHaveBeenCalledTimes(2);
  });

  it('starts a persisted Test Run with build and environment', async () => {
    const user = userEvent.setup();
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace());
    renderDesk();

    await user.click(
      await screen.findByRole('button', {
        name: 'Start Test Run for Returning customer completes checkout',
      }),
    );
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Build'), 'checkout-web-2026.08.22.1');
    await user.clear(within(dialog).getByLabelText('Environment'));
    await user.type(within(dialog).getByLabelText('Environment'), 'qa-staging');
    await user.click(within(dialog).getByRole('button', { name: 'Start Test Run' }));

    await waitFor(() =>
      expect(serviceMocks.createTestRun).toHaveBeenCalledWith(ids.workspace, ids.testCase, {
        build: 'checkout-web-2026.08.22.1',
        environment: 'qa-staging',
      }),
    );
  });

  it('records a Result for the active persisted Run with evidence links', async () => {
    const user = userEvent.setup();
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace([inProgressRun]));
    const qaRender = renderDesk();

    await user.click(
      await screen.findByRole('button', {
        name: 'Record Result for Returning customer completes checkout',
      }),
    );
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Result status'), 'failed');
    await user.type(within(dialog).getByLabelText('Actual result'), 'Payment API returned 500.');
    await user.click(within(dialog).getByRole('button', { name: 'Record Result' }));

    await waitFor(() =>
      expect(serviceMocks.recordTestResult).toHaveBeenCalledWith(
        ids.workspace,
        ids.testCase,
        ids.run,
        {
          status: 'failed',
          actualResult: 'Payment API returned 500.',
          notes: null,
          evidenceAttachmentIds: [],
          evidenceLinks: [],
        },
      ),
    );
    qaRender.unmount();

    renderDesk('po');
    expect(await screen.findByText('Read-only test inspection')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Start Test Run for/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Record Result for/ })).not.toBeInTheDocument();
  });

  it('opens Defect Report modal when clicking Log Defect button', async () => {
    const user = userEvent.setup();
    serviceMocks.getTaskTestExecutions.mockResolvedValue(
      executionWorkspace([
        {
          ...inProgressRun,
          status: 'completed',
          completedAt: now,
          result: {
            id: ids.result,
            workspaceId: ids.workspace,
            testRunId: ids.run,
            status: 'failed',
            executorId: ids.qa,
            actualResult: 'Checkout API returned 500.',
            notes: null,
            executedAt: now,
            evidence: [],
            evidenceLinks: [],
            createdAt: now,
          },
        },
      ]),
    );
    renderDesk();
    await screen.findByText('Returning customer completes checkout');
    await user.click(screen.getByRole('button', { name: 'Log Defect' }));

    expect(screen.getByText('Open Linked Bug')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/E.g. Checkout button unresponsive on mobile viewport/i),
    ).toBeInTheDocument();
  });

  it('creates a first-class Bug from persisted evidence without updating Task reviewNotes or status', async () => {
    const user = userEvent.setup();
    const failedRun: TestRun = {
      ...inProgressRun,
      status: 'completed',
      completedAt: now,
      result: {
        id: ids.result,
        workspaceId: ids.workspace,
        testRunId: ids.run,
        status: 'failed',
        executorId: ids.qa,
        actualResult: 'Checkout API returned 500.',
        notes: null,
        executedAt: now,
        evidence: [],
        evidenceLinks: [],
        createdAt: now,
      },
    };
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace([failedRun]));
    renderDesk();

    await screen.findByText('Returning customer completes checkout');
    await user.click(screen.getByRole('button', { name: 'Log Defect' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Originating failed or blocked Result')).toHaveValue(
      `${ids.result}:${ids.requirement}`,
    );
    expect(within(dialog).getByLabelText('Developer assignee')).toHaveValue(ids.dev);
    await user.type(
      within(dialog).getByLabelText('Defect title / summary'),
      'Checkout request returns 500',
    );
    await user.type(
      within(dialog).getByLabelText('Steps to reproduce and expected vs actual'),
      'Open checkout and submit a saved card. Expected success; actual HTTP 500.',
    );
    await user.selectOptions(within(dialog).getByLabelText('Severity level'), 'critical');
    await user.click(within(dialog).getByRole('button', { name: 'Submit Defect Report' }));

    await waitFor(() =>
      expect(bugServiceMocks.createBug).toHaveBeenCalledWith(ids.workspace, {
        featureTaskId: ids.feature,
        requirementId: ids.requirement,
        testResultId: ids.result,
        assigneeId: ids.dev,
        title: 'Checkout request returns 500',
        severity: 'critical',
        reproductionDetails:
          'Open checkout and submit a saved card. Expected success; actual HTTP 500.',
      }),
    );
    expect(taskServiceMocks.updateTask).not.toHaveBeenCalled();
  });
});
