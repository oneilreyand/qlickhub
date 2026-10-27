import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { FeatureDetailPage } from '../FeatureDetailPage';
import authReducer from '../../store/authSlice';
import folderReducer from '../../store/folderSlice';
import workspaceReducer from '../../store/workspaceSlice';
import taskReducer from '../../store/taskSlice';

const { getTaskMock, getFolderTreeMock } = vi.hoisted(() => ({
  getTaskMock: vi.fn(),
  getFolderTreeMock: vi.fn(),
}));

vi.mock('../../lib/api/taskService', () => ({
  taskService: { getTask: (...args: unknown[]) => getTaskMock(...args) },
}));

vi.mock('../../lib/api/folderService', () => ({
  folderService: { getFolderTree: (...args: unknown[]) => getFolderTreeMock(...args) },
}));

vi.mock('../../lib/hooks/useReleaseReadinessMap', () => ({
  useReleaseReadinessMap: () => ({ stateByFeatureTaskId: {}, reload: vi.fn() }),
}));

vi.mock('../../components/ui/organisms/TaskDetailDrawer', () => ({
  TaskDetailDrawer: ({
    task,
    layout,
    initialTab,
    backLabel,
    onClose,
    onTabChange,
  }: {
    task: Task;
    layout?: string;
    initialTab?: string;
    backLabel?: string;
    onClose: () => void;
    onTabChange?: (tabId: string) => void;
  }) => (
    <div data-testid="feature-page" data-layout={layout} data-initial-tab={initialTab ?? ''}>
      <span>{task.title}</span>
      <button type="button" onClick={onClose}>
        {backLabel}
      </button>
      <button type="button" onClick={() => onTabChange?.('subtasks')}>
        ke Subtask
      </button>
    </div>
  ),
}));

const workspaceId = '10000000-0000-4000-8000-000000000001';
const featureId = '10000000-0000-4000-8000-000000000002';

const feature: Task = {
  id: featureId,
  workspaceId,
  title: 'Sistem Manajemen Tugas',
  status: 'in_progress',
  priority: 'high',
  reporterId: '10000000-0000-4000-8000-000000000003',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
};

function createStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      folder: folderReducer,
      workspace: workspaceReducer,
      task: taskReducer,
    },
    preloadedState: {
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
}

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}`}</output>;
};

function renderPage(entry: string | { pathname: string; search?: string; state?: unknown }) {
  return render(
    <Provider store={createStore()}>
      <MemoryRouter initialEntries={[entry]}>
        <LocationProbe />
        <Routes>
          <Route path="/work/features/:featureId" element={<FeatureDetailPage />} />
          <Route path="/work" element={<div>Task Hub</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('FeatureDetailPage', () => {
  beforeEach(() => {
    getTaskMock.mockReset();
    getFolderTreeMock.mockReset();
    getFolderTreeMock.mockResolvedValue([]);
  });

  it('memuat Feature di Workspace aktif dan menampilkannya sebagai halaman', async () => {
    getTaskMock.mockResolvedValue(feature);
    renderPage(`/work/features/${featureId}`);

    const page = await screen.findByTestId('feature-page');
    expect(getTaskMock).toHaveBeenCalledWith(workspaceId, featureId);
    expect(page).toHaveAttribute('data-layout', 'page');
    expect(screen.getByText('Sistem Manajemen Tugas')).toBeInTheDocument();
    // Sidebar butuh daftar folder walau halaman dibuka langsung dari URL.
    await waitFor(() => expect(getFolderTreeMock).toHaveBeenCalledWith(workspaceId));
  });

  it('membuka tahap dari ?tahap= dan menuliskan tahap saat tab berganti', async () => {
    getTaskMock.mockResolvedValue(feature);
    renderPage(`/work/features/${featureId}?tahap=prd`);

    expect(await screen.findByTestId('feature-page')).toHaveAttribute(
      'data-initial-tab',
      'prd-summary',
    );

    fireEvent.click(screen.getByRole('button', { name: 'ke Subtask' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        `/work/features/${featureId}?tahap=task`,
      ),
    );
  });

  it('mengabaikan tahap yang tidak dikenal', async () => {
    getTaskMock.mockResolvedValue(feature);
    renderPage(`/work/features/${featureId}?tahap=apply`);
    expect(await screen.findByTestId('feature-page')).toHaveAttribute('data-initial-tab', '');
  });

  it('kembali ke halaman asal yang dikirim lewat router state', async () => {
    getTaskMock.mockResolvedValue(feature);
    renderPage({
      pathname: `/work/features/${featureId}`,
      state: { returnTo: '/work?tab=tasks&folderId=abc' },
    });

    fireEvent.click(await screen.findByRole('button', { name: 'Task Hub' }));
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('/work?tab=tasks&folderId=abc'),
    );
  });

  it('menampilkan pesan 404 bila Feature tidak ada', async () => {
    getTaskMock.mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }));
    renderPage(`/work/features/${featureId}`);
    expect(await screen.findByText('Feature tidak ditemukan (404)')).toBeInTheDocument();
  });

  it('menampilkan akses dibatasi bila 403', async () => {
    getTaskMock.mockRejectedValue(Object.assign(new Error('forbidden'), { status: 403 }));
    renderPage(`/work/features/${featureId}`);
    expect(await screen.findByText('Akses Feature dibatasi')).toBeInTheDocument();
  });
});
