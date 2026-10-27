import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { SubtaskWorkPage } from '../SubtaskWorkPage';
import authReducer from '../../store/authSlice';
import workspaceReducer from '../../store/workspaceSlice';
import taskReducer from '../../store/taskSlice';
import uiReducer from '../../store/uiSlice';

const mocks = vi.hoisted(() => ({
  getTask: vi.fn(),
  listTaskComments: vi.fn(),
  listTaskActivity: vi.fn(),
  getTrace: vi.fn(),
  getExecutions: vi.fn(),
  listCycles: vi.fn(),
  listVersions: vi.fn(),
  listMappings: vi.fn(),
  deleteTestCase: vi.fn(),
}));

vi.mock('../../lib/api/taskService', () => ({
  taskService: {
    getTask: (...a: unknown[]) => mocks.getTask(...a),
    listTaskComments: (...a: unknown[]) => mocks.listTaskComments(...a),
    listTaskActivity: (...a: unknown[]) => mocks.listTaskActivity(...a),
  },
}));
vi.mock('../../lib/api/traceabilityService', () => ({
  traceabilityService: { getParentTaskDeliveryTrace: (...a: unknown[]) => mocks.getTrace(...a) },
}));
vi.mock('../../lib/api/testManagementService', () => ({
  testManagementService: {
    getTaskTestExecutions: (...a: unknown[]) => mocks.getExecutions(...a),
    listQaTestCycles: (...a: unknown[]) => mocks.listCycles(...a),
    listTestCaseVersionCoverage: (...a: unknown[]) => mocks.listVersions(...a),
    listTestCaseVersionAcceptanceCriteria: (...a: unknown[]) => mocks.listMappings(...a),
    deleteTestCase: (...a: unknown[]) => mocks.deleteTestCase(...a),
  },
}));

const workspaceId = '10000000-0000-4000-8000-000000000001';
const parentId = '10000000-0000-4000-8000-000000000002';
const qaSubtaskId = '10000000-0000-4000-8000-000000000003';
const devSubtaskId = '10000000-0000-4000-8000-000000000004';
const qaId = '10000000-0000-4000-8000-000000000098';
const devId = '10000000-0000-4000-8000-000000000099';

const parent = { id: parentId, workspaceId, title: 'Checkout', status: 'in_progress' } as Task;
const qaSubtask = {
  id: qaSubtaskId,
  workspaceId,
  parentTaskId: parentId,
  title: 'Uji pembayaran',
  deliveryArea: 'qa',
  status: 'in_progress',
  assigneeId: qaId,
  updatedAt: '2026-10-01T08:00:00.000Z',
} as Task;
const devSubtask = {
  id: devSubtaskId,
  workspaceId,
  parentTaskId: parentId,
  title: 'Form pembayaran',
  deliveryArea: 'backend',
  status: 'in_review',
  assigneeId: devId,
  updatedAt: '2026-10-01T06:15:00.000Z',
} as Task;

function RunProbe() {
  const location = useLocation();
  return <div>run:{`${location.pathname}${location.search}`}</div>;
}

