import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '../../../../../../../store/uiSlice';
import taskReducer from '../../../../../../../store/taskSlice';
import type {
  Task,
  QaTestCycle,
  FeatureReleaseRecords,
  BugWithContext,
  BugRetestHistory,
} from '@qlick/contracts';
import { useQaDeskData } from '../useQaDeskData';

const bugServiceMocks = vi.hoisted(() => ({
  listBugs: vi.fn(),
  getRetestHistory: vi.fn(),
}));

const releaseServiceMocks = vi.hoisted(() => ({
  listFeatureReleaseRecords: vi.fn(),
}));

const testManagementServiceMocks = vi.hoisted(() => ({
  getQaWorkflowSummary: vi.fn(),
}));

const taskServiceMocks = vi.hoisted(() => ({
  listTaskComments: vi.fn().mockResolvedValue({ comments: [] }),
  listSubtasks: vi.fn().mockResolvedValue({ tasks: [] }),
}));

vi.mock('../../../../../../../lib/api/bugService', () => ({
  bugService: bugServiceMocks,
}));

vi.mock('../../../../../../../lib/api/releaseDecisionService', () => ({
  releaseDecisionService: releaseServiceMocks,
}));

vi.mock('../../../../../../../lib/api/testManagementService', () => ({
  testManagementService: testManagementServiceMocks,
}));

vi.mock('../../../../../../../lib/api/taskService', () => ({
  taskService: taskServiceMocks,
}));

