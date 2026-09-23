import { describe, expect, it } from 'vitest';
import type { Task, TaskScheduleHealth } from '@qlick/contracts';
import {
  calculateRoleOverlapAndBottlenecks,
  calculateSubtaskScheduleHealth,
  diffDays,
} from '../scheduleHealth';

const delayedHealth: TaskScheduleHealth = {
  status: 'delayed',
  label: 'Terlambat 3 hari',
  daysRemaining: -3,
  daysOverdue: 3,
  isOverdue: true,
  isCompleted: false,
  reason: 'Tenggat 2026-08-16 (terlewat 3 hari)',
};

const onTrackHealth: TaskScheduleHealth = {
  status: 'on_track',
  label: 'Tersisa 6 hari',
  daysRemaining: 6,
  daysOverdue: 0,
  isOverdue: false,
  isCompleted: false,
};

function subtask(overrides: Partial<Task>): Task {
  return {
    id: 'st-1',
    workspaceId: 'ws-1',
    parentTaskId: 'p-1',
    title: 'Subtask',
    status: 'in_progress',
    priority: 'medium',
    reporterId: 'u-1',
    deliveryArea: 'frontend',
    startDate: '2026-08-10',
    dueDate: '2026-08-16',
    createdAt: '2026-08-10T00:00:00Z',
    updatedAt: '2026-08-10T00:00:00Z',
    ...overrides,
  };
}

describe('persisted schedule health presentation', () => {
  it('uses the backend-provided late state without consulting the browser clock', () => {
    const health = calculateSubtaskScheduleHealth(
      subtask({ scheduleHealth: delayedHealth }),
      new Date('2040-01-01T00:00:00Z'),
    );

    expect(health).toEqual(delayedHealth);
  });

  it('keeps role bottleneck analysis aligned with backend-provided Subtask health', () => {
    const parent: Task = {
      id: 'p-1',
      workspaceId: 'ws-1',
      title: 'Payment Feature',
      status: 'in_progress',
      priority: 'high',
      reporterId: 'u-po',
      startDate: '2026-08-10',
      dueDate: '2026-08-30',
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    };
    const backend = subtask({
      id: 'be-1',
      deliveryArea: 'backend',
      assigneeId: 'u-be',
      scheduleHealth: delayedHealth,
    });
    const frontend = subtask({
      id: 'fe-1',
      deliveryArea: 'frontend',
      assigneeId: 'u-fe',
      startDate: '2026-08-17',
      dueDate: '2026-08-25',
      scheduleHealth: onTrackHealth,
    });

    const analysis = calculateRoleOverlapAndBottlenecks(parent, [backend, frontend], null, [
      { userId: 'u-be', role: 'dev', user: { name: 'Backend Dev' } },
      { userId: 'u-fe', role: 'dev', user: { name: 'Frontend Dev' } },
    ]);

    expect(analysis.overallHealth).toBe('delayed');
    expect(analysis.primaryBottleneck.role).toBe('backend');
    expect(analysis.stages.backend.daysOverdue).toBe(3);
  });

  it('retains calendar-only day math for Gantt placement', () => {
    expect(diffDays('2026-08-25', '2026-08-20')).toBe(5);
  });
});
