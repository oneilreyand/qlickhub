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
      workspaceName="Release Delivery"
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

  it('derives delivery metrics, cross-functional delivery areas, and attention queue from persisted tasks', () => {
    renderDashboard([
      createTask({
        id: '11111111-1111-4111-8111-111111111112',
        status: 'done',
        priority: 'low',
        subtasks: [
          createTask({
            id: 'sub-1',
            parentTaskId: '11111111-1111-4111-8111-111111111112',
            deliveryArea: 'frontend',
            status: 'done',
            title: 'Build Login UI',
          }),
        ],
      }),
      createTask({
        id: '11111111-1111-4111-8111-111111111113',
        status: 'in_review',
        priority: 'high',
        dueDate: '2026-08-13',
        title: 'Run smoke test',
        subtasks: [
          createTask({
            id: 'sub-2',
            parentTaskId: '11111111-1111-4111-8111-111111111113',
            deliveryArea: 'qa',
            status: 'in_review',
            title: 'QA smoke testing',
          }),
        ],
      }),
      createTask({
        id: '11111111-1111-4111-8111-111111111114',
        status: 'in_progress',
        priority: 'urgent',
        dueDate: '2026-08-14',
        title: 'Fix payment regression',
        subtasks: [
          createTask({
            id: 'sub-3',
            parentTaskId: '11111111-1111-4111-8111-111111111114',
            deliveryArea: 'backend',
            status: 'in_progress',
            title: 'Patch payment gateway webhook',
          }),
        ],
      }),
      createTask({ id: '11111111-1111-4111-8111-111111111115', status: 'todo', priority: 'medium' }),
    ]);

    expect(screen.getByRole('heading', { name: 'Delivery & SDLC Report' })).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();
    expect(screen.getByText('Run smoke test')).toBeInTheDocument();
    expect(screen.getByText('Fix payment regression')).toBeInTheDocument();
    expect(screen.getByText('Overdue · 2026-08-13')).toBeInTheDocument();
    expect(screen.getByText('Due today · 2026-08-14')).toBeInTheDocument();

    // Cross-functional delivery area breakdown is displayed
    expect(screen.getByText('Cross-Functional Delivery Areas')).toBeInTheDocument();
    expect(screen.getByText('Frontend', { selector: 'span' })).toBeInTheDocument();
    expect(screen.getByText('Backend', { selector: 'span' })).toBeInTheDocument();
  });

  it('allows switching between SDLC Overview, Roles & Workstreams, and Bottlenecks tabs', () => {
    renderDashboard([
      createTask({
        id: '11111111-1111-4111-8111-111111111112',
        status: 'done',
        title: 'User Profile Feature',
        subtasks: [
          createTask({
            id: 'sub-fe-1',
            deliveryArea: 'frontend',
            status: 'done',
            title: 'Profile Form Component',
          }),
        ],
      }),
    ]);

    // Switch to Roles & Workstreams tab
    fireEvent.click(screen.getByRole('button', { name: /Roles & Workstreams/i }));
    expect(screen.getByText('Team Workload & Allocation')).toBeInTheDocument();

    // Switch to Bottlenecks tab
    fireEvent.click(screen.getByRole('button', { name: /Bottlenecks & Schedule Health/i }));
    expect(screen.getByText('End-to-End SDLC Handoff Pipeline')).toBeInTheDocument();
    expect(screen.getByText('Schedule Slippage & Risk Diagnosis')).toBeInTheDocument();
  });

  it('shows an empty report and sends the user to Work Hub to create tasks', () => {
    const onOpenWorkHub = renderDashboard([]);

    expect(screen.getByText('No tasks in this report')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Open Work Hub' }));

    expect(onOpenWorkHub).toHaveBeenCalledOnce();
  });
});