const createWrapper = () => {
  const store = configureStore({
    reducer: {
      ui: uiReducer,
      tasks: taskReducer,
      workspace: () => ({ members: [] }),
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
};

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  feature: '10000000-0000-4000-8000-000000000002',
  subtask: '10000000-0000-4000-8000-000000000003',
  userQa: '10000000-0000-4000-8000-000000000004',
  oldCycle: '10000000-0000-4000-8000-000000000010',
  activeCycle: '10000000-0000-4000-8000-000000000020',
  signOffId: '10000000-0000-4000-8000-000000000030',
};

const baseSubtask: Task = {
  id: ids.subtask,
  workspaceId: ids.workspace,
  parentTaskId: ids.feature,
  title: 'QA Testing Subtask',
  description: 'Test subtask',
  status: 'in_progress',
  deliveryArea: 'qa',
  priority: 'medium',
  reporterId: ids.userQa,
  assigneeId: ids.userQa,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as unknown as Task;

const activeCycle: QaTestCycle = {
  id: ids.activeCycle,
  workspaceId: ids.workspace,
  featureTaskId: ids.feature,
  qaSubtaskId: ids.subtask,
  readinessBaselineId: 'baseline-1',
  candidateFingerprint: 'candidate:build-2-staging',
  build: 'build-2',
  environment: 'staging',
  status: 'in_progress',
  ownerQaId: ids.userQa,
  createdAt: '2026-10-02T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
};

describe('useQaDeskData Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bugServiceMocks.listBugs.mockResolvedValue([]);
    testManagementServiceMocks.getQaWorkflowSummary.mockResolvedValue(null);
  });

  describe('QA Sign-off Matching & Status Resolution', () => {
    it('(a) sign-off versi lama + versi baru aktif -> bukan Selesai (isSignOffRecorded is false)', async () => {
      const recordsWithOldCycleSignOff = {
        releaseDecisions: [],
        qaSignOffs: [
          {
            id: ids.signOffId,
            workspaceId: ids.workspace,
            featureTaskId: ids.feature,
            qaSubtaskId: ids.subtask,
            testCycleId: ids.oldCycle, // signed off on old cycle
            readinessBaselineId: 'baseline-old',
            candidateFingerprint: 'candidate:build-1-staging',
            decision: 'approved',
            notes: 'Approved old build',
            signedBy: ids.userQa,
            signedAt: '2026-10-01T12:00:00.000Z',
            readinessSnapshot: {} as any,
          },
        ],
      };

      releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(
        recordsWithOldCycleSignOff as unknown as FeatureReleaseRecords,
      );

      const { result } = renderHook(
        () =>
          useQaDeskData({
            subtask: baseSubtask,
            workspaceId: ids.workspace,
            currentUserId: ids.userQa,
            userRole: 'qa',
            selectedTestCycle: activeCycle, // Active is cycle 2
            onDataChanged: vi.fn(),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(releaseServiceMocks.listFeatureReleaseRecords).toHaveBeenCalled();
      });

      // Old sign-off must NOT count for active cycle
      expect(result.current.isSignOffRecorded).toBe(false);
      expect(result.current.isSignOffRejected).toBe(false);
    });

    it('(b) sign-off reject untuk versi aktif -> bukan Selesai (isSignOffRejected is true)', async () => {
      const recordsWithActiveRejectedSignOff = {
        releaseDecisions: [],
        qaSignOffs: [
          {
            id: ids.signOffId,
            workspaceId: ids.workspace,
            featureTaskId: ids.feature,
            qaSubtaskId: ids.subtask,
            testCycleId: ids.activeCycle, // active cycle
            readinessBaselineId: 'baseline-1',
            candidateFingerprint: 'candidate:build-2-staging',
            decision: 'rejected',
            notes: 'Rejected due to regressions',
            signedBy: ids.userQa,
            signedAt: '2026-10-02T14:00:00.000Z',
            readinessSnapshot: {} as any,
          },
        ],
      };

      releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(
        recordsWithActiveRejectedSignOff as unknown as FeatureReleaseRecords,
      );

      const { result } = renderHook(
        () =>
          useQaDeskData({
            subtask: baseSubtask,
            workspaceId: ids.workspace,
            currentUserId: ids.userQa,
            userRole: 'qa',
            selectedTestCycle: activeCycle,
            onDataChanged: vi.fn(),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(releaseServiceMocks.listFeatureReleaseRecords).toHaveBeenCalled();
      });

      // Rejected sign-off must NOT be Selesai, but isSignOffRejected = true
      expect(result.current.isSignOffRecorded).toBe(false);
      expect(result.current.isSignOffRejected).toBe(true);
    });

    it('(c) sign-off approve versi aktif -> Selesai (isSignOffRecorded is true)', async () => {
      const recordsWithActiveApprovedSignOff = {
        releaseDecisions: [],
        qaSignOffs: [
          {
            id: ids.signOffId,
            workspaceId: ids.workspace,
            featureTaskId: ids.feature,
            qaSubtaskId: ids.subtask,
            testCycleId: ids.activeCycle,
            readinessBaselineId: 'baseline-1',
            candidateFingerprint: 'candidate:build-2-staging',
            decision: 'approved',
            notes: 'Verified and approved',
            signedBy: ids.userQa,
            signedAt: '2026-10-02T15:00:00.000Z',
            readinessSnapshot: {} as any,
          },
        ],
      };

      releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(
        recordsWithActiveApprovedSignOff as unknown as FeatureReleaseRecords,
      );

      const { result } = renderHook(
        () =>
          useQaDeskData({
            subtask: baseSubtask,
            workspaceId: ids.workspace,
            currentUserId: ids.userQa,
            userRole: 'qa',
            selectedTestCycle: activeCycle,
            onDataChanged: vi.fn(),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(releaseServiceMocks.listFeatureReleaseRecords).toHaveBeenCalled();
      });

      expect(result.current.isSignOffRecorded).toBe(true);
      expect(result.current.isSignOffRejected).toBe(false);
    });

    it('ignores cancelled sign-off even if for active version', async () => {
      const recordsWithCancelledSignOff = {
        releaseDecisions: [],
        qaSignOffs: [
          {
            id: ids.signOffId,
            workspaceId: ids.workspace,
            featureTaskId: ids.feature,
            qaSubtaskId: ids.subtask,
            testCycleId: ids.activeCycle,
            readinessBaselineId: 'baseline-1',
            candidateFingerprint: 'candidate:build-2-staging',
            decision: 'approved',
            notes: 'Approved',
            signedBy: ids.userQa,
            signedAt: '2026-10-02T15:00:00.000Z',
            cancellation: {
              id: 'cancel-1',
              workspaceId: ids.workspace,
              cancelledBy: ids.userQa,
              cancelledAt: '2026-10-02T16:00:00.000Z',
              reason: 'Retest needed',
            },
            readinessSnapshot: {} as any,
          },
        ],
      };

      releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(
        recordsWithCancelledSignOff as unknown as FeatureReleaseRecords,
      );

      const { result } = renderHook(
        () =>
          useQaDeskData({
            subtask: baseSubtask,
            workspaceId: ids.workspace,
            currentUserId: ids.userQa,
            userRole: 'qa',
            selectedTestCycle: activeCycle,
            onDataChanged: vi.fn(),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(releaseServiceMocks.listFeatureReleaseRecords).toHaveBeenCalled();
      });

      expect(result.current.isSignOffRecorded).toBe(false);
      expect(result.current.isSignOffRejected).toBe(false);
    });
  });

  describe('Developer Resolution Candidate Fingerprint Prefill', () => {
    it('prefills devResolutionFingerprint from latest resolution event of resolved bug', async () => {
      releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(null);

      const resolvedBug = {
        id: 'bug-101',
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        title: 'Crash on submit',
        status: 'resolved',
        severity: 'high',
        featureTask: { id: ids.feature, title: 'Feature' },
        requirement: { id: 'req-1', code: 'REQ-01', title: 'Requirement' },
        assignee: { id: 'dev-1', name: 'Dev User', email: 'dev@example.com' },
        bugEvidenceLinks: [],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-03T10:00:00.000Z',
      } as unknown as BugWithContext;

      bugServiceMocks.listBugs.mockResolvedValue([resolvedBug]);

      const mockHistory: BugRetestHistory = {
        resolutionEvents: [
          {
            id: 'res-1',
            workspaceId: ids.workspace,
            bugId: 'bug-101',
            sequence: 1,
            candidateFingerprint: 'commit:dev-fixed-abc1234',
            resolutionNotes: 'Fixed bug in commit abc1234',
            resolvedBy: 'dev-1',
            resolvedAt: '2026-10-03T10:00:00.000Z',
          },
        ],
        retestAttempts: [],
        cycles: [],
      };

      bugServiceMocks.getRetestHistory.mockResolvedValue(mockHistory);

      const { result } = renderHook(
        () =>
          useQaDeskData({
            subtask: baseSubtask,
            workspaceId: ids.workspace,
            currentUserId: ids.userQa,
            userRole: 'qa',
            onDataChanged: vi.fn(),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.devResolutionFingerprint).toBe('commit:dev-fixed-abc1234');
      });
    });

    it('sets devResolutionFingerprint to null when no bug is in resolved status', async () => {
      releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(null);

      const openBug = {
        id: 'bug-102',
        workspaceId: ids.workspace,
        featureTaskId: ids.feature,
        title: 'Open issue',
        status: 'open',
        severity: 'medium',
        featureTask: { id: ids.feature, title: 'Feature' },
        requirement: { id: 'req-1', code: 'REQ-01', title: 'Requirement' },
        assignee: { id: 'dev-1', name: 'Dev User', email: 'dev@example.com' },
        bugEvidenceLinks: [],
        createdAt: '2026-10-01T00:00:00.000Z',
        updatedAt: '2026-10-01T00:00:00.000Z',
      } as unknown as BugWithContext;

      bugServiceMocks.listBugs.mockResolvedValue([openBug]);

      const { result } = renderHook(
        () =>
          useQaDeskData({
            subtask: baseSubtask,
            workspaceId: ids.workspace,
            currentUserId: ids.userQa,
            userRole: 'qa',
            onDataChanged: vi.fn(),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(bugServiceMocks.listBugs).toHaveBeenCalled();
      });

      expect(result.current.devResolutionFingerprint).toBeNull();
      expect(bugServiceMocks.getRetestHistory).not.toHaveBeenCalled();
    });
  });

  describe('assignedQaDisplayName Fallback (PR #24 regression test)', () => {
    it('uses assigneeName fallback when assignedQaMember user object is not present', async () => {
      releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(null);
      bugServiceMocks.listBugs.mockResolvedValue([]);

      const subtaskWithAssigneeName = {
        ...baseSubtask,
        assigneeName: 'Alex QA Engineer',
      };

      const { result } = renderHook(
        () =>
          useQaDeskData({
            subtask: subtaskWithAssigneeName,
            workspaceId: ids.workspace,
            currentUserId: ids.userQa,
            userRole: 'qa',
            onDataChanged: vi.fn(),
          }),
        { wrapper: createWrapper() },
      );

      await waitFor(() => {
        expect(result.current.assignedQaDisplayName).toBe('Alex QA Engineer');
      });
    });
  });
});
