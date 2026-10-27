import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { TestCaseNewPage } from '../TestCaseNewPage';
import { TestCaseRunPage } from '../TestCaseRunPage';
import authReducer from '../../store/authSlice';
import workspaceReducer from '../../store/workspaceSlice';
import uiReducer from '../../store/uiSlice';

const m = vi.hoisted(() => ({
  getTask: vi.fn(),
  listSubtasks: vi.fn(),
  getTrace: vi.fn(),
  getTestCase: vi.fn(),
  validateScope: vi.fn(),
  getExecutions: vi.fn(),
  listCycles: vi.fn(),
  listVersions: vi.fn(),
  createTestCase: vi.fn(),
  replaceAc: vi.fn(),
  updateTestCase: vi.fn(),
  createRun: vi.fn(),
  recordResult: vi.fn(),
  createCycle: vi.fn(),
}));

vi.mock('../../lib/api/taskService', () => ({
  taskService: {
    getTask: (...a: unknown[]) => m.getTask(...a),
    listSubtasks: (...a: unknown[]) => m.listSubtasks(...a),
  },
}));
vi.mock('../../lib/api/traceabilityService', () => ({
  traceabilityService: { getParentTaskDeliveryTrace: (...a: unknown[]) => m.getTrace(...a) },
}));
vi.mock('../../lib/api/testManagementService', () => ({
  testManagementService: {
    getTestCase: (...a: unknown[]) => m.getTestCase(...a),
    validateTestCaseScope: (...a: unknown[]) => m.validateScope(...a),
    getTaskTestExecutions: (...a: unknown[]) => m.getExecutions(...a),
    listQaTestCycles: (...a: unknown[]) => m.listCycles(...a),
    listTestCaseVersionCoverage: (...a: unknown[]) => m.listVersions(...a),
    createTestCase: (...a: unknown[]) => m.createTestCase(...a),
    replaceTestCaseVersionAcceptanceCriteria: (...a: unknown[]) => m.replaceAc(...a),
    updateTestCase: (...a: unknown[]) => m.updateTestCase(...a),
    createTestRun: (...a: unknown[]) => m.createRun(...a),
    recordTestResult: (...a: unknown[]) => m.recordResult(...a),
    createQaTestCycle: (...a: unknown[]) => m.createCycle(...a),
  },
}));

const ws = '10000000-0000-4000-8000-000000000001';
const me = '10000000-0000-4000-8000-000000000099';
const featureId = 'feature-1';
const qaSubtask = {
  id: 'qa-sub-1',
  workspaceId: ws,
  parentTaskId: featureId,
  title: 'Uji endpoint',
  deliveryArea: 'qa',
  assigneeId: me,
  status: 'in_progress',
} as Task;
const testCase = {
  id: 'tc-1',
  title: 'Halaman 2',
  status: 'active',
  scenarioKind: 'positive',
  priority: 'high',
  steps: ['Buka'],
  requirementIds: ['r1'],
};
const trace = {
  requirements: [
    {
      requirement: { id: 'r1', code: 'REQ-1' },
      acceptanceCriteria: [{ id: 'a1', code: 'AC-1', text: 'Halaman 1', status: 'active' }],
      testCases: [],
    },
  ],
};

function Probe() {
  const location = useLocation();
  return <div data-testid="at">{location.pathname + location.search}</div>;
}

