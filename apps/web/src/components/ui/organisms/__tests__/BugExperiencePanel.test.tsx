import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import type { BugStatus, BugWithContext } from '@qlick/contracts';
import uiReducer from '../../../../store/uiSlice';
import { BugExperiencePanel } from '../BugExperiencePanel';

const bugMocks = vi.hoisted(() => ({
  listBugs: vi.fn(),
  updateBug: vi.fn(),
  createResolutionEvent: vi.fn(),
  createRetestRun: vi.fn(),
  getRetestHistory: vi.fn(),
  addBugEvidenceLink: vi.fn(),
}));

vi.mock('../../../../lib/api/bugService', () => ({
  bugService: bugMocks,
}));

const ids = {
  workspace: '10000000-0000-4000-8000-000000000001',
  feature: '10000000-0000-4000-8000-000000000002',
  requirement: '10000000-0000-4000-8000-000000000003',
  result: '10000000-0000-4000-8000-000000000004',
  run: '10000000-0000-4000-8000-000000000005',
  testCase: '10000000-0000-4000-8000-000000000006',
  dev: '10000000-0000-4000-8000-000000000007',
  qa: '10000000-0000-4000-8000-000000000008',
  bug: '10000000-0000-4000-8000-000000000009',
  resolutionOne: '10000000-0000-4000-8000-000000000010',
  resolutionTwo: '10000000-0000-4000-8000-000000000011',
  qaSubtask: '10000000-0000-4000-8000-000000000012',
  retestResultOne: '10000000-0000-4000-8000-000000000013',
};

const bugFixture = (status: BugStatus = 'open'): BugWithContext => ({
  id: ids.bug,
  workspaceId: ids.workspace,
  featureTaskId: ids.feature,
  requirementId: ids.requirement,
  testResultId: ids.result,
  assigneeId: ids.dev,
  title: 'Checkout request returns 500',
  severity: 'critical',
  status,
  reproductionDetails: 'Open checkout, select a saved card, and submit payment.',
  resolutionNotes: status === 'resolved' ? 'Corrected the payment mapping.' : null,
  createdBy: ids.qa,
  resolvedAt: status === 'resolved' ? '2026-08-22T09:00:00.000Z' : null,
  verifiedAt: null,
  createdAt: '2026-08-22T08:00:00.000Z',
  updatedAt: '2026-08-22T09:00:00.000Z',
  featureTask: { id: ids.feature, title: 'Returning Customer Checkout' },
  requirement: { id: ids.requirement, code: 'REQ-CHECKOUT', title: 'Simpand card payment' },
  assignee: { id: ids.dev, name: 'Checkout Developer', email: 'dev@example.com' },
  bugEvidenceLinks: [],

  originatingTestResult: {
    id: ids.result,
    status: 'failed',
    actualResult: 'Checkout API returned 500.',
    executedAt: '2026-08-22T08:00:00.000Z',
    evidence: [],
    evidenceLinks: [],
    testRun: {
      id: ids.run,
      testCaseId: ids.testCase,
      build: 'checkout-web-2026.08.22.1',
      environment: 'staging',
    },
  },
});

const renderPanel = (props: Partial<React.ComponentProps<typeof BugExperiencePanel>> = {}) => {
  const store = configureStore({ reducer: { ui: uiReducer } });
  return render(
    <Provider store={store}>
      <BugExperiencePanel
        workspaceId={ids.workspace}
        userRole="qa"
        mode="feature"
        featureTaskId={ids.feature}
        {...props}
      />
    </Provider>,
  );
};

