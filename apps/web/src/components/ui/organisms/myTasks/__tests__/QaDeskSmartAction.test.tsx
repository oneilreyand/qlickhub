import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { QaTestingDesk } from '../QaTestingDesk';
import { deriveCandidateFingerprint } from '../qaDesk/hooks/useTestCycle';
import authReducer from '../../../../../store/authSlice';
import taskReducer from '../../../../../store/taskSlice';
import workspaceReducer from '../../../../../store/workspaceSlice';
import uiReducer from '../../../../../store/uiSlice';
import type { Task, TaskTestExecutionWorkspace, TestRun, QaTestCycle } from '@qlick/contracts';

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
}));

const taskServiceMocks = vi.hoisted(() => ({
  listTaskComments: vi.fn().mockResolvedValue({ comments: [] }),
  listTaskAttachments: vi.fn().mockResolvedValue({ attachments: [] }),
  createTaskComment: vi.fn(),
  updateTask: vi.fn(),
  getAttachmentDownloadUrl: vi.fn(),
  listSubtasks: vi.fn().mockResolvedValue({ tasks: [] }),
}));

const requirementServiceMocks = vi.hoisted(() => ({
  listRequirements: vi.fn().mockResolvedValue([]),
  listTaskRequirementLinks: vi.fn().mockResolvedValue([]),
  getRequirement: vi.fn(),
}));

const releaseServiceMocks = vi.hoisted(() => ({
  listFeatureReleaseRecords: vi.fn(),
  createQaSignOff: vi.fn(),
  createReleaseDecision: vi.fn(),
}));

