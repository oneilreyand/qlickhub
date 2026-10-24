import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { TaskHubKanbanBoard } from '../TaskHubKanbanBoard';
import { TaskHubSchedule } from '../TaskHubSchedule';

const feature: Task = {
  id: 'task-1',
  workspaceId: 'workspace-1',
  folderId: 'folder-1',
  parentTaskId: null,
  deliveryArea: null,
  title: 'Sistem Manajemen Tugas',
  description: 'Feature utama',
  status: 'todo',
  priority: 'high',
  assigneeId: null,
  reporterId: 'user-1',
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

describe('Task Hub visual views', () => {
  it('opens a persisted Feature from the read-only Kanban', () => {
    const onSelect = vi.fn();
    render(<TaskHubKanbanBoard tasks={[feature]} isLoading={false} onSelect={onSelect} />);

    expect(screen.getByRole('region', { name: 'Kanban Feature' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Sistem Manajemen Tugas/i }));
    expect(onSelect).toHaveBeenCalledWith(feature);
  });

  it('renders schedule progress from persisted subtask summary', () => {
    render(<TaskHubSchedule tasks={[feature]} isLoading={false} onSelect={vi.fn()} />);

    expect(
      screen.getByRole('progressbar', { name: /Kemajuan Sistem Manajemen Tugas/i }),
    ).toHaveAttribute('aria-valuenow', '25');
    expect(screen.getByText('4 subtask · 1 selesai')).toBeInTheDocument();
  });

  it('uses a light surface with an explicit dark counterpart', () => {
    render(<TaskHubSchedule tasks={[feature]} isLoading={false} onSelect={vi.fn()} />);

    expect(screen.getByRole('region', { name: 'Jadwal Feature' })).toHaveClass(
      'bg-white',
      'dark:bg-[#151a20]',
    );
  });
});
