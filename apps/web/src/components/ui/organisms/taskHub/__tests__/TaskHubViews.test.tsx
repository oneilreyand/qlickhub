import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { TaskHubKanbanBoard } from '../TaskHubKanbanBoard';
import { TaskHubSchedule } from '../TaskHubSchedule';
import { taskService } from '../../../../../lib/api/taskService';

vi.mock('../../../../../lib/api/taskService', () => ({
  taskService: { listSubtasks: vi.fn() },
}));

const feature: Task = {
  id: '00000000-0000-4000-8000-000000000001',
  workspaceId: '00000000-0000-4000-8000-000000000010',
  folderId: '00000000-0000-4000-8000-000000000011',
  parentTaskId: null,
  deliveryArea: null,
  title: 'Sistem Manajemen Tugas',
  description: 'Feature utama',
  status: 'todo',
  priority: 'high',
  assigneeId: null,
  reporterId: '00000000-0000-4000-8000-000000000012',
  position: 0,
  startDate: '2026-09-30',
  dueDate: '2026-10-05',
  completedAt: null,
  createdAt: '2026-09-30T00:00:00.000Z',
  updatedAt: '2026-09-30T00:00:00.000Z',
  subtaskSummary: {
    total: 4,
    completed: 1,
    areas: {
      frontend: { total: 1, completed: 1 },
      backend: { total: 2, completed: 0 },
      mobile: { total: 0, completed: 0 },
      fullstack: { total: 0, completed: 0 },
      qa: { total: 1, completed: 0 },
    },
  },
};

const subtask = (id: string, title: string, status: Task['status']): Task => ({
  ...feature,
  id,
  title,
  parentTaskId: feature.id,
  deliveryArea: 'frontend',
  status,
  subtaskSummary: undefined,
});

const listSubtasksMock = vi.mocked(taskService.listSubtasks);

describe('Task Hub visual views', () => {
  beforeEach(() => {
    listSubtasksMock.mockReset();
  });

  it('loads only the selected Feature subtasks and groups canonical status cards', async () => {
    const todoSubtask = subtask('00000000-0000-4000-8000-000000000021', 'Bangun endpoint', 'todo');
    const reviewSubtask = subtask(
      '00000000-0000-4000-8000-000000000022',
      'Uji regresi',
      'in_review',
    );
    listSubtasksMock.mockResolvedValue({
      tasks: [todoSubtask, reviewSubtask],
      total: 2,
      page: 1,
      limit: 24,
    });
    const onSelect = vi.fn();

    render(
      <TaskHubKanbanBoard
        workspaceId={feature.workspaceId}
        features={[feature]}
        selectedFeatureId={feature.id}
        isLoadingFeatures={false}
        onSelectFeature={vi.fn()}
        onSelect={onSelect}
      />,
    );

    expect(await screen.findByText('Bangun endpoint')).toBeInTheDocument();
    expect(screen.getByText('Uji regresi')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Sistem Manajemen Tugas/i }),
    ).not.toBeInTheDocument();
    expect(listSubtasksMock).toHaveBeenCalledWith(feature.workspaceId, feature.id, 1, 24);

    fireEvent.click(screen.getByRole('button', { name: /Bangun endpoint/i }));
    expect(onSelect).toHaveBeenCalledWith(todoSubtask);
  });

  it('keeps Feature selection as an explicit URL-owned scope', () => {
    const onSelectFeature = vi.fn();
    render(
      <TaskHubKanbanBoard
        workspaceId={feature.workspaceId}
        features={[feature]}
        selectedFeatureId={null}
        isLoadingFeatures={false}
        onSelectFeature={onSelectFeature}
        onSelect={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText('Pilih Feature untuk Kanban'), {
      target: { value: feature.id },
    });
    expect(onSelectFeature).toHaveBeenCalledWith(feature.id);
    expect(screen.getByText('Pilih Feature terlebih dahulu')).toBeInTheDocument();
  });

  it('paginates subtasks without changing their status', async () => {
    listSubtasksMock
      .mockResolvedValueOnce({
        tasks: [subtask('00000000-0000-4000-8000-000000000031', 'Subtask halaman satu', 'todo')],
        total: 25,
        page: 1,
        limit: 24,
      })
      .mockResolvedValueOnce({
        tasks: [subtask('00000000-0000-4000-8000-000000000032', 'Subtask halaman dua', 'done')],
        total: 25,
        page: 2,
        limit: 24,
      });

    render(
      <TaskHubKanbanBoard
        workspaceId={feature.workspaceId}
        features={[feature]}
        selectedFeatureId={feature.id}
        isLoadingFeatures={false}
        onSelectFeature={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(await screen.findByText('Subtask halaman satu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Berikutnya' }));
    expect(await screen.findByText('Subtask halaman dua')).toBeInTheDocument();
    expect(listSubtasksMock).toHaveBeenLastCalledWith(feature.workspaceId, feature.id, 2, 24);
  });

  it('renders loading and empty states for the selected Feature scope', async () => {
    let resolveRequest!: (value: {
      tasks: Task[];
      total: number;
      page: number;
      limit: number;
    }) => void;
    listSubtasksMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    render(
      <TaskHubKanbanBoard
        workspaceId={feature.workspaceId}
        features={[feature]}
        selectedFeatureId={feature.id}
        isLoadingFeatures={false}
        onSelectFeature={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.getByLabelText('Memuat subtask Kanban')).toBeInTheDocument();
    resolveRequest({ tasks: [], total: 0, page: 1, limit: 24 });
    expect(await screen.findByText('Belum ada subtask')).toBeInTheDocument();
  });

  it('renders a retryable error without presenting fallback data', async () => {
    listSubtasksMock.mockRejectedValue(new Error('Network unavailable'));

    render(
      <TaskHubKanbanBoard
        workspaceId={feature.workspaceId}
        features={[feature]}
        selectedFeatureId={feature.id}
        isLoadingFeatures={false}
        onSelectFeature={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(await screen.findByText('Kanban tidak dapat dimuat')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
  });

  it('renders an access-restricted state from the existing API authorization result', async () => {
    const forbidden = Object.assign(new Error('Forbidden'), { status: 403 });
    listSubtasksMock.mockRejectedValue(forbidden);

    render(
      <TaskHubKanbanBoard
        workspaceId={feature.workspaceId}
        features={[feature]}
        selectedFeatureId={feature.id}
        isLoadingFeatures={false}
        onSelectFeature={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    await waitFor(() =>
      expect(
        screen.getByRole('heading', { name: 'Subtask Feature tidak dapat dibuka' }),
      ).toBeInTheDocument(),
    );
  });

  it('uses a light surface with an explicit dark counterpart', () => {
    render(<TaskHubSchedule tasks={[feature]} isLoading={false} onSelect={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'Jadwal Feature' })).toHaveClass(
      'bg-white',
      'dark:bg-[#151a20]',
    );
  });
});
