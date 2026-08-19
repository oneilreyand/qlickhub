import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '@qlick/contracts';
import { TaskReportDashboard } from '../TaskReportDashboard';

const taskDefaults = {
  id: '11111111-1111-4111-8111-111111111111',
  workspaceId: '22222222-2222-4222-8222-222222222222',
  title: 'Verify account recovery',
  status: 'todo',
  priority: 'medium',
  reporterId: '33333333-3333-4333-8333-333333333333',
  position: 0,
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
} satisfies Task;

function createTask(overrides: Partial<Task> = {}): Task {
  return { ...taskDefaults, ...overrides };
}

function renderDashboard(tasks: Task[], onOpenWorkHub = vi.fn()) {
  render(
    <TaskReportDashboard
      workspaceName="Release QA"
      tasks={tasks}
      total={tasks.length}
      isLoading={false}
      error={null}
      onDateRangeChange={vi.fn()}
      onRefresh={vi.fn()}
      onOpenWorkHub={onOpenWorkHub}
    />
  );
  return onOpenWorkHub;
}

describe('TaskReportDashboard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 7, 14, 12));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('derives delivery metrics and the attention queue from persisted tasks', () => {
    renderDashboard([
      createTask({ id: '11111111-1111-4111-8111-111111111112', status: 'done', priority: 'low' }),
      createTask({ id: '11111111-1111-4111-8111-111111111113', status: 'in_review', priority: 'high', dueDate: '2026-08-13', title: 'Run smoke test' }),
      createTask({ id: '11111111-1111-4111-8111-111111111114', status: 'in_progress', priority: 'urgent', dueDate: '2026-08-14', title: 'Fix payment regression' }),
      createTask({ id: '11111111-1111-4111-8111-111111111115', status: 'todo', priority: 'medium' }),
    ]);

    expect(screen.getByRole('heading', { name: 'QA delivery report' })).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Run smoke test')).toBeInTheDocument();
    expect(screen.getByText('Fix payment regression')).toBeInTheDocument();
    expect(screen.getByText('Overdue · 2026-08-13')).toBeInTheDocument();
    expect(screen.getByText('Due today · 2026-08-14')).toBeInTheDocument();
  });

  it('shows an empty report and sends the user to Work Hub to create tasks', () => {
    const onOpenWorkHub = renderDashboard([]);

    expect(screen.getByText('No tasks in this report')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Work Hub' }));

    expect(onOpenWorkHub).toHaveBeenCalledOnce();
  });
});