function renderPage(role = 'qa', userId = qaId) {
  const store = configureStore({
    reducer: { auth: authReducer, workspace: workspaceReducer, task: taskReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        currentUser: {
          id: userId,
          email: 'qa@example.test',
          name: 'QA',
          role,
          onboardingCompletedAt: '2026-08-23T00:00:00.000Z',
        },
        isAuthenticated: true,
        showOnboardingModal: false,
        status: 'succeeded' as const,
        error: null,
      },
      workspace: {
        workspaces: [],
        activeWorkspaceId: workspaceId,
        members: [
          { userId: devId, user: { name: 'Bima', email: 'bima@example.test' } },
          { userId: qaId, user: { name: 'Sari', email: 'sari@example.test' } },
        ] as unknown as [],
        isLoading: false,
        isMembersLoading: false,
        isInitialized: true,
        error: null,
      },
    },
  });
  render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/work/subtasks/${qaSubtaskId}`]}>
        <Routes>
          <Route path="/work/subtasks/:subtaskId" element={<SubtaskWorkPage />} />
          <Route path="/tests/cases/:testCaseId/run" element={<RunProbe />} />
          <Route path="/tests/cases/new" element={<RunProbe />} />
          <Route path="/my-tasks" element={<div>Tugas Saya destination</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('SubtaskWorkPage for a QA subtask (AC-3.7)', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.getTask.mockImplementation((_w: string, id: string) =>
      Promise.resolve(id === qaSubtaskId ? qaSubtask : parent),
    );
    mocks.getTrace.mockResolvedValue({
      requirements: [
        {
          requirement: { id: 'req-1', code: 'REQ-1' },
          acceptanceCriteria: [{ id: 'ac-1', code: 'AC-1.1', text: 'a' }],
          implementingSubtasks: [qaSubtask, devSubtask],
        },
      ],
    });
    mocks.listTaskComments.mockImplementation((_w: string, id: string) =>
      Promise.resolve({
        comments:
          id === devSubtaskId
            ? [
                {
                  id: 'c1',
                  authorId: devId,
                  body: 'Siap diuji, fixture tersedia.',
                  createdAt: '2026-10-01T06:14:00.000Z',
                },
              ]
            : [],
      }),
    );
    mocks.getExecutions.mockResolvedValue({
      executions: [
        {
          testCase: {
            id: 'tc-1',
            title: 'Bayar dengan kartu',
            status: 'active',
            createdAt: '2026-10-01T07:00:00.000Z',
            requirementIds: ['req-1'],
            createdBy: qaId,
          },
          latestRun: null,
          testRuns: [],
        },
      ],
    });
    mocks.listCycles.mockResolvedValue([
      { id: 'cy-1', status: 'in_progress', build: 'b1', environment: 'staging' },
    ]);
    mocks.listVersions.mockResolvedValue([{ id: 'v1', lifecycleStatus: 'active' }]);
    mocks.listMappings.mockResolvedValue({
      mappings: [{ acceptanceCriterionId: 'ac-1', mappingStatus: 'mapped' }],
    });
    mocks.listTaskActivity.mockResolvedValue({ activities: [], total: 0, page: 1 });
  });

  it('shows the QA work page with handoff, Test Cases, AC codes, and status panel', async () => {
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Uji pembayaran' })).toBeInTheDocument();
    expect(await screen.findByText('Bayar dengan kartu')).toBeInTheDocument();
    expect(await screen.findByText('TC-01 · AC-1.1')).toBeInTheDocument();
    expect(await screen.findByText('Siap diuji, fixture tersedia.')).toBeInTheDocument();
    expect(screen.getByText(/Bima \(BE\) mengirim ke QA/)).toBeInTheDocument();
    expect(screen.getByText('staging · b1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Kirim ke QA' })).not.toBeInTheDocument();
  });

  it('opens the run page with the chosen result and the subtask in the URL', async () => {
    renderPage();
    expect(await screen.findByText('Bayar dengan kartu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Gagal' }));
    expect(
      await screen.findByText(`run:/tests/cases/tc-1/run?subtaskId=${qaSubtaskId}&hasil=failed`),
    ).toBeInTheDocument();
  });

  it('opens the add page from the + Test Case button', async () => {
    renderPage();
    expect(await screen.findByText('Bayar dengan kartu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '+ Test Case' }));
    expect(
      await screen.findByText(`run:/tests/cases/new?subtaskId=${qaSubtaskId}`),
    ).toBeInTheDocument();
  });

  it('deletes an unexecuted Test Case after confirmation', async () => {
    mocks.deleteTestCase.mockResolvedValue(undefined);
    renderPage();
    expect(await screen.findByText('Bayar dengan kartu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hapus Test Case Bayar dengan kartu' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Hapus Test Case' }));
    await waitFor(() => expect(mocks.deleteTestCase).toHaveBeenCalledWith(workspaceId, 'tc-1'));
    await waitFor(() => expect(screen.queryByText('Bayar dengan kartu')).not.toBeInTheDocument());
  });

  it('opens the activity drawer', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: 'Aktivitas' }));
    await waitFor(() => expect(mocks.listTaskActivity).toHaveBeenCalled());
  });

  it('is read-only for a non-assigned viewer', async () => {
    renderPage('owner', 'someone-else');
    expect(await screen.findByText('Bayar dengan kartu')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Test Case' })).not.toBeInTheDocument();
  });
});
