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
  requirement: { id: ids.requirement, code: 'REQ-CHECKOUT', title: 'Saved card payment' },
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
    vi.clearAllMocks();
    bugMocks.listBugs.mockResolvedValue([]);
    bugMocks.updateBug.mockImplementation(async (_workspaceId, _bugId, input) => ({
      ...bugFixture(input.status || 'open'),
      resolutionNotes: input.resolutionNotes || null,
    }));
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
    expect(screen.getByLabelText('Loading Linked Bugs')).toBeInTheDocument();
    resolveRequest([]);
    expect(await screen.findByText('No Bugs linked to this Feature')).toBeInTheDocument();
  });

  it('shows a permission state without exposing Bug data', async () => {
    const denied = Object.assign(new Error('Forbidden'), { status: 403 });
    bugMocks.listBugs.mockRejectedValueOnce(denied);
    renderPanel();
    expect(await screen.findByText('Bug access denied')).toBeInTheDocument();
    expect(screen.queryByText('Checkout request returns 500')).not.toBeInTheDocument();
  });

  it('shows a recoverable API error state', async () => {
    const user = userEvent.setup();
    bugMocks.listBugs
      .mockRejectedValueOnce(new Error('Bug service unavailable'))
      .mockResolvedValueOnce([]);
    renderPanel();

    expect(await screen.findByText('Unable to load Bugs')).toBeInTheDocument();
    expect(screen.getByText('Bug service unavailable')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText('No Bugs linked to this Feature')).toBeInTheDocument();
  });

  it('renders contextual linked Bugs with text and icon status labels', async () => {
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('resolved')]);
    renderPanel({ userRole: 'po' });

    expect(await screen.findByText('Checkout request returns 500')).toBeInTheDocument();
    expect(screen.getByText('Resolved · Retest needed')).toBeInTheDocument();
    expect(screen.getByText('REQ-CHECKOUT · Saved card payment')).toBeInTheDocument();
    expect(screen.getByText('checkout-web-2026.08.22.1 · staging')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Verify after retest:/ })).not.toBeInTheDocument();
    expect(bugMocks.listBugs).toHaveBeenCalledWith(ids.workspace, { featureTaskId: ids.feature });
  });

  it('loads only the assigned Developer work queue and starts an open Bug', async () => {
    const user = userEvent.setup();
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('open')]).mockResolvedValueOnce([]);
    renderPanel({ mode: 'role_queue', featureTaskId: undefined, userRole: 'dev' });

    await user.click(
      await screen.findByRole('button', { name: 'Start Bug work: Checkout request returns 500' }),
    );
    await waitFor(() =>
      expect(bugMocks.updateBug).toHaveBeenCalledWith(ids.workspace, ids.bug, {
        status: 'in_progress',
      }),
    );
    expect(bugMocks.listBugs).toHaveBeenNthCalledWith(1, ids.workspace, { queue: 'assigned_work' });
    expect(await screen.findByText('No assigned Bug work')).toBeInTheDocument();
  });

  it('requires Developer resolution notes before sending a Bug to retest', async () => {
    const user = userEvent.setup();
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('in_progress')]).mockResolvedValueOnce([]);
    renderPanel({ mode: 'role_queue', featureTaskId: undefined, userRole: 'dev' });

    await user.click(
      await screen.findByRole('button', {
        name: 'Resolve for retest: Checkout request returns 500',
      }),
    );
    const dialog = screen.getByRole('dialog', { name: 'Resolve Bug for retest' });
    const submit = within(dialog).getByRole('button', { name: 'Resolve and send to retest' });
    expect(submit).toBeDisabled();
    await user.type(
      within(dialog).getByLabelText('Resolution notes'),
      'Corrected the payment mapping.',
    );
    await user.click(submit);

    await waitFor(() =>
      expect(bugMocks.updateBug).toHaveBeenCalledWith(ids.workspace, ids.bug, {
        status: 'resolved',
        resolutionNotes: 'Corrected the payment mapping.',
      }),
    );
  });

  it('loads the QA retest queue and verifies a resolved Bug', async () => {
    const user = userEvent.setup();
    bugMocks.listBugs.mockResolvedValueOnce([bugFixture('resolved')]).mockResolvedValueOnce([]);
    renderPanel({ mode: 'role_queue', featureTaskId: undefined, userRole: 'qa' });

    const verifyButton = await screen.findByRole('button', {
      name: 'Verify after retest: Checkout request returns 500',
    });
    verifyButton.focus();
    expect(verifyButton).toHaveFocus();
    await user.keyboard('{Enter}');
    await waitFor(() =>
      expect(bugMocks.updateBug).toHaveBeenCalledWith(ids.workspace, ids.bug, {
        status: 'verified',
      }),
    );
    expect(bugMocks.listBugs).toHaveBeenNthCalledWith(1, ids.workspace, { queue: 'retest' });
    expect(await screen.findByText('No Bugs awaiting retest')).toBeInTheDocument();
  });
});