function renderAt(path: string, role = 'qa') {
  const store = configureStore({
    reducer: { auth: authReducer, workspace: workspaceReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        currentUser: {
          id: me,
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
        activeWorkspaceId: ws,
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
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/tests/cases/new" element={<TestCaseNewPage />} />
          <Route path="/tests/cases/:testCaseId/run" element={<TestCaseRunPage />} />
          <Route path="/my-tasks" element={<div>Tugas Saya destination</div>} />
        </Routes>
        <Probe />
      </MemoryRouter>
    </Provider>,
  );
}

beforeEach(() => {
  // jsdom belum menyediakan File.arrayBuffer; browser sungguhan sudah.
  if (!File.prototype.arrayBuffer) {
    File.prototype.arrayBuffer = () => Promise.resolve(new ArrayBuffer(1));
  }
  Object.values(m).forEach((fn) => fn.mockReset());
  m.getTask.mockResolvedValue(qaSubtask);
  m.getTrace.mockResolvedValue(trace);
  m.getTestCase.mockResolvedValue(testCase);
  m.getExecutions.mockResolvedValue({ executions: [{ testCase, latestRun: null, testRuns: [] }] });
  m.listCycles.mockResolvedValue([]);
  m.listVersions.mockResolvedValue([{ id: 'v1', lifecycleStatus: 'active' }]);
});

describe('TestCaseNewPage', () => {
  it('saves a draft, maps the AC, activates through the QA subtask, then opens the run page', async () => {
    m.createTestCase.mockResolvedValue({ id: 'tc-new' });
    m.listVersions.mockResolvedValue([{ id: 'v-draft', lifecycleStatus: 'draft' }]);
    m.replaceAc.mockResolvedValue({});
    m.updateTestCase.mockResolvedValue({});
    renderAt(`/tests/cases/new?subtaskId=${qaSubtask.id}`);

    fireEvent.change(await screen.findByLabelText('Judul'), { target: { value: 'Halaman 2' } });
    fireEvent.click(screen.getByRole('button', { name: /REQ-1 AC-1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan & jalankan sekarang' }));

    await waitFor(() =>
      expect(screen.getByTestId('at')).toHaveTextContent(
        `/tests/cases/tc-new/run?subtaskId=${qaSubtask.id}`,
      ),
    );
    expect(m.createTestCase).toHaveBeenCalledWith(
      ws,
      expect.objectContaining({ title: 'Halaman 2', status: 'draft', requirementIds: ['r1'] }),
    );
    expect(m.replaceAc).toHaveBeenCalledWith(ws, 'tc-new', 'v-draft', [
      { acceptanceCriterionId: 'a1', mappingStatus: 'mapped' },
    ]);
    expect(m.updateTestCase).toHaveBeenCalledWith(ws, 'tc-new', {
      status: 'active',
      qaSubtaskId: qaSubtask.id,
    });
  });

  it('does not create a duplicate Test Case when activation fails and is retried', async () => {
    m.createTestCase.mockResolvedValue({ id: 'tc-new' });
    m.listVersions.mockResolvedValue([{ id: 'v-draft', lifecycleStatus: 'draft' }]);
    m.replaceAc.mockResolvedValue({});
    m.updateTestCase
      .mockRejectedValueOnce(new Error('Subtask sudah selesai'))
      .mockResolvedValue({});
    renderAt(`/tests/cases/new?subtaskId=${qaSubtask.id}`);

    fireEvent.change(await screen.findByLabelText('Judul'), { target: { value: 'Halaman 2' } });
    fireEvent.click(screen.getByRole('button', { name: /REQ-1 AC-1/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Test Case' }));

    expect(
      await screen.findByText(/tersimpan sebagai draf, tetapi belum aktif/),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Simpan Test Case' }));
    await waitFor(() => expect(screen.getByText('Tugas Saya destination')).toBeInTheDocument());
    expect(m.createTestCase).toHaveBeenCalledTimes(1);
    expect(m.replaceAc).toHaveBeenCalledTimes(1);
    expect(m.updateTestCase).toHaveBeenCalledTimes(2);
  });

  it('asks for a subtask when none is given and is read-only for non-QA', async () => {
    renderAt('/tests/cases/new');
    expect(await screen.findByText('Subtask uji belum dipilih')).toBeInTheDocument();
  });

  it('does not allow a non-QA role to save', async () => {
    renderAt(`/tests/cases/new?subtaskId=${qaSubtask.id}`, 'dev');
    expect(await screen.findByText(/Hanya QA yang ditugaskan/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan Test Case' })).toBeDisabled();
  });
});

describe('TestCaseRunPage', () => {
  const cycle = {
    id: 'cycle-1',
    status: 'in_progress',
    build: 'b1',
    environment: 'staging',
    candidateFingerprint: 'commit:1',
  };

  it('creates the run and records a failed result with evidence', async () => {
    m.listCycles.mockResolvedValue([cycle]);
    m.createRun.mockResolvedValue({ id: 'run-1' });
    m.recordResult.mockResolvedValue({});
    renderAt(`/tests/cases/${testCase.id}/run?subtaskId=${qaSubtask.id}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Gagal' }));
    fireEvent.change(screen.getByLabelText(/Hasil aktual/), { target: { value: 'Kosong' } });
    fireEvent.change(screen.getByLabelText(/Tautan bukti/), {
      target: { value: 'https://www.loom.com/share/abc123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tambah tautan' }));
    fireEvent.click(screen.getByRole('button', { name: 'Simpan hasil' }));

    await waitFor(() => expect(m.recordResult).toHaveBeenCalled());
    expect(m.createRun).toHaveBeenCalledWith(
      ws,
      testCase.id,
      expect.objectContaining({
        testCycleId: 'cycle-1',
        testCaseVersionId: 'v1',
        qaSubtaskId: 'qa-sub-1',
      }),
    );
    expect(m.recordResult).toHaveBeenCalledWith(
      ws,
      testCase.id,
      'run-1',
      expect.objectContaining({
        status: 'failed',
        actualResult: 'Kosong',
        evidenceLinks: [{ url: 'https://www.loom.com/share/abc123', label: undefined }],
      }),
    );
  });

  it('offers to start a cycle when none is active', async () => {
    m.listCycles.mockResolvedValue([
      { ...cycle, id: 'old', status: 'completed', build: 'lama', environment: 'staging' },
    ]);
    m.createCycle.mockResolvedValue({});
    renderAt(`/tests/cases/${testCase.id}/run?subtaskId=${qaSubtask.id}`);

    fireEvent.click(await screen.findByRole('button', { name: 'Mulai siklus uji' }));
    await waitFor(() =>
      expect(m.createCycle).toHaveBeenCalledWith(
        ws,
        expect.objectContaining({ build: 'lama', environment: 'staging', qaSubtaskId: 'qa-sub-1' }),
      ),
    );
  });

  it('finds the only assigned QA subtask automatically when none is given', async () => {
    m.listCycles.mockResolvedValue([cycle]);
    m.validateScope.mockResolvedValue({ valid: true, errors: [], featureTaskId: featureId });
    m.listSubtasks.mockResolvedValue({ tasks: [qaSubtask], total: 1, page: 1, limit: 100 });
    renderAt(`/tests/cases/${testCase.id}/run`);

    expect(await screen.findByRole('button', { name: 'Simpan hasil' })).toBeInTheDocument();
    expect(m.getExecutions).toHaveBeenCalledWith(ws, 'qa-sub-1');
  });

  it('asks which subtask to use when several match, and explains when none does', async () => {
    m.validateScope.mockResolvedValue({ valid: true, errors: [], featureTaskId: featureId });
    m.listSubtasks.mockResolvedValue({
      tasks: [qaSubtask, { ...qaSubtask, id: 'qa-sub-2', title: 'Uji UI' }],
      total: 2,
      page: 1,
      limit: 100,
    });
    renderAt(`/tests/cases/${testCase.id}/run`);
    expect(await screen.findByRole('button', { name: 'Uji endpoint' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Uji UI' })).toBeInTheDocument();
  });

  it('explains when no assigned QA subtask exists', async () => {
    m.validateScope.mockResolvedValue({ valid: false, errors: ['x'], featureTaskId: null });
    renderAt(`/tests/cases/${testCase.id}/run`);
    expect(await screen.findByText(/Tidak ditemukan subtask QA aktif/)).toBeInTheDocument();
  });

  it('blocks running an inactive Test Case', async () => {
    m.getTestCase.mockResolvedValue({ ...testCase, status: 'draft' });
    m.listCycles.mockResolvedValue([cycle]);
    renderAt(`/tests/cases/${testCase.id}/run?subtaskId=${qaSubtask.id}`);
    expect(await screen.findByText(/belum aktif/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Simpan hasil' })).toBeDisabled();
  });

  it('shows 404 for a missing Test Case', async () => {
    m.getTestCase.mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
    renderAt(`/tests/cases/${testCase.id}/run?subtaskId=${qaSubtask.id}`);
    expect(await screen.findByText('Test Case tidak ditemukan (404)')).toBeInTheDocument();
  });
});
