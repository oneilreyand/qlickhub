import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { FeatureReleaseRecords, QaSignOff, ReadinessSnapshotV2 } from '@qlick/contracts';
import { ReleaseAssurancePanel } from '../ReleaseAssurancePanel';
import authReducer from '../../../../store/authSlice';
import workspaceReducer from '../../../../store/workspaceSlice';
import uiReducer from '../../../../store/uiSlice';

const releaseServiceMocks = vi.hoisted(() => ({
  listFeatureReleaseRecords: vi.fn(),
  createQaSignOff: vi.fn(),
  createReleaseDecision: vi.fn(),
}));

vi.mock('../../../../lib/api/releaseDecisionService', () => ({
  releaseDecisionService: releaseServiceMocks,
}));

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  feature: '10000000-0000-4000-8000-000000000002',
  qa: '10000000-0000-4000-8000-000000000003',
  po: '10000000-0000-4000-8000-000000000004',
  signOff: '10000000-0000-4000-8000-000000000005',
};
const now = '2026-08-22T10:00:00.000Z';

const readinessSnapshot = (
  qaDecision: 'approved' | 'rejected' | null = 'approved',
  developmentComplete = true,
): ReadinessSnapshotV2 => {
  const failedGateCodes = [
    ...(developmentComplete ? [] : ['development_completion' as const]),
    ...(qaDecision === 'approved' ? [] : ['qa_sign_off' as const]),
  ];
  return {
    schemaVersion: 2,
    capturedAt: now,
    featureTask: {
      id: ids.feature,
      title: 'Checkout Feature',
      status: 'in_review',
      updatedAt: now,
    },
    subtasks: { total: 3, completed: 3 },
    development: { total: 2, completed: developmentComplete ? 2 : 1 },
    requirements: { total: 2, coveredByActiveTestCases: 2 },
    testExecution: {
      totalTestCases: 4,
      passed: 4,
      failed: 0,
      blocked: 0,
      skipped: 0,
      unexecuted: 0,
    },
    bugs: {
      total: 1,
      open: 0,
      inProgress: 0,
      resolved: 0,
      verified: 1,
      reopened: 0,
      criticalOrHighUnverified: 0,
    },
    qaSignOff: qaDecision
      ? { id: ids.signOff, decision: qaDecision, signedBy: ids.qa, signedAt: now }
      : null,
    evaluation: {
      ready: failedGateCodes.length === 0,
      failedGateCodes,
      gates: [
        {
          code: 'requirement_coverage',
          label: 'Requirement coverage',
          status: 'passed',
          reason: 'All 2 linked requirements are covered by active test cases.',
        },
        {
          code: 'latest_test_results',
          label: 'Latest Test Run results',
          status: 'passed',
          reason: 'Latest results passed for all 4 active mapped test cases.',
        },
        {
          code: 'critical_high_bugs',
          label: 'Critical/High bugs',
          status: 'passed',
          reason: 'No unverified Critical or High bugs are linked to this Feature / Story.',
        },
        {
          code: 'development_completion',
          label: 'Development completion',
          status: developmentComplete ? 'passed' : 'failed',
          reason: developmentComplete
            ? 'All 2 development subtasks are complete.'
            : '1/2 development subtasks are complete.',
        },
        {
          code: 'qa_sign_off',
          label: 'QA Sign-off',
          status: qaDecision === 'approved' ? 'passed' : 'failed',
          reason:
            qaDecision === 'approved'
              ? 'The latest QA Sign-off is approved.'
              : qaDecision === 'rejected'
                ? 'The latest QA Sign-off is rejected.'
                : 'No QA Sign-off is recorded.',
        },
      ],
    },
  };
};

const qaSignOff = (decision: 'approved' | 'rejected' = 'approved'): QaSignOff => ({
  id: ids.signOff,
  workspaceId: ids.workspace,
  featureTaskId: ids.feature,
  decision,
  notes: decision === 'approved' ? 'Regression passed.' : 'Release risk remains.',
  readinessSnapshot: readinessSnapshot(decision),
  signedBy: ids.qa,
  signedAt: now,
});

const records = (
  signOffs: QaSignOff[] = [],
  currentReadinessSnapshot = readinessSnapshot(signOffs[0]?.decision || null),
): FeatureReleaseRecords => ({
  workspaceId: ids.workspace,
  featureTaskId: ids.feature,
  currentReadinessSnapshot,
  qaSignOffs: signOffs,
  releaseDecisions: [],
});

