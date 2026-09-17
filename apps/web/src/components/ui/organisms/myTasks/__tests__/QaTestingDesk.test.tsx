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
  getQaWorkflowSummary: vi.fn(),
  listTestCaseVersionCoverage: vi.fn(),
  listQaTestCycles: vi.fn(),
  createQaTestCycle: vi.fn(),
  listTestCaseVersionAcceptanceCriteria: vi.fn(),
  replaceTestCaseVersionAcceptanceCriteria: vi.fn(),
  createTestCase: vi.fn(),
  updateTestCase: vi.fn(),
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
  createRetestAttempt: vi.fn(),
  listBugs: vi.fn(),
  updateBug: vi.fn(),
  createResolutionEvent: vi.fn(),
  createRetestRun: vi.fn(),
  getRetestHistory: vi.fn(),
}));

const taskServiceMocks = vi.hoisted(() => ({
  listTaskComments: vi.fn().mockResolvedValue({ comments: [] }),
  createTaskComment: vi.fn(),
  updateTask: vi.fn(),
  getAttachmentDownloadUrl: vi.fn(),
}));

const requirementServiceMocks = vi.hoisted(() => ({
  listRequirements: vi.fn(),
  listTaskRequirementLinks: vi.fn(),
  getRequirement: vi.fn(),
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

vi.mock('../../../../../lib/api/requirementService', () => ({
  requirementService: requirementServiceMocks,
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
  resolution: '10000000-0000-4000-8000-000000000014',
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

const mockFeatureTask: Task = {
  id: ids.feature,
  workspaceId: ids.workspace,
  parentTaskId: null,
  deliveryArea: null,
  title: 'Checkout Feature',
  description: null,
  status: 'in_progress',
  priority: 'high',
  reporterId: ids.reporter,
  assigneeId: ids.reporter,
  createdAt: now,
  updatedAt: now,
};

const activeRequirement = {
  id: ids.requirement,
  workspaceId: ids.workspace,
  code: 'UAT-MCU-001',
  title: 'Open the mass MCU registration menu',
  description: null,
  url: null,
  status: 'active' as const,
  createdBy: ids.reporter,
  createdAt: now,
  updatedAt: now,
};

const inProgressRun: TestRun = {
  id: ids.run,
  workspaceId: ids.workspace,
  testCaseId: ids.testCase,
  featureTaskId: null,
  qaSubtaskId: null,
  testCycleId: null,
  testCaseVersionId: null,
  readinessBaselineId: null,
  candidateFingerprint: null,
  retestBugId: null,
  retestResolutionEventId: null,
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

const renderDesk = (userRole = 'qa', subtask: Task = mockQaSubtask, currentUserId = ids.qa) =>
  render(
    <Provider store={createTestStore()}>
      <QaTestingDesk
        subtask={subtask}
        parentTask={mockFeatureTask}
        workspaceId={ids.workspace}
        currentUserId={currentUserId}
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
    serviceMocks.getQaWorkflowSummary.mockResolvedValue({
      workspaceId: ids.workspace,
      featureTaskId: ids.feature,
      qaSubtaskId: ids.subtask,
      featureTitle: 'Checkout Feature',
      qaSubtaskTitle: 'QA checkout',
      qaSubtaskStatus: 'in_progress',
      testCycle: null,
      blockers: ['qa_test_cycle_missing'],
      nextAction: { code: 'create_test_cycle', label: 'Buat Siklus Pengujian' },
    });
    serviceMocks.listTestCaseVersionCoverage.mockResolvedValue([]);
    serviceMocks.listQaTestCycles.mockResolvedValue([]);
    serviceMocks.createQaTestCycle.mockResolvedValue({
      id: '10000000-0000-4000-8000-000000000098',
      workspaceId: ids.workspace,
      featureTaskId: ids.feature,
      qaSubtaskId: ids.subtask,
      readinessBaselineId: '10000000-0000-4000-8000-000000000097',
      candidateFingerprint: 'commit:checkout-1',
      build: 'checkout-web-2026.08.22.1',
      environment: 'staging',
      status: 'in_progress',
      ownerQaId: ids.qa,
      createdAt: now,
      updatedAt: now,
    });
    serviceMocks.listTestCaseVersionAcceptanceCriteria.mockResolvedValue({
      testCaseVersionId: '10000000-0000-4000-8000-000000000099',
      mappings: [],
    });
    serviceMocks.replaceTestCaseVersionAcceptanceCriteria.mockResolvedValue({
      testCaseVersionId: '10000000-0000-4000-8000-000000000099',
      mappings: [],
    });
    serviceMocks.createTestRun.mockResolvedValue(inProgressRun);
    serviceMocks.createTestCase.mockResolvedValue({
      ...executionWorkspace().executions[0].testCase,
      title: 'QA can author the first Test Case',
      status: 'draft',
    });
    serviceMocks.updateTestCase.mockResolvedValue({
      ...executionWorkspace().executions[0].testCase,
      status: 'active',
    });
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
    bugServiceMocks.createRetestAttempt.mockResolvedValue({ outcome: 'reopened' });
    bugServiceMocks.listBugs.mockResolvedValue([]);
    taskServiceMocks.updateTask.mockResolvedValue({ ...mockQaSubtask, status: 'done' });
    releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue({
      workspaceId: ids.workspace,
      featureTaskId: ids.feature,
      qaSignOffs: [],
      releaseDecisions: [],
    });
    requirementServiceMocks.listRequirements.mockResolvedValue([activeRequirement]);
    requirementServiceMocks.listTaskRequirementLinks.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000013',
        workspaceId: ids.workspace,
        taskId: ids.feature,
        requirementId: ids.requirement,
        linkedBy: ids.reporter,
        createdAt: now,
      },
    ]);
    requirementServiceMocks.getRequirement.mockResolvedValue({
      requirement: activeRequirement,
      linkedTasks: [],
      acceptanceCriteria: [],
    });
  });

  it('shows the backend-derived workflow scope, blocker, and next action', async () => {
    renderDesk();

    expect(await screen.findByText('Ringkasan Workflow QA')).toBeInTheDocument();
    expect(screen.getByText('Berikutnya: Buat Siklus Pengujian')).toBeInTheDocument();
    expect(
      screen.getByText(/Buat Siklus Pengujian untuk kandidat yang akan diuji/),
    ).toBeInTheDocument();
    expect(serviceMocks.getQaWorkflowSummary).toHaveBeenCalledWith(ids.workspace, ids.subtask);
  });

  it('shows linked Bug history in the QA desk instead of sending QA to another queue', async () => {
    const user = userEvent.setup();
    renderDesk();

    await user.click(await screen.findByRole('tab', { name: 'Bug & Retest' }));

    expect(await screen.findByText('Bug Tertaut')).toBeInTheDocument();
    expect(bugServiceMocks.listBugs).toHaveBeenCalledWith(ids.workspace, {
      featureTaskId: ids.feature,
    });
  });

  it('completes assigned QA eksekusi directly without a self-review step', async () => {
    const user = userEvent.setup();
    serviceMocks.getQaWorkflowSummary.mockResolvedValue({
      workspaceId: ids.workspace,
      featureTaskId: ids.feature,
      qaSubtaskId: ids.subtask,
      featureTitle: 'Checkout Feature',
      qaSubtaskTitle: 'QA checkout',
      qaSubtaskStatus: 'in_progress',
      testCycle: {
        id: '10000000-0000-4000-8000-000000000097',
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        qaSubtaskId: ids.subtask,
        readinessBaselineId: '10000000-0000-4000-8000-000000000098',
        candidateFingerprint: 'commit:checkout-1',
        build: 'checkout-web-2026.08.22.1',
        environment: 'staging',
        status: 'in_progress',
        ownerQaId: ids.qa,
        createdAt: now,
        updatedAt: now,
      },
      blockers: [],
      nextAction: { code: 'complete_qa_subtask', label: 'Selesaikan Eksekusi QA' },
    });
    renderDesk();

    expect(screen.queryByRole('button', { name: 'Submit for Review' })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Menyelesaikan Subtask QA hanya mencatat eksekusi pengujian yang ditugaskan/i,
      ),
    ).toBeInTheDocument();
    const completeButton = screen.getByRole('button', { name: 'Selesaikan Eksekusi QA' });
    await waitFor(() => expect(completeButton).toBeEnabled());
    await user.click(completeButton);

    await waitFor(() =>
      expect(taskServiceMocks.updateTask).toHaveBeenCalledWith(ids.workspace, ids.subtask, {
        status: 'done',
        reviewNotes: undefined,
      }),
    );
  });

  it('fails closed before QA completion and sign-off when the persisted workflow has blockers', async () => {
    const user = userEvent.setup();
    renderDesk();

    const completeButton = screen.getByRole('button', { name: 'Selesaikan Eksekusi QA' });
    await waitFor(() => expect(completeButton).toBeDisabled());
    expect(completeButton).toHaveAttribute(
      'title',
      'Selesaikan langkah berikutnya terlebih dahulu: Buat Siklus Pengujian.',
    );

    await user.click(screen.getByRole('tab', { name: 'Persetujuan & Riwayat' }));
    expect(await screen.findByText('Persetujuan QA masih memiliki prasyarat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Catat Persetujuan QA' })).toBeDisabled();
  });

  it('reopens completed QA eksekusi with an auditable reason', async () => {
    const user = userEvent.setup();
    const completedSubtask = { ...mockQaSubtask, status: 'done' as const };
    taskServiceMocks.updateTask.mockResolvedValue({
      ...completedSubtask,
      status: 'in_progress',
    });
    renderDesk('qa', completedSubtask);

    await user.click(screen.getByRole('button', { name: 'Buka Kembali Eksekusi QA' }));

    await waitFor(() =>
      expect(taskServiceMocks.updateTask).toHaveBeenCalledWith(ids.workspace, ids.subtask, {
        status: 'in_progress',
        reviewNotes: 'Dibuka kembali untuk retest.',
      }),
    );
  });

  it('offers an explicit recovery path for legacy QA subtasks in review', async () => {
    const user = userEvent.setup();
    const legacySubtask = { ...mockQaSubtask, status: 'in_review' as const };
    renderDesk('qa', legacySubtask);

    await user.click(await screen.findByRole('tab', { name: 'Persetujuan & Riwayat' }));
    await screen.findByText('Belum ada Persetujuan QA');
    expect(screen.getByRole('button', { name: 'Lanjutkan Pengujian' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Selesaikan Eksekusi QA' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Approve Quality/i })).not.toBeInTheDocument();
  });

  it('keeps QA Subtask status actions hidden from a QA member who is not the assignee', async () => {
    renderDesk('qa', mockQaSubtask, ids.reporter);

    await screen.findByText('Belum ada Test Case yang tertaut ke Feature ini');
    expect(
      screen.queryByRole('button', { name: 'Selesaikan Eksekusi QA' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Catat Bug' })).not.toBeInTheDocument();
  });

  it('progressively discloses one QA workflow stage at a time with keyboard navigation', async () => {
    const user = userEvent.setup();
    renderDesk();

    expect(screen.getByRole('tab', { name: 'Persiapan & Eksekusi' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel', { name: 'Persiapan dan eksekusi QA' })).toBeInTheDocument();

    await user.click(screen.getByRole('tab', { name: 'Bug & Retest' }));
    expect(screen.getByRole('tab', { name: 'Bug & Retest' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel', { name: 'Bug dan retest' })).toBeInTheDocument();
    expect(
      screen.queryByRole('tabpanel', { name: 'Persiapan dan eksekusi QA' }),
    ).not.toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Persetujuan & Riwayat' })).toHaveFocus();
    expect(
      screen.getByRole('tabpanel', { name: 'Persetujuan QA dan riwayat' }),
    ).toBeInTheDocument();
  });

  it('keeps PO in a review-only Test Case and execution view', async () => {
    renderDesk('po');

    expect(
      await screen.findByText('Belum ada Test Case yang tertaut ke Feature ini'),
    ).toBeInTheDocument();
    expect(screen.getByText('Area Pengujian & Mutu QA')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Test Case Baru/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Impor Spreadsheet/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mulai Pengujian/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Selesaikan Eksekusi QA/i }),
    ).not.toBeInTheDocument();
  });

  it('shows latest AC coverage for a Test Case revision without granting a mutation action', async () => {
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace());
    serviceMocks.listTestCaseVersionCoverage.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000099',
        revision: 2,
        lifecycleStatus: 'draft',
        mappedCount: 1,
        excludedCount: 1,
        createdAt: now,
      },
    ]);
    renderDesk('po');

    expect(await screen.findByText('Rev 2 · AC 1 mapped · 1 excluded')).toBeInTheDocument();
  });

  it('lets QA map a draft revision to an active Acceptance Criterion', async () => {
    const user = userEvent.setup();
    const draftWorkspace = executionWorkspace();
    draftWorkspace.executions[0].testCase.status = 'draft';
    serviceMocks.getTaskTestExecutions.mockResolvedValue(draftWorkspace);
    serviceMocks.listTestCaseVersionCoverage.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000099',
        revision: 2,
        lifecycleStatus: 'draft',
        mappedCount: 0,
        excludedCount: 0,
        createdAt: now,
      },
    ]);
    requirementServiceMocks.getRequirement.mockResolvedValue({
      requirement: activeRequirement,
      linkedTasks: [],
      acceptanceCriteria: [
        {
          id: '10000000-0000-4000-8000-000000000014',
          workspaceId: ids.workspace,
          requirementId: ids.requirement,
          sequence: 1,
          code: 'AC-1',
          text: 'Payment confirmation is displayed.',
          status: 'active',
          createdBy: ids.reporter,
          createdAt: now,
          updatedAt: now,
        },
      ],
    });

    renderDesk('qa');
    await user.click(
      await screen.findByRole('button', {
        name: 'Petakan Acceptance Criterion untuk Returning customer completes checkout',
      }),
    );

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('checkbox', { name: 'Pilih AC-1' }));
    await user.click(within(dialog).getByRole('button', { name: 'Simpan Pemetaan' }));

    await waitFor(() =>
      expect(serviceMocks.replaceTestCaseVersionAcceptanceCriteria).toHaveBeenCalledWith(
        ids.workspace,
        ids.testCase,
        '10000000-0000-4000-8000-000000000099',
        [
          {
            acceptanceCriterionId: '10000000-0000-4000-8000-000000000014',
            mappingStatus: 'mapped',
            exclusionReason: undefined,
          },
        ],
      ),
    );
  });

  it('lets QA author the first Test Case from active Requirement linked to the Feature', async () => {
    const user = userEvent.setup();
    renderDesk('qa');

    expect(
      await screen.findByText('Belum ada Test Case yang tertaut ke Feature ini'),
    ).toBeInTheDocument();
    const createButton = screen.getByRole('button', { name: /Test Case Baru/i });
    await waitFor(() => expect(createButton).toBeEnabled());
    await user.click(createButton);

    const dialog = screen.getByRole('dialog');
    expect(
      within(dialog).getByRole('button', {
        name: /UAT-MCU-001 Open the mass MCU registration menu/i,
      }),
    ).toBeInTheDocument();
    await user.type(
      within(dialog).getByPlaceholderText(/Verifikasi checkout kartu pelanggan lama/i),
      'QA can author the first Test Case',
    );
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Jenis Skenario' }),
      'edge',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Simpan Draf' }));

    await waitFor(() =>
      expect(serviceMocks.createTestCase).toHaveBeenCalledWith(ids.workspace, {
        title: 'QA can author the first Test Case',
        priority: 'medium',
        status: 'draft',
        scenarioKind: 'edge',
        source: 'native',
        testType: 'manual',
        preconditions: null,
        steps: [],
        expectedResult: null,
        testData: null,
        requirementIds: [ids.requirement],
      }),
    );
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
    serviceMocks.listTestCaseVersionCoverage.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000099',
        revision: 1,
        lifecycleStatus: 'active',
        mappedCount: 1,
        excludedCount: 0,
        createdAt: now,
      },
    ]);
    serviceMocks.listQaTestCycles.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000098',
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        qaSubtaskId: ids.subtask,
        readinessBaselineId: '10000000-0000-4000-8000-000000000097',
        candidateFingerprint: 'commit:checkout-1',
        build: 'checkout-web-2026.08.22.1',
        environment: 'staging',
        status: 'in_progress',
        ownerQaId: ids.qa,
        createdAt: now,
        updatedAt: now,
      },
    ]);
    renderDesk();

    await user.click(
      await screen.findByRole('button', {
        name: 'Mulai Pengujian untuk Returning customer completes checkout',
      }),
    );
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Mulai Pengujian' }));

    await waitFor(() =>
      expect(serviceMocks.createTestRun).toHaveBeenCalledWith(ids.workspace, ids.testCase, {
        featureTaskId: ids.feature,
        qaSubtaskId: ids.subtask,
        testCycleId: '10000000-0000-4000-8000-000000000098',
        testCaseVersionId: '10000000-0000-4000-8000-000000000099',
        candidateFingerprint: 'commit:checkout-1',
        build: 'checkout-web-2026.08.22.1',
        environment: 'staging',
      }),
    );
  });

  it('lets PO activate a QA Test Case that is awaiting review without granting eksekusi access', async () => {
    const user = userEvent.setup();
    const reviewWorkspace = executionWorkspace();
    reviewWorkspace.executions[0].testCase.status = 'in_review';
    serviceMocks.getTaskTestExecutions.mockResolvedValue(reviewWorkspace);

    renderDesk('po');

    await user.click(
      await screen.findByRole('button', {
        name: 'Aktifkan Test Case Returning customer completes checkout',
      }),
    );

    await waitFor(() =>
      expect(serviceMocks.updateTestCase).toHaveBeenCalledWith(ids.workspace, ids.testCase, {
        status: 'active',
      }),
    );
    expect(screen.queryByRole('button', { name: /Mulai Pengujian untuk/ })).not.toBeInTheDocument();
  });

  it('lets QA submit a draft Test Case for Product Owner review without granting activation access', async () => {
    const user = userEvent.setup();
    const draftWorkspace = executionWorkspace();
    draftWorkspace.executions[0].testCase.status = 'draft';
    serviceMocks.getTaskTestExecutions.mockResolvedValue(draftWorkspace);

    renderDesk('qa');

    await user.click(
      await screen.findByRole('button', {
        name: 'Ajukan Test Case Returning customer completes checkout untuk review',
      }),
    );

    await waitFor(() =>
      expect(serviceMocks.updateTestCase).toHaveBeenCalledWith(ids.workspace, ids.testCase, {
        status: 'in_review',
      }),
    );
    expect(screen.queryByRole('button', { name: /Aktifkan Test Case/ })).not.toBeInTheDocument();
  });

  it('records a Result for the active persisted Run with evidence links', async () => {
    const user = userEvent.setup();
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace([inProgressRun]));
    const qaRender = renderDesk();

    await user.click(
      await screen.findByRole('button', {
        name: 'Catat hasil untuk Returning customer completes checkout',
      }),
    );
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Status hasil'), 'failed');
    await user.type(within(dialog).getByLabelText('Hasil aktual'), 'Payment API returned 500.');
    await user.click(within(dialog).getByRole('button', { name: 'Tambah Tautan' }));
    await user.type(
      within(dialog).getByPlaceholderText('https://www.youtube.com/watch?v=... or image URL'),
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Catat Hasil' }));

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
          evidenceLinks: [{ url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', label: undefined }],
        },
      ),
    );
    qaRender.unmount();

    renderDesk('po');
    expect(await screen.findByText('Pengujian hanya dapat dilihat')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mulai Pengujian untuk/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Catat hasil untuk/ })).not.toBeInTheDocument();
  });

  it('automatically finalizes the Bug outcome after recording a contextual retest Result', async () => {
    const user = userEvent.setup();
    const contextualRun: TestRun = {
      ...inProgressRun,
      retestBugId: ids.bug,
      retestResolutionEventId: ids.resolution,
    };
    const completedContextualRun: TestRun = {
      ...contextualRun,
      status: 'completed',
      completedAt: now,
      result: {
        id: ids.result,
        workspaceId: ids.workspace,
        testRunId: ids.run,
        status: 'failed',
        executorId: ids.qa,
        actualResult: 'Payment API still returned 500.',
        notes: null,
        executedAt: now,
        evidence: [],
        evidenceLinks: [],
        createdAt: now,
      },
    };
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace([contextualRun]));
    serviceMocks.recordTestResult.mockResolvedValue(completedContextualRun);
    renderDesk();

    await user.click(
      await screen.findByRole('button', {
        name: 'Catat hasil untuk Returning customer completes checkout',
      }),
    );
    const dialog = screen.getByRole('dialog');
    await user.selectOptions(within(dialog).getByLabelText('Status hasil'), 'failed');
    await user.type(
      within(dialog).getByLabelText('Hasil aktual'),
      'Payment API still returned 500.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Tambah Tautan' }));
    await user.type(
      within(dialog).getByPlaceholderText('https://www.youtube.com/watch?v=... or image URL'),
      'https://example.com/retest-cycle-1',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Catat Hasil' }));

    await waitFor(() =>
      expect(bugServiceMocks.createRetestAttempt).toHaveBeenCalledWith(ids.workspace, ids.bug, {
        testResultId: ids.result,
      }),
    );
  });

  it('opens Defect Report modal when clicking Catat Bug button', async () => {
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
    await user.click(screen.getByRole('tab', { name: 'Bug & Retest' }));
    await user.click(screen.getByRole('button', { name: 'Catat Bug' }));

    expect(screen.getByText('Buat Bug Tertaut')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Contoh: Tombol checkout tidak merespons di layar mobile/i),
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
    await user.click(screen.getByRole('tab', { name: 'Bug & Retest' }));
    await user.click(screen.getByRole('button', { name: 'Catat Bug' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByLabelText('Hasil gagal atau terblokir asal')).toHaveValue(
      `${ids.result}:${ids.requirement}`,
    );
    expect(within(dialog).getByLabelText('Developer yang ditugaskan')).toHaveValue(ids.dev);
    await user.type(
      within(dialog).getByLabelText('Judul / ringkasan Bug'),
      'Checkout request returns 500',
    );
    await user.type(
      within(dialog).getByLabelText('Langkah reproduksi serta hasil yang diharapkan dan aktual'),
      'Open checkout and submit a saved card. Expected success; actual HTTP 500.',
    );
    await user.selectOptions(within(dialog).getByLabelText('Tingkat keparahan'), 'critical');
    await user.click(within(dialog).getByRole('button', { name: 'Kirim Laporan Bug' }));

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

  it('allows QA to review a developer subtask in review, approve it, or request changes with notes', async () => {
    const user = userEvent.setup();
    const devSubtaskInReview: Task = {
      ...mockQaSubtask,
      id: '20000000-0000-4000-8000-000000000001',
      deliveryArea: 'frontend',
      title: 'Develop Checkout UI',
      status: 'in_review',
      assigneeId: ids.dev,
    };
    taskServiceMocks.updateTask.mockResolvedValue({ ...devSubtaskInReview, status: 'done' });

    renderDesk('qa', devSubtaskInReview, ids.qa);

    // QA sees the review buttons
    const approveBtn = screen.getByRole('button', { name: /Lolos Review & Selesaikan/i });
    const requestChangesBtn = screen.getByRole('button', { name: /Minta Revisi/i });
    expect(approveBtn).toBeInTheDocument();
    expect(requestChangesBtn).toBeInTheDocument();

    // Clicking approve calls updateTask with status done
    await user.click(approveBtn);
    expect(taskServiceMocks.updateTask).toHaveBeenCalledWith(
      ids.workspace,
      devSubtaskInReview.id,
      expect.objectContaining({ status: 'done' }),
    );

    // Clicking request changes opens modal and requires notes
    await user.click(requestChangesBtn);
    const modal = screen.getByRole('dialog');
    expect(within(modal).getByText('Minta Revisi Subtask')).toBeInTheDocument();

    const submitModalBtn = within(modal).getByRole('button', { name: /Kirim Permintaan Revisi/i });
    await user.click(submitModalBtn);
    expect(
      within(modal).getByText('Catatan revisi wajib diisi untuk mengembalikan subtask.'),
    ).toBeInTheDocument();

    await user.type(
      within(modal).getByPlaceholderText(/Jelaskan alasan permintaan revisi/i),
      'Tombol checkout masih crash ketika saldo kosong.',
    );
    await user.click(submitModalBtn);

    expect(taskServiceMocks.updateTask).toHaveBeenCalledWith(
      ids.workspace,
      devSubtaskInReview.id,
      expect.objectContaining({
        status: 'changes_requested',
        reviewNotes: 'Tombol checkout masih crash ketika saldo kosong.',
      }),
    );
  });

  it('enforces anti-self-approval when developer inspects their own in_review subtask in QaTestingDesk', async () => {
    const devSubtaskInReview: Task = {
      ...mockQaSubtask,
      id: '20000000-0000-4000-8000-000000000001',
      deliveryArea: 'frontend',
      title: 'Develop Checkout UI',
      status: 'in_review',
      assigneeId: ids.dev,
    };

    renderDesk('dev', devSubtaskInReview, ids.dev);

    expect(
      screen.queryByRole('button', { name: /Lolos Review & Selesaikan/i }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Minta Revisi/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Menunggu review dari reviewer QA atau Planner/i)).toBeInTheDocument();
  });

  it('supports filtering test cases by execution status with empty state recovery', async () => {
    const user = userEvent.setup();
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace());
    renderDesk();

    expect(await screen.findByText('Returning customer completes checkout')).toBeInTheDocument();

    // Filter by 'Gagal' (which currently has 0 items)
    const failedFilterBtn = screen.getByRole('button', { name: /Gagal/i });
    await user.click(failedFilterBtn);

    expect(
      screen.getByText(/Tidak ada Test Case dengan status pengujian "failed"/i),
    ).toBeInTheDocument();

    // Click recovery button to reset to 'Semua'
    const resetBtn = screen.getByRole('button', { name: /Tampilkan Semua Test Case/i });
    await user.click(resetBtn);

    expect(screen.getByText('Returning customer completes checkout')).toBeInTheDocument();
  });

  it('supports switching between Split View and List View', async () => {
    const user = userEvent.setup();
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace());
    renderDesk();

    expect(await screen.findByText('Returning customer completes checkout')).toBeInTheDocument();

    const splitBtn = screen.getByRole('button', { name: 'Tampilan Split Master-Detail' });
    const listBtn = screen.getByRole('button', { name: 'Tampilan Daftar Penuh' });

    expect(splitBtn).toHaveAttribute('aria-pressed', 'true');
    expect(listBtn).toHaveAttribute('aria-pressed', 'false');

    // Switch to List View
    await user.click(listBtn);
    expect(listBtn).toHaveAttribute('aria-pressed', 'true');
    expect(splitBtn).toHaveAttribute('aria-pressed', 'false');

    // Test Case details still rendered
    expect(screen.getByText('Returning customer completes checkout')).toBeInTheDocument();

    // Switch back to Split View
    await user.click(splitBtn);
    expect(splitBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('renders rich Macro Stage Tabs and testing sub-tabs with dynamic metrics', async () => {
    serviceMocks.getTaskTestExecutions.mockResolvedValue(executionWorkspace());
    renderDesk();

    expect(await screen.findByRole('tab', { name: 'Persiapan & Eksekusi' })).toBeInTheDocument();

    // Verify 2 Macro Tabs
    const contextTab = screen.getByRole('tab', { name: 'Konteks & Spesifikasi' });
    expect(contextTab).toBeInTheDocument();
    expect(contextTab).toHaveTextContent('1. Konteks & Spesifikasi');

    const testingAreaTab = screen.getByRole('tab', { name: 'Area Pengujian & Mutu' });
    expect(testingAreaTab).toBeInTheDocument();
    expect(testingAreaTab).toHaveTextContent('2. Area Pengujian & Mutu');
    expect(testingAreaTab).toHaveTextContent('1 Kasus');

    // Verify Sub-Tabs inside Area Pengujian & Mutu
    const preparationTab = screen.getByRole('tab', { name: 'Persiapan & Eksekusi' });
    expect(preparationTab).toBeInTheDocument();
    expect(preparationTab).toHaveTextContent('1. Test Case & Eksekusi');
    expect(preparationTab).toHaveTextContent('1 Kasus');

    const bugsTab = screen.getByRole('tab', { name: 'Bug & Retest' });
    expect(bugsTab).toBeInTheDocument();
    expect(bugsTab).toHaveTextContent('2. Bug & Retest');

    const signOffTab = screen.getByRole('tab', { name: 'Persetujuan & Riwayat' });
    expect(signOffTab).toBeInTheDocument();
    expect(signOffTab).toHaveTextContent('3. Persetujuan & Riwayat');
  });

  it('switches between Macro Tabs (Konteks & Spesifikasi vs Area Pengujian & Mutu)', async () => {
    const user = userEvent.setup();
    renderDesk();

    const contextTab = await screen.findByRole('tab', { name: 'Konteks & Spesifikasi' });
    await user.click(contextTab);
    expect(contextTab).toHaveAttribute('aria-selected', 'true');
    expect(
      screen.getByRole('tabpanel', { name: 'Konteks dan spesifikasi QA' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Hasil Kerja Developer & Verifikasi Lingkungan')).toBeInTheDocument();

    const testingAreaTab = screen.getByRole('tab', { name: 'Area Pengujian & Mutu' });
    await user.click(testingAreaTab);
    expect(testingAreaTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Persiapan & Eksekusi' })).toBeInTheDocument();
  });
});
