import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { SubtaskWorkPage } from '../SubtaskWorkPage';
import authReducer from '../../store/authSlice';
import workspaceReducer from '../../store/workspaceSlice';
import taskReducer from '../../store/taskSlice';
import uiReducer from '../../store/uiSlice';

const mocks = vi.hoisted(() => ({
  getTask: vi.fn(),
  updateTask: vi.fn(),
  listTaskComments: vi.fn(),
  listAcceptanceChecks: vi.fn(),
  setAcceptanceCheck: vi.fn(),
  createTaskComment: vi.fn(),
  getTrace: vi.fn(),
  getMembers: vi.fn(),
}));

vi.mock('../../lib/api/taskService', () => ({
  taskService: {
    getTask: (...a: unknown[]) => mocks.getTask(...a),
    updateTask: (...a: unknown[]) => mocks.updateTask(...a),
    listTaskComments: (...a: unknown[]) => mocks.listTaskComments(...a),
    listAcceptanceChecks: (...a: unknown[]) => mocks.listAcceptanceChecks(...a),
    setAcceptanceCheck: (...a: unknown[]) => mocks.setAcceptanceCheck(...a),
    createTaskComment: (...a: unknown[]) => mocks.createTaskComment(...a),
  },
}));
vi.mock('../../lib/api/traceabilityService', () => ({
  traceabilityService: { getParentTaskDeliveryTrace: (...a: unknown[]) => mocks.getTrace(...a) },
}));
vi.mock('../../lib/api/workspaceService', () => ({
  workspaceService: { getMembers: (...a: unknown[]) => mocks.getMembers(...a) },
}));

const workspaceId = '10000000-0000-4000-8000-000000000001';
const parentId = '10000000-0000-4000-8000-000000000002';
const subtaskId = '10000000-0000-4000-8000-000000000003';
const devId = '10000000-0000-4000-8000-000000000099';

const parent = {
  id: parentId,
  workspaceId,
  title: 'Checkout',
  status: 'in_progress',
  priority: 'high',
  reporterId: devId,
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
} as Task;
const subtask = {
  ...parent,
  id: subtaskId,
  parentTaskId: parentId,
  title: 'Form pembayaran',
  deliveryArea: 'frontend',
  status: 'todo',
  assigneeId: devId,
} as Task;

function renderPage(role = 'dev') {
  const store = configureStore({
    reducer: { auth: authReducer, workspace: workspaceReducer, task: taskReducer, ui: uiReducer },
    preloadedState: {
      auth: {
        currentUser: {
          id: devId,
          email: 'dev@example.test',
          name: 'Dev',
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
      <MemoryRouter initialEntries={[`/work/subtasks/${subtaskId}`]}>
        <Routes>
          <Route path="/work/subtasks/:subtaskId" element={<SubtaskWorkPage />} />
          <Route path="/my-tasks" element={<div>Tugas Saya destination</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('SubtaskWorkPage', () => {
  beforeEach(() => {
    Object.values(mocks).forEach((m) => m.mockReset());
    mocks.getTask.mockImplementation((_w: string, id: string) =>
      Promise.resolve(id === subtaskId ? subtask : parent),
    );
    mocks.listTaskComments.mockResolvedValue({ comments: [] });
    mocks.listAcceptanceChecks.mockResolvedValue({ checks: [] });
    mocks.getTrace.mockResolvedValue({ requirements: [] });
    mocks.getMembers.mockResolvedValue([]);
  });

  it('loads the subtask and lets the assigned developer start it', async () => {
    mocks.updateTask.mockResolvedValue({ ...subtask, status: 'in_progress' });
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Form pembayaran' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Mulai dikerjakan' }));

    await waitFor(() =>
      expect(mocks.updateTask).toHaveBeenCalledWith(workspaceId, subtaskId, {
        status: 'in_progress',
      }),
    );
  });

  it('saves a criterion check on the server and shows who checked it (AC-2.11)', async () => {
    mocks.getTrace.mockResolvedValue({
      requirements: [
        {
          requirement: { id: 'r1', code: 'REQ-1' },
          acceptanceCriteria: [{ id: 'a1', code: 'AC-1', text: 'Form tampil' }],
          implementingSubtasks: [{ id: subtaskId }],
        },
      ],
    });
    mocks.getTask.mockImplementation((_w: string, id: string) =>
      Promise.resolve(id === subtaskId ? { ...subtask, status: 'in_progress' } : parent),
    );
    mocks.setAcceptanceCheck.mockResolvedValue({
      checks: [
        {
          acceptanceCriterionId: 'a1',
          checkedBy: devId,
          checkedByName: 'Dev',
          checkedAt: '2026-10-28T01:00:00.000Z',
        },
      ],
    });
    renderPage();

    fireEvent.click(await screen.findByRole('checkbox'));
    await waitFor(() =>
      expect(mocks.setAcceptanceCheck).toHaveBeenCalledWith(workspaceId, subtaskId, 'a1', true),
    );
    expect(await screen.findByText('Dicek oleh Dev')).toBeInTheDocument();
  });

  it('restores saved checks after a reload', async () => {
    mocks.getTrace.mockResolvedValue({
      requirements: [
        {
          requirement: { id: 'r1', code: 'REQ-1' },
          acceptanceCriteria: [{ id: 'a1', code: 'AC-1', text: 'Form tampil' }],
          implementingSubtasks: [{ id: subtaskId }],
        },
      ],
    });
    mocks.listAcceptanceChecks.mockResolvedValue({
      checks: [
        {
          acceptanceCriterionId: 'a1',
          checkedBy: devId,
          checkedByName: 'Dev',
          checkedAt: '2026-10-28T01:00:00.000Z',
        },
      ],
    });
    renderPage();
    expect(await screen.findByRole('checkbox')).toBeChecked();
  });

  it('is read-only for a developer who is not assigned', async () => {
    mocks.getTask.mockImplementation((_w: string, id: string) =>
      Promise.resolve(id === subtaskId ? { ...subtask, assigneeId: 'someone-else' } : parent),
    );
    renderPage();

    expect(await screen.findByRole('heading', { name: 'Form pembayaran' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mulai dikerjakan' })).not.toBeInTheDocument();
  });

  it('renders forbidden and not-found states', async () => {
    mocks.getTask.mockRejectedValue(Object.assign(new Error('x'), { status: 403 }));
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Akses subtask dibatasi' }),
    ).toBeInTheDocument();
  });

  it('renders the not-found state for a missing subtask', async () => {
    mocks.getTask.mockRejectedValue(Object.assign(new Error('x'), { status: 404 }));
    renderPage();
    expect(
      await screen.findByRole('heading', { name: 'Subtask tidak ditemukan (404)' }),
    ).toBeInTheDocument();
  });
});