const createStore = () =>
  configureStore({
    reducer: { auth: authReducer, workspace: workspaceReducer, ui: uiReducer },
    preloadedState: {
      workspace: {
        activeWorkspaceId: ids.workspace,
        workspaces: [],
        members: [
          {
            id: '10000000-0000-4000-8000-000000000006',
            workspaceId: ids.workspace,
            userId: ids.qa,
            role: 'qa' as const,
            joinedAt: now,
            user: { id: ids.qa, name: 'QA Charlie', email: 'qa@example.com' },
          },
          {
            id: '10000000-0000-4000-8000-000000000007',
            workspaceId: ids.workspace,
            userId: ids.po,
            role: 'po' as const,
            joinedAt: now,
            user: { id: ids.po, name: 'PO Alice', email: 'po@example.com' },
          },
        ],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });

const renderPanel = (
  mode: 'qa' | 'release',
  options?: { currentUserId?: string; userRole?: string },
) =>
  render(
    <Provider store={createStore()}>
      <ReleaseAssurancePanel
        workspaceId={ids.workspace}
        featureTaskId={ids.feature}
        currentUserId={options?.currentUserId || (mode === 'qa' ? ids.qa : ids.po)}
        userRole={options?.userRole || (mode === 'qa' ? 'qa' : 'po')}
        mode={mode}
      />
    </Provider>,
  );

describe('ReleaseAssurancePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(records());
  });

  it('renders persisted loading/empty states and an explicit QA decision action', async () => {
    renderPanel('qa');
    expect(screen.getByLabelText('Loading QA Certification')).toBeInTheDocument();
    expect(await screen.findByText('No QA Sign-off recorded')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Record QA Sign-off' })).toBeEnabled();
  });

  it('recovers from a generic load error', async () => {
    releaseServiceMocks.listFeatureReleaseRecords
      .mockRejectedValueOnce(new Error('Release records unavailable.'))
      .mockResolvedValueOnce(records());
    const user = userEvent.setup();
    renderPanel('qa');
    expect(await screen.findByText('Release records unavailable.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No QA Sign-off recorded')).toBeInTheDocument();
  });

  it('records QA Sign-off by keyboard without changing any Task field', async () => {
    releaseServiceMocks.createQaSignOff.mockResolvedValue(qaSignOff());
    const user = userEvent.setup();
    renderPanel('qa');
    await user.click(await screen.findByRole('button', { name: 'Record QA Sign-off' }));
    const dialog = screen.getByRole('dialog');
    await user.type(
      within(dialog).getByLabelText('QA certification notes (optional)'),
      'Regression passed on staging.',
    );
    const submit = within(dialog).getByRole('button', { name: 'Record decision' });
    submit.focus();
    await user.keyboard('{Enter}');

    await waitFor(() =>
      expect(releaseServiceMocks.createQaSignOff).toHaveBeenCalledWith(ids.workspace, ids.feature, {
        decision: 'approved',
        notes: 'Regression passed on staging.',
      }),
    );
  });

  it('records an independent Product Owner Release Decision against the latest QA Sign-off', async () => {
    releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(records([qaSignOff()]));
    releaseServiceMocks.createReleaseDecision.mockResolvedValue({ id: 'release-id' });
    const user = userEvent.setup();
    renderPanel('release');
    await user.click(await screen.findByRole('button', { name: 'Record Release Decision' }));
    const dialog = screen.getByRole('dialog');
    await user.type(
      within(dialog).getByLabelText('Release notes (optional)'),
      'Approved for rollout.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Record decision' }));

    await waitFor(() =>
      expect(releaseServiceMocks.createReleaseDecision).toHaveBeenCalledWith(
        ids.workspace,
        ids.feature,
        {
          qaSignOffId: ids.signOff,
          decision: 'approved',
          notes: 'Approved for rollout.',
          overrideReason: null,
        },
      ),
    );
  });

  it('requires an override reason when approving rejected QA certification', async () => {
    releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(
      records([qaSignOff('rejected')]),
    );
    releaseServiceMocks.createReleaseDecision.mockResolvedValue({ id: 'override-id' });
    const user = userEvent.setup();
    renderPanel('release');
    await user.click(await screen.findByRole('button', { name: 'Record Release Decision' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Record decision' }));
    expect(await within(dialog).findByText(/Override reason is required/)).toBeInTheDocument();
    expect(releaseServiceMocks.createReleaseDecision).not.toHaveBeenCalled();

    await user.type(
      within(dialog).getByLabelText('Override reason'),
      'Emergency release with rollback plan.',
    );
    await user.click(within(dialog).getByRole('button', { name: 'Record decision' }));
    await waitFor(() =>
      expect(releaseServiceMocks.createReleaseDecision).toHaveBeenCalledWith(
        ids.workspace,
        ids.feature,
        expect.objectContaining({ overrideReason: 'Emergency release with rollback plan.' }),
      ),
    );
  });

  it('requires an override reason for any backend-derived failed gate and displays its reason', async () => {
    releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(
      records([qaSignOff('approved')], readinessSnapshot('approved', false)),
    );
    releaseServiceMocks.createReleaseDecision.mockResolvedValue({ id: 'development-override-id' });
    const user = userEvent.setup();
    renderPanel('release');

    expect(await screen.findByText('1/2 development subtasks are complete.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Record Release Decision' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('1/2 development subtasks are complete.')).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Record decision' }));
    expect(await within(dialog).findByText(/Override reason is required/)).toBeInTheDocument();
  });

  it('disables self-approval and explains the independent decision requirement', async () => {
    releaseServiceMocks.listFeatureReleaseRecords.mockResolvedValue(records([qaSignOff()]));
    renderPanel('release', { currentUserId: ids.qa, userRole: 'owner' });
    const button = await screen.findByRole('button', { name: 'Record Release Decision' });
    expect(button).toBeDisabled();
    expect(screen.getByText(/cannot make its Release Decision/)).toBeInTheDocument();
  });
});