describe('BugExperiencePanel', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    bugMocks.listBugs.mockResolvedValue([]);
    bugMocks.updateBug.mockImplementation(async (_workspaceId, _bugId, input) => ({
      ...bugFixture(input.status || 'open'),
      resolutionNotes: input.resolutionNotes || null,
    }));
    bugMocks.createResolutionEvent.mockResolvedValue({
      id: ids.resolutionOne,
      workspaceId: ids.workspace,
      bugId: ids.bug,
      sequence: 1,
      candidateFingerprint: 'commit:fix-1',
      resolutionNotes: 'Corrected the payment mapping.',
      resolvedBy: ids.dev,
      resolvedAt: '2026-08-22T09:00:00.000Z',
    });
    bugMocks.createRetestRun.mockResolvedValue({
      bugId: ids.bug,
      resolutionEventId: ids.resolutionOne,
      qaSubtaskId: ids.qaSubtask,
      reused: false,
      testRun: {},
    });
    bugMocks.getRetestHistory.mockResolvedValue({
      resolutionEvents: [],
      retestAttempts: [],
      cycles: [],
    });
  });

  it('shows loading and persisted empty states', async () => {
    let resolveRequest: (value: BugWithContext[]) => void = () => undefined;
    bugMocks.listBugs.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );
    renderPanel();
    expect(screen.getByLabelText('Memuat Bug Tertaut')).toBeInTheDocument();
    resolveRequest([]);
    expect(
      await screen.findByText('Belum ada Bug yang tertaut ke Feature ini'),
    ).toBeInTheDocument();
  });

  it('shows a permission state without exposing Bug data', async () => {
    const denied = Object.assign(new Error('Forbidden'), { status: 403 });
    bugMocks.listBugs.mockRejectedValueOnce(denied);
    renderPanel();
    expect(await screen.findByText('Akses Bug ditolak')).toBeInTheDocument();
    expect(screen.queryByText('Checkout request returns 500')).not.toBeInTheDocument();
  });

  it('shows a recoverable API error state', async () => {
    const user = userEvent.setup();
    bugMocks.listBugs
      .mockRejectedValueOnce(new Error('Bug service unavailable'))
      .mockResolvedValueOnce([]);
    renderPanel();

    expect(await screen.findByText('Bug tidak dapat dimuat')).toBeInTheDocument();
    expect(screen.getByText('Bug service unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(
      await screen.findByText('Belum ada Bug yang tertaut ke Feature ini'),
    ).toBeInTheDocument();
  });

  it('renders contextual linked Bug with text and icon status labels', async () => {
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('resolved')]);
    renderPanel({ userRole: 'po' });

    expect(await screen.findByText('Checkout request returns 500')).toBeInTheDocument();
    expect(screen.getByText('Selesai Diperbaiki · Perlu Retest')).toBeInTheDocument();
    expect(screen.getByText('REQ-CHECKOUT · Simpand card payment')).toBeInTheDocument();
    expect(screen.getByText('checkout-web-2026.08.22.1 · staging')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^Verifikasi setelah retest:/ }),
    ).not.toBeInTheDocument();
    expect(bugMocks.listBugs).toHaveBeenCalledWith(ids.workspace, { featureTaskId: ids.feature });
  });

  it('moves keyboard focus to the exact Bug selected from a queue', async () => {
    Element.prototype.scrollIntoView = vi.fn();
    renderPanel({
      focusedBugId: ids.bug,
      initialState: { bugs: [bugFixture('resolved')], error: null, permissionDenied: false },
    });

    const title = await screen.findByText('Checkout request returns 500');
    const card = title.closest('section');
    expect(card).toHaveAttribute('tabindex', '-1');
    await waitFor(() => expect(card).toHaveFocus());
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
  });

  it('loads only the assigned Developer work queue and starts an open Bug', async () => {
    const user = userEvent.setup();
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('open')]).mockResolvedValueOnce([]);
    renderPanel({ mode: 'role_queue', featureTaskId: undefined, userRole: 'dev' });

    await user.click(
      await screen.findByRole('button', {
        name: 'Mulai pengerjaan Bug: Checkout request returns 500',
      }),
    );
    await waitFor(() =>
      expect(bugMocks.updateBug).toHaveBeenCalledWith(ids.workspace, ids.bug, {
        status: 'in_progress',
      }),
    );
    expect(bugMocks.listBugs).toHaveBeenNthCalledWith(1, ids.workspace, { queue: 'assigned_work' });
    expect(await screen.findByText('Belum ada pekerjaan Bug')).toBeInTheDocument();
  });

  it('requires Developer resolution notes before sending a Bug to retest', async () => {
    const user = userEvent.setup();
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('in_progress')]).mockResolvedValueOnce([]);
    renderPanel({ mode: 'role_queue', featureTaskId: undefined, userRole: 'dev' });

    await user.click(
      await screen.findByRole('button', {
        name: 'Selesaikan untuk retest: Checkout request returns 500',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Selesaikan Bug untuk Retest' });
    const submit = within(dialog).getByRole('button', { name: 'Kirim Perbaikan untuk Retest' });
    expect(submit).toBeDisabled();
    await user.type(within(dialog).getByLabelText('Identitas Kandidat Perbaikan'), 'commit:fix-1');
    await user.type(
      within(dialog).getByLabelText('Catatan resolusi'),
      'Corrected the payment mapping.',
    );
    await user.click(submit);

    await waitFor(() =>
      expect(bugMocks.createResolutionEvent).toHaveBeenCalledWith(ids.workspace, ids.bug, {
        candidateFingerprint: 'commit:fix-1',
        resolutionNotes: 'Corrected the payment mapping.',
        evidenceLinks: [],
      }),
    );
    expect(bugMocks.updateBug).not.toHaveBeenCalled();
  });

  it('starts a contextual QA retest without asking for a Result UUID', async () => {
    const user = userEvent.setup();
    const onRetestRunStarted = vi.fn();
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('resolved')]).mockResolvedValueOnce([]);
    renderPanel({
      mode: 'role_queue',
      featureTaskId: undefined,
      userRole: 'qa',
      onRetestRunStarted,
    });

    const verifyButton = await screen.findByRole('button', {
      name: 'Mulai retest Bug: Checkout request returns 500',
    });
    verifyButton.focus();
    expect(verifyButton).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(bugMocks.createRetestRun).toHaveBeenCalledWith(ids.workspace, ids.bug),
    );
    expect(onRetestRunStarted).toHaveBeenCalledWith(ids.qaSubtask);
    expect(screen.queryByText(/Result ID/i)).not.toBeInTheDocument();
    expect(bugMocks.listBugs).toHaveBeenNthCalledWith(1, ids.workspace, { queue: 'retest' });
  });

  it('keeps every Developer and QA evidence set grouped by repair cycle', async () => {
    const user = userEvent.setup();
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('reopened')]);
    bugMocks.getRetestHistory.mockResolvedValueOnce({
      resolutionEvents: [],
      retestAttempts: [],
      cycles: [
        {
          sequence: 1,
          resolutionEvent: {
            id: ids.resolutionOne,
            workspaceId: ids.workspace,
            bugId: ids.bug,
            sequence: 1,
            candidateFingerprint: 'commit:fix-1',
            resolutionNotes: 'Perbaikan pertama.',
            resolvedBy: ids.dev,
            resolvedAt: '2026-08-22T09:00:00.000Z',
          },
          evidenceLinks: [
            {
              id: '10000000-0000-4000-8000-000000000020',
              workspaceId: ids.workspace,
              bugId: ids.bug,
              url: 'https://example.com/dev-fix-1',
              normalizedUrl: 'https://example.com/dev-fix-1',
              provider: 'external',
              mediaKind: 'other',
              label: 'Bukti Dev siklus 1',
              addedBy: ids.dev,
              addedAt: '2026-08-22T09:00:00.000Z',
              previewStatus: 'unsupported',
              evidenceStage: 'resolution',
              resolutionEventId: ids.resolutionOne,
            },
          ],
          retestAttempt: {
            id: '10000000-0000-4000-8000-000000000021',
            workspaceId: ids.workspace,
            bugId: ids.bug,
            resolutionEventId: ids.resolutionOne,
            testResultId: ids.retestResultOne,
            outcome: 'reopened',
            attemptedBy: ids.qa,
            attemptedAt: '2026-08-22T10:00:00.000Z',
            result: {
              id: ids.retestResultOne,
              actualResult: 'Masih gagal pada kartu tersimpan.',
              evidence: [],
              evidenceLinks: [],
            },
            evidenceManifests: [{ readyCount: 1 }],
          },
        },
        {
          sequence: 2,
          resolutionEvent: {
            id: ids.resolutionTwo,
            workspaceId: ids.workspace,
            bugId: ids.bug,
            sequence: 2,
            candidateFingerprint: 'commit:fix-2',
            resolutionNotes: 'Perbaikan kedua.',
            resolvedBy: ids.dev,
            resolvedAt: '2026-08-22T11:00:00.000Z',
          },
          evidenceLinks: [],
          retestAttempt: null,
        },
      ],
    });
    renderPanel({ userRole: 'qa' });

    await user.click(await screen.findByRole('button', { name: 'Riwayat Retest' }));

    const history = await screen.findByRole('dialog', { name: 'Riwayat Perbaikan dan Retest' });
    expect(within(history).getByText('Siklus perbaikan #1')).toBeInTheDocument();
    expect(within(history).getByText('Siklus perbaikan #2')).toBeInTheDocument();
    expect(within(history).getByText('Bukti Dev siklus 1')).toBeInTheDocument();
    expect(within(history).getByText('Masih gagal pada kartu tersimpan.')).toBeInTheDocument();
    expect(within(history).getByText('Menunggu Retest')).toBeInTheDocument();
  });
});