const bugServiceMocks = vi.hoisted(() => ({
  createBug: vi.fn(),
  addBugEvidenceLink: vi.fn(),
  createRetestAttempt: vi.fn(),
  listBugs: vi.fn().mockResolvedValue([]),
  updateBug: vi.fn(),
  createResolutionEvent: vi.fn(),
  createRetestRun: vi.fn(),
  getRetestHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../../../lib/api/testManagementService', () => ({
  testManagementService: serviceMocks,
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

vi.mock('../../../../../lib/api/bugService', () => ({
  bugService: bugServiceMocks,
}));

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  feature: '10000000-0000-4000-8000-000000000002',
  subtask: '10000000-0000-4000-8000-000000000003',
  requirement: '10000000-0000-4000-8000-000000000004',
  qa: '10000000-0000-4000-8000-000000000005',
  testCase: '10000000-0000-4000-8000-000000000006',
  cycle: '10000000-0000-4000-8000-000000000010',
};

const createMockSubtask = (status = 'in_progress'): Task => ({
  id: ids.subtask,
  workspaceId: ids.workspace,
  parentTaskId: ids.feature,
  title: 'QA Eksekusi Checkout',
  description: 'Subtask pengujian QA',
  status: status as any,
  deliveryArea: 'qa',
  assigneeId: ids.qa,
  reporterId: ids.qa,
  priority: 'high',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createMockCycle = (): QaTestCycle => ({
  id: ids.cycle,
  workspaceId: ids.workspace,
  featureTaskId: ids.feature,
  qaSubtaskId: ids.subtask,
  readinessBaselineId: '10000000-0000-4000-8000-000000000099',
  candidateFingerprint: 'candidate:build-2026-staging',
  build: 'checkout-web-2026.10.01',
  environment: 'staging',
  status: 'in_progress',
  ownerQaId: ids.qa,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const createMockWorkspace = (runs: TestRun[] = []): TaskTestExecutionWorkspace => ({
  workspaceId: ids.workspace,
  requestedTaskId: ids.subtask,
  featureTaskId: ids.feature,
  executions: [
    {
      testCase: {
        id: ids.testCase,
        workspaceId: ids.workspace,
        requirementIds: [ids.requirement],
        title: 'Verifikasi Pembayaran QRIS',
        description: 'Test case verifikasi pembayaran QRIS',
        testType: 'e2e',
        status: 'active',
        priority: 'high',
        scenarioKind: 'positive',
        source: 'native',
        createdBy: ids.qa,
        steps: ['Buka aplikasi', 'Scan QRIS'],
        preconditions: null,
        expectedResult: 'Sukses',
        testData: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      latestRun: runs[0] || null,
      testRuns: runs,
    },
  ],
});

describe('Prompt 6 PR 1: Smart Next Action Card & Test Version Runner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMocks.listTestCaseVersionCoverage.mockResolvedValue([
      {
        id: '10000000-0000-4000-8000-000000000099',
        revision: 1,
        lifecycleStatus: 'active',
        mappedCount: 1,
        excludedCount: 0,
        uncoveredCriteriaCount: 0,
      },
    ]);
    releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue({
      workspaceId: ids.workspace,
      featureTaskId: ids.feature,
      qaSignOffs: [],
      releaseDecisions: [],
    });
  });

  describe('deriveCandidateFingerprint helper', () => {
    it('deterministically derives candidate fingerprint from build and environment', () => {
      expect(deriveCandidateFingerprint('checkout-v1', 'staging')).toBe(
        'candidate:checkout-v1-staging',
      );
    });

    it('trims leading and trailing whitespace', () => {
      expect(deriveCandidateFingerprint('  web-build-42  ', '  production  ')).toBe(
        'candidate:web-build-42-production',
      );
    });

    it('returns empty string if either build or environment is empty', () => {
      expect(deriveCandidateFingerprint('', 'staging')).toBe('');
      expect(deriveCandidateFingerprint('build-1', '')).toBe('');
      expect(deriveCandidateFingerprint('   ', '   ')).toBe('');
    });
  });

  describe('Smart Next Action Card interactions in QaTestingDesk', () => {
    const renderDesk = (subtaskOverride?: Task) => {
      const store = configureStore({
        reducer: {
          auth: authReducer,
          task: taskReducer,
          workspace: workspaceReducer,
          ui: uiReducer,
        },
        preloadedState: {
          auth: {
            user: { id: ids.qa, name: 'Budi QA', email: 'budi@example.com', role: 'member' },
            token: 'valid-token',
            isAuthenticated: true,
          } as any,
          workspace: {
            currentWorkspace: { id: ids.workspace, name: 'Main Workspace', role: 'qa' },
            activeWorkspaceId: ids.workspace,
            members: [],
            workspaces: [],
            isLoading: false,
            isMembersLoading: false,
            isInitialized: true,
            error: null,
          } as any,
        },
      });

      return render(
        <Provider store={store}>
          <QaTestingDesk
            subtask={subtaskOverride || createMockSubtask()}
            workspaceId={ids.workspace}
            currentUserId={ids.qa}
            userRole="qa"
            onDataChanged={vi.fn()}
          />
        </Provider>,
      );
    };

    it('executes Test Case directly using active test version without modal when clicking Jalankan Test Case on smart card', async () => {
      const user = userEvent.setup();
      const mockCycle = createMockCycle();
      serviceMocks.getTaskTestExecutions.mockResolvedValue(createMockWorkspace([]));
      serviceMocks.listQaTestCycles.mockResolvedValue([mockCycle]);
      serviceMocks.getQaWorkflowSummary.mockResolvedValue({
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        qaSubtaskId: ids.subtask,
        featureTitle: 'Checkout Feature',
        qaSubtaskTitle: 'QA Eksekusi Checkout',
        qaSubtaskStatus: 'in_progress',
        testCycle: mockCycle,
        blockers: ['scoped_result_missing'],
        nextAction: { code: 'execute_test_cases', label: 'Jalankan Test Case' },
      });
      serviceMocks.createTestRun.mockResolvedValue({
        id: '10000000-0000-4000-8000-000000000030',
        status: 'in_progress',
      });

      renderDesk();

      // Wait for test case in action card
      await screen.findByText(/Siap menguji "Verifikasi Pembayaran QRIS"/);
      await waitFor(() => {
        expect(serviceMocks.listTestCaseVersionCoverage).toHaveBeenCalledWith(
          ids.workspace,
          ids.testCase,
        );
      });

      // Find the smart action card button
      const smartRunBtn = screen.getByRole('button', { name: 'Jalankan Test Case' });
      expect(smartRunBtn).toBeInTheDocument();

      await user.click(smartRunBtn);

      // Verify that createTestRun was called directly with the active cycle build and environment
      await waitFor(() => {
        expect(serviceMocks.createTestRun).toHaveBeenCalledWith(
          ids.workspace,
          ids.testCase,
          expect.objectContaining({
            build: mockCycle.build,
            environment: mockCycle.environment,
            testCycleId: mockCycle.id,
            candidateFingerprint: mockCycle.candidateFingerprint,
          }),
        );
      });

      // Confirm that the RunTestCaseModal was NOT opened (0 modals opened)
      expect(
        screen.queryByRole('dialog', { name: 'Jalankan Test Case Tersimpan' }),
      ).not.toBeInTheDocument();
    });

    it('updates subtask status to done when clicking Selesaikan Tugas QA on smart card', async () => {
      const user = userEvent.setup();
      const mockCycle = createMockCycle();
      const completedRun: TestRun = {
        id: '10000000-0000-4000-8000-000000000030',
        workspaceId: ids.workspace,
        testCaseId: ids.testCase,
        featureTaskId: ids.feature,
        qaSubtaskId: ids.subtask,
        testCycleId: mockCycle.id,
        testCaseVersionId: '10000000-0000-4000-8000-000000000020',
        readinessBaselineId: null,
        candidateFingerprint: mockCycle.candidateFingerprint,
        retestBugId: null,
        retestResolutionEventId: null,
        build: mockCycle.build,
        environment: mockCycle.environment,
        status: 'completed',
        executorId: ids.qa,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        result: {
          id: '10000000-0000-4000-8000-000000000040',
          workspaceId: ids.workspace,
          testRunId: '10000000-0000-4000-8000-000000000030',
          status: 'passed',
          executorId: ids.qa,
          actualResult: 'Semua kriteria lolos.',
          notes: null,
          executedAt: new Date().toISOString(),
          evidence: [],
          evidenceLinks: [],
          createdAt: new Date().toISOString(),
        },
      };

      serviceMocks.getTaskTestExecutions.mockResolvedValue(createMockWorkspace([completedRun]));
      serviceMocks.listQaTestCycles.mockResolvedValue([mockCycle]);
      serviceMocks.getQaWorkflowSummary.mockResolvedValue({
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        qaSubtaskId: ids.subtask,
        featureTitle: 'Checkout Feature',
        qaSubtaskTitle: 'QA Eksekusi Checkout',
        qaSubtaskStatus: 'in_progress',
        testCycle: mockCycle,
        blockers: [],
        nextAction: { code: 'complete_qa_subtask', label: 'Selesaikan Eksekusi QA' },
      });
      taskServiceMocks.updateTask.mockResolvedValue({
        ...createMockSubtask('done'),
        status: 'done',
      });

      renderDesk();

      const completeBtn = await screen.findByRole('button', { name: 'Selesaikan Tugas QA' });
      await waitFor(() => expect(completeBtn).toBeEnabled());

      await user.click(completeBtn);

      await waitFor(() => {
        expect(taskServiceMocks.updateTask).toHaveBeenCalledWith(
          ids.workspace,
          ids.subtask,
          expect.objectContaining({
            status: 'done',
          }),
        );
      });
    });

    it('navigates to Persetujuan QA tab when clicking Beri Persetujuan QA on smart card', async () => {
      const user = userEvent.setup();
      const mockCycle = createMockCycle();
      serviceMocks.getTaskTestExecutions.mockResolvedValue(createMockWorkspace([]));
      serviceMocks.listQaTestCycles.mockResolvedValue([mockCycle]);
      serviceMocks.getQaWorkflowSummary.mockResolvedValue({
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        qaSubtaskId: ids.subtask,
        featureTitle: 'Checkout Feature',
        qaSubtaskTitle: 'QA Eksekusi Checkout',
        qaSubtaskStatus: 'done',
        testCycle: mockCycle,
        blockers: [],
        nextAction: { code: 'record_qa_sign_off', label: 'Catat Persetujuan QA' },
      });

      renderDesk(createMockSubtask('done'));

      const signOffBtn = await screen.findByRole('button', { name: 'Beri Persetujuan QA' });
      expect(signOffBtn).toBeInTheDocument();

      await user.click(signOffBtn);

      // Verify tab switched to Persetujuan QA tab
      await waitFor(() => {
        expect(screen.getByRole('tab', { name: 'Persetujuan & Riwayat' })).toHaveAttribute(
          'aria-selected',
          'true',
        );
      });
    });

    it('renders terminal state "Selesai" and suppresses primary button when QA sign-off is already recorded', async () => {
      const mockCycle = createMockCycle();
      serviceMocks.getTaskTestExecutions.mockResolvedValue(createMockWorkspace([]));
      serviceMocks.listQaTestCycles.mockResolvedValue([mockCycle]);
      serviceMocks.getQaWorkflowSummary.mockResolvedValue({
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        qaSubtaskId: ids.subtask,
        featureTitle: 'Checkout Feature',
        qaSubtaskTitle: 'QA Eksekusi Checkout',
        qaSubtaskStatus: 'done',
        testCycle: mockCycle,
        blockers: [],
        nextAction: { code: 'record_qa_sign_off', label: 'Catat Persetujuan QA' },
      });
      releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue({
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        qaSignOffs: [
          {
            id: 'signoff-1',
            workspaceId: ids.workspace,
            featureTaskId: ids.feature,
            qaSubtaskId: ids.subtask,
            testCycleId: mockCycle.id,
            qaTestCycleId: mockCycle.id,
            candidateFingerprint: mockCycle.candidateFingerprint,
            decision: 'approved',
            notes: 'Verified all passed',
            signedBy: ids.qa,
            signedAt: new Date().toISOString(),
            cancellation: null,
          },
        ],
        releaseDecisions: [],
      });

      renderDesk(createMockSubtask('done'));

      await screen.findByText('Pengujian & Persetujuan QA Selesai');
      expect(screen.getByText('Persetujuan QA Tercatat')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Beri Persetujuan QA' })).not.toBeInTheDocument();
    });

    it('opens unified Dialog 1 "Mulai Tugas QA & Aktifkan Pengujian" modal when clicking Mulai Tugas QA', async () => {
      const user = userEvent.setup();
      serviceMocks.getTaskTestExecutions.mockResolvedValue(createMockWorkspace([]));
      serviceMocks.listQaTestCycles.mockResolvedValue([]);
      serviceMocks.getQaWorkflowSummary.mockResolvedValue(null);

      renderDesk(createMockSubtask('todo'));

      const startButtons = await screen.findAllByRole('button', { name: 'Mulai Tugas QA' });
      // Click the smart card's Mulai Tugas QA button
      await user.click(startButtons[0]);

      // Check unified modal dialog is opened
      await waitFor(() => {
        expect(screen.getByText('Mulai Tugas QA & Aktifkan Pengujian')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Simpan & Aktifkan' })).toBeInTheDocument();
      });
    });
  });
});
