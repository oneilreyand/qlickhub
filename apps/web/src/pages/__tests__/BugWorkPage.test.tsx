import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BugWorkPage } from '../BugWorkPage';
import authReducer from '../../store/authSlice';
import uiReducer from '../../store/uiSlice';
import workspaceReducer from '../../store/workspaceSlice';

const bugMocks = vi.hoisted(() => ({
  getBug: vi.fn(),
  getRetestHistory: vi.fn(),
  updateBug: vi.fn(),
  createResolutionEvent: vi.fn(),
  createRetestRun: vi.fn(),
  listBugActivity: vi.fn(),
  reopenBug: vi.fn(),
}));
const tmMocks = vi.hoisted(() => ({
  listQaTestCycles: vi.fn(),
  createQaTestCycle: vi.fn(),
}));
vi.mock('../../lib/api/testManagementService', () => ({ testManagementService: tmMocks }));
vi.mock('../../lib/api/bugService', () => ({ bugService: bugMocks }));
vi.mock('../../lib/api/workspaceService', () => ({
  workspaceService: { getMembers: vi.fn().mockResolvedValue([]) },
}));

const bug = {
  id: 'b1',
  workspaceId: 'w1',
  featureTaskId: 'f1',
  requirementId: 'r1',
  environment: 'staging',
  assigneeId: 'dev-1',
  title: 'Total checkout salah',
  severity: 'high',
  status: 'open',
  reproductionDetails: 'Langkah',
  createdBy: 'qa-1',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  featureTask: { id: 'f1', title: 'Checkout' },
  requirement: { id: 'r1', code: 'REQ-1', title: 'Total' },
  assignee: { id: 'dev-1', name: 'Dev Satu', email: 'd@x.id' },
  originatingTestResult: null,
  originatingTestCase: null,
  bugEvidenceLinks: [],
};

function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

function renderPage(role: 'dev' | 'qa', userId: string) {
  const store = configureStore({
    reducer: { auth: authReducer, ui: uiReducer, workspace: workspaceReducer },
    preloadedState: {
      auth: {
        currentUser: { id: userId, email: 'u@example.test', name: 'U', role },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'succeeded' as const,
        error: null,
      },
      workspace: {
        workspaces: [],
        activeWorkspaceId: 'w1',
        members: [],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/work/bugs/b1']}>
        <LocationProbe />
        <Routes>
          <Route path="/work/bugs/:bugId" element={<BugWorkPage />} />
          <Route path="*" element={<div>other</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('BugWorkPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bugMocks.getBug.mockResolvedValue(bug);
    bugMocks.getRetestHistory.mockResolvedValue({ cycles: [] });
    bugMocks.updateBug.mockResolvedValue({});
    tmMocks.listQaTestCycles.mockResolvedValue([]);
    bugMocks.listBugActivity.mockResolvedValue([]);
  });

  it('lets the assigned developer start the bug', async () => {
    renderPage('dev', 'dev-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Mulai dikerjakan' }));
    await waitFor(() =>
      expect(bugMocks.updateBug).toHaveBeenCalledWith('w1', 'b1', { status: 'in_progress' }),
    );
  });

  it('hides developer actions from a developer who is not the assignee', async () => {
    renderPage('dev', 'dev-2');
    await screen.findByText('Total checkout salah');
    expect(screen.queryByRole('button', { name: 'Mulai dikerjakan' })).not.toBeInTheDocument();
  });

  it('creates the Test Cycle for the fix candidate before starting the retest', async () => {
    bugMocks.getBug.mockResolvedValue({
      ...bug,
      status: 'resolved',
      originatingTestResult: { testRun: { build: 'b1', environment: 'staging' } },
    });
    bugMocks.getRetestHistory.mockResolvedValue({
      cycles: [
        {
          sequence: 1,
          resolutionEvent: { candidateFingerprint: 'commit:fix1', resolutionNotes: 'ok' },
          evidenceLinks: [],
          retestAttempt: null,
        },
      ],
    });
    tmMocks.listQaTestCycles.mockResolvedValue([
      {
        id: 'c0',
        ownerQaId: 'qa-1',
        qaSubtaskId: 'qs1',
        candidateFingerprint: 'commit:old',
        build: 'b1',
        environment: 'staging',
        status: 'in_progress',
      },
    ]);
    tmMocks.createQaTestCycle.mockResolvedValue({});
    bugMocks.createRetestRun.mockResolvedValue({
      qaSubtaskId: 'qs1',
      reused: false,
      testRun: { testCaseId: 'tc1' },
    });
    renderPage('qa', 'qa-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Mulai retest' }));
    await waitFor(() =>
      expect(tmMocks.createQaTestCycle).toHaveBeenCalledWith('w1', {
        featureTaskId: 'f1',
        qaSubtaskId: 'qs1',
        candidateFingerprint: 'commit:fix1',
        build: 'b1',
        environment: 'staging',
      }),
    );
    await waitFor(() => expect(bugMocks.createRetestRun).toHaveBeenCalled());
  });

  it('lets QA reopen a verified bug with a reason', async () => {
    bugMocks.getBug.mockResolvedValue({ ...bug, status: 'verified' });
    bugMocks.reopenBug.mockResolvedValue({});
    renderPage('qa', 'qa-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Buka kembali' }));
    await userEvent.type(screen.getByLabelText('Alasan dibuka kembali'), 'Muncul lagi di build 2');
    await userEvent.click(screen.getByRole('button', { name: 'Buka kembali Bug' }));
    await waitFor(() =>
      expect(bugMocks.reopenBug).toHaveBeenCalledWith('w1', 'b1', 'Muncul lagi di build 2'),
    );
  });

  it('shows the QA reason to the developer on a reopened bug', async () => {
    bugMocks.getBug.mockResolvedValue({ ...bug, status: 'reopened' });
    bugMocks.listBugActivity.mockResolvedValue([
      {
        action: 'bug_reopened',
        fromStatus: 'verified',
        toStatus: 'reopened',
        metadata: { reason: 'Total salah lagi' },
      },
    ]);
    renderPage('dev', 'dev-1');
    expect(await screen.findByText(/Alasan: Total salah lagi/)).toBeInTheDocument();
  });

  it('opens the retest run page for QA', async () => {
    bugMocks.getBug.mockResolvedValue({ ...bug, status: 'resolved' });
    bugMocks.createRetestRun.mockResolvedValue({
      qaSubtaskId: 'qs1',
      reused: false,
      testRun: { testCaseId: 'tc1' },
    });
    renderPage('qa', 'qa-1');
    await userEvent.click(await screen.findByRole('button', { name: 'Mulai retest' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/tests/cases/tc1/run'),
    );
  });
});
