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
}));

const taskServiceMocks = vi.hoisted(() => ({
  listTaskComments: vi.fn().mockResolvedValue({ comments: [] }),
  createTaskComment: vi.fn(),
  updateTask: vi.fn(),
}));

const requirementServiceMocks = vi.hoisted(() => ({
  listRequirements: vi.fn(),
  listTaskRequirementLinks: vi.fn(),
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
  });

  it('completes assigned QA eksekusi directly without a self-review step', async () => {
    const user = userEvent.setup();
    renderDesk();

    expect(screen.queryByRole('button', { name: 'Submit for Review' })).not.toBeInTheDocument();
    expect(
      screen.getByText(
        /Menyelesaikan Subtask QA hanya mencatat eksekusi pengujian yang ditugaskan/i,
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Selesaikan Eksekusi QA' }));

    await waitFor(() =>
      expect(taskServiceMocks.updateTask).toHaveBeenCalledWith(ids.workspace, ids.subtask, {
        status: 'done',
        reviewNotes: undefined,
      }),
    );
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
    const legacySubtask = { ...mockQaSubtask, status: 'in_review' as const };
    renderDesk('qa', legacySubtask);

    await screen.findByText('Belum ada Persetujuan QA');
    await screen.findByText('Belum ada Test Case yang tertaut ke Feature ini');
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
    expect(screen.getByRole('button', { name: 'Catat Bug' })).toBeDisabled();
  });

  it('renders Canonical Test Management workspace with Native Authoring and Import buttons for Planners', async () => {
    renderDesk('po');

    expect(
      await screen.findByText('Belum ada Test Case yang tertaut ke Feature ini'),
    ).toBeInTheDocument();
    expect(screen.getByText('Area Pengujian & Mutu QA')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Test Case Baru/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Impor Spreadsheet/i })).toBeInTheDocument();
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
    renderDesk();

    await user.click(
      await screen.findByRole('button', {
        name: 'Mulai Test Run untuk Returning customer completes checkout',
      }),
    );
    const dialog = screen.getByRole('dialog');
    await user.type(within(dialog).getByLabelText('Build'), 'checkout-web-2026.08.22.1');
    await user.clear(within(dialog).getByLabelText('Lingkungan'));
    await user.type(within(dialog).getByLabelText('Lingkungan'), 'qa-staging');
    await user.click(within(dialog).getByRole('button', { name: 'Mulai Test Run' }));

    await waitFor(() =>
      expect(serviceMocks.createTestRun).toHaveBeenCalledWith(ids.workspace, ids.testCase, {
        build: 'checkout-web-2026.08.22.1',
        environment: 'qa-staging',
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
    expect(screen.queryByRole('button', { name: /Mulai Test Run untuk/ })).not.toBeInTheDocument();
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
          evidenceLinks: [],
        },
      ),
    );
    qaRender.unmount();

    renderDesk('po');
    expect(await screen.findByText('Pengujian hanya dapat dilihat')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mulai Test Run untuk/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Catat hasil untuk/ })).not.toBeInTheDocument();
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
    expect(within(modal).getByText('Catatan revisi wajib diisi untuk mengembalikan subtask.')).toBeInTheDocument();

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

    expect(screen.queryByRole('button', { name: /Lolos Review & Selesaikan/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Minta Revisi/i })).not.toBeInTheDocument();
    expect(
      screen.getByText(/Menunggu review dari reviewer QA atau Planner/i),
    ).toBeInTheDocument();
  });
});
