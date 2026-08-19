import { describe, expect, it } from 'vitest';
import type { Task } from '@qlick/contracts';
import {
  calculateSubtaskScheduleHealth,
  calculateTaskOverallScheduleHealth,
  calculateRoleOverlapAndBottlenecks,
  diffDays,
} from '../scheduleHealth';

const fakeToday = new Date('2026-08-19T00:00:00Z');

describe('scheduleHealth Engine', () => {
  it('correctly calculates diffDays', () => {
    expect(diffDays('2026-08-25', '2026-08-20')).toBe(5);
    expect(diffDays('2026-08-15', '2026-08-19')).toBe(-4);
    expect(diffDays('2026-08-19', '2026-08-19')).toBe(0);
  });

  it('evaluates completed subtasks as completed', () => {
    const subtask: Task = {
      id: 'st-1',
      workspaceId: 'ws-1',
      parentTaskId: 'p-1',
      title: 'Completed Task',
      status: 'done',
      priority: 'medium',
      reporterId: 'u-1',
      deliveryArea: 'backend',
      startDate: '2026-08-10',
      dueDate: '2026-08-15',
      completedAt: '2026-08-15T00:00:00Z',
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-15T00:00:00Z',
    };

    const health = calculateSubtaskScheduleHealth(subtask, fakeToday);
    expect(health.status).toBe('completed');
    expect(health.isCompleted).toBe(true);
    expect(health.isOverdue).toBe(false);
  });

  it('evaluates past due subtasks as delayed', () => {
    const subtask: Task = {
      id: 'st-2',
      workspaceId: 'ws-1',
      parentTaskId: 'p-1',
      title: 'Delayed BE Task',
      status: 'in_progress',
      priority: 'urgent',
      reporterId: 'u-1',
      deliveryArea: 'backend',
      startDate: '2026-08-10',
      dueDate: '2026-08-16',
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    };

    const health = calculateSubtaskScheduleHealth(subtask, fakeToday);
    expect(health.status).toBe('delayed');
    expect(health.isOverdue).toBe(true);
    expect(health.daysOverdue).toBe(3); // 2026-08-16 to 2026-08-19 is 3 days overdue
  });

  it('evaluates subtasks due within 2 days or changes requested as at_risk', () => {
    const subtaskDueSoon: Task = {
      id: 'st-3',
      workspaceId: 'ws-1',
      parentTaskId: 'p-1',
      title: 'Due Tomorrow Task',
      status: 'in_progress',
      priority: 'high',
      reporterId: 'u-1',
      deliveryArea: 'frontend',
      startDate: '2026-08-15',
      dueDate: '2026-08-20',
      createdAt: '2026-08-15T00:00:00Z',
      updatedAt: '2026-08-15T00:00:00Z',
    };

    const health1 = calculateSubtaskScheduleHealth(subtaskDueSoon, fakeToday);
    expect(health1.status).toBe('at_risk');
    expect(health1.daysRemaining).toBe(1);

    const subtaskChangesReq: Task = {
      id: 'st-4',
      workspaceId: 'ws-1',
      parentTaskId: 'p-1',
      title: 'Needs Revisions',
      status: 'changes_requested',
      priority: 'high',
      reporterId: 'u-1',
      deliveryArea: 'frontend',
      startDate: '2026-08-15',
      dueDate: '2026-08-28',
      createdAt: '2026-08-15T00:00:00Z',
      updatedAt: '2026-08-15T00:00:00Z',
    };

    const health2 = calculateSubtaskScheduleHealth(subtaskChangesReq, fakeToday);
    expect(health2.status).toBe('at_risk');
    expect(health2.label).toBe('Changes Requested');
  });

  it('calculates overall task schedule health from subtasks aggregate', () => {
    const parent: Task = {
      id: 'p-1',
      workspaceId: 'ws-1',
      title: 'Parent Task',
      status: 'in_progress',
      priority: 'high',
      reporterId: 'u-1',
      startDate: '2026-08-10',
      dueDate: '2026-08-30',
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    };

    const delayedSubtask: Task = {
      id: 'st-delayed',
      workspaceId: 'ws-1',
      parentTaskId: 'p-1',
      title: 'Delayed Subtask',
      status: 'in_progress',
      priority: 'urgent',
      reporterId: 'u-1',
      dueDate: '2026-08-15',
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    };

    const overallHealth = calculateTaskOverallScheduleHealth(parent, [delayedSubtask], fakeToday);
    expect(overallHealth.status).toBe('delayed');
    expect(overallHealth.delayedCount).toBe(1);
    expect(overallHealth.label).toBe('1 Subtask Delayed');
  });

  it('diagnoses Dev Backend as primary bottleneck when BE is delayed and overlaps FE', () => {
    const parentTask: Task = {
      id: 'parent-1',
      workspaceId: 'ws-1',
      title: 'Payment Integration Feature',
      status: 'in_progress',
      priority: 'high',
      reporterId: 'u-po',
      startDate: '2026-08-10',
      dueDate: '2026-08-30',
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    };

    const beSubtask: Task = {
      id: 'sub-be',
      workspaceId: 'ws-1',
      parentTaskId: 'parent-1',
      deliveryArea: 'backend',
      title: 'Payment Webhook API',
      status: 'in_progress',
      priority: 'high',
      reporterId: 'u-po',
      assigneeId: 'u-be',
      startDate: '2026-08-10',
      dueDate: '2026-08-15', // Overdue (3 days late on Aug 19)
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    };

    const feSubtask: Task = {
      id: 'sub-fe',
      workspaceId: 'ws-1',
      parentTaskId: 'parent-1',
      deliveryArea: 'frontend',
      title: 'Checkout UI Component',
      status: 'todo',
      priority: 'medium',
      reporterId: 'u-po',
      assigneeId: 'u-fe',
      startDate: '2026-08-16',
      dueDate: '2026-08-25',
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    };

    const qaSubtask: Task = {
      id: 'sub-qa',
      workspaceId: 'ws-1',
      parentTaskId: 'parent-1',
      deliveryArea: 'qa',
      title: 'Payment End-to-End Test',
      status: 'todo',
      priority: 'medium',
      reporterId: 'u-po',
      assigneeId: 'u-qa',
      startDate: '2026-08-26',
      dueDate: '2026-08-30',
      createdAt: '2026-08-10T00:00:00Z',
      updatedAt: '2026-08-10T00:00:00Z',
    };

    const analysis = calculateRoleOverlapAndBottlenecks(
      parentTask,
      [beSubtask, feSubtask, qaSubtask],
      null,
      [
        { userId: 'u-be', role: 'dev', user: { name: 'Backend Dev' } },
        { userId: 'u-fe', role: 'dev', user: { name: 'Frontend Dev' } },
        { userId: 'u-qa', role: 'qa', user: { name: 'QA Engineer' } },
      ],
      fakeToday
    );

    expect(analysis.overallHealth).toBe('delayed');
    expect(analysis.primaryBottleneck.role).toBe('backend');
    expect(analysis.primaryBottleneck.severity).toBe('delayed');
    expect(analysis.primaryBottleneck.title).toContain('Dev Backend Bottleneck');
    expect(analysis.stages.backend.health).toBe('delayed');
    expect(analysis.stages.backend.daysOverdue).toBe(4);
  });

  it('correctly reports on-track schedule when all subtask dates are respected', () => {
    const parentTask: Task = {
      id: 'parent-2',
      workspaceId: 'ws-1',
      title: 'Notifications Feature',
      status: 'in_progress',
      priority: 'medium',
      reporterId: 'u-po',
      startDate: '2026-08-18',
      dueDate: '2026-08-30',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
    };

    const beDone: Task = {
      id: 'sub-be-2',
      workspaceId: 'ws-1',
      parentTaskId: 'parent-2',
      deliveryArea: 'backend',
      title: 'Notification Push API',
      status: 'done',
      priority: 'high',
      reporterId: 'u-po',
      startDate: '2026-08-18',
      dueDate: '2026-08-19',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-19T00:00:00Z',
    };

    const feInProgress: Task = {
      id: 'sub-fe-2',
      workspaceId: 'ws-1',
      parentTaskId: 'parent-2',
      deliveryArea: 'frontend',
      title: 'Notification Bell UI',
      status: 'in_progress',
      priority: 'medium',
      reporterId: 'u-po',
      startDate: '2026-08-20',
      dueDate: '2026-08-25',
      createdAt: '2026-08-18T00:00:00Z',
      updatedAt: '2026-08-18T00:00:00Z',
    };

    const analysis = calculateRoleOverlapAndBottlenecks(
      parentTask,
      [beDone, feInProgress],
      null,
      [],
      fakeToday
    );

    expect(analysis.overallHealth).toBe('on_track');
    expect(analysis.primaryBottleneck.role).toBe('none');
    expect(analysis.primaryBottleneck.title).toBe('Schedule On Track');
  });
});
