/**
 * Task assignment operations (P5g-2, ADR-038).
 *
 * Internal module: claim, release, and reassign for subtasks. Called only by the
 * TaskService façade. Every operation locks the Task row, compares the caller's
 * expectedUpdatedAt with the persisted version, preserves execution status, and
 * writes one Activity row inside the same transaction. A concurrent or stale
 * write returns CONFLICT without a second write.
 */

import type { Transaction } from 'sequelize';
import type {
  ReassignTaskInput,
  Task,
  TaskAssignmentMutation,
  WorkspaceRole,
} from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import { TaskModel } from '../../../db/models/index.js';
import { listMemberSpecialties } from '../../../db/repositories/workspaceMemberRepository.js';
import { claimableDeliveryAreas, isPlanner } from '../../../policies/taskPolicy.js';
import {
  assertAssigneeBelongsToWorkspace,
  assertRoleMatchesDeliveryArea,
  getActorMembership,
  logActivity,
  persistTaskAssignmentNotification,
} from './taskLifecycle.js';
import { formatTask } from './taskQuery.js';

type AssignmentChannel = 'claim' | 'release' | 'reassign';

const CLOSED_STATUSES = new Set(['done', 'canceled']);

async function lockSubtask(
  workspaceId: string,
  taskId: string,
  transaction: Transaction,
): Promise<TaskModel> {
  const task = await TaskModel.findOne({
    where: { id: taskId, workspaceId },
    lock: transaction.LOCK.UPDATE,
    transaction,
  });
  if (!task) throw new Error('NOT_FOUND: Task not found in this workspace.');
  if (!task.parentTaskId) {
    throw new Error('BAD_REQUEST: Only subtasks can be claimed, released, or reassigned.');
  }
  return task;
}

function assertNotClosed(task: TaskModel): void {
  if (CLOSED_STATUSES.has(task.status)) {
    throw new Error('CONFLICT: Completed or canceled subtasks cannot change assignment.');
  }
}

function assertExpectedVersion(task: TaskModel, input: TaskAssignmentMutation): void {
  if (new Date(task.updatedAt).toISOString() !== new Date(input.expectedUpdatedAt).toISOString()) {
    throw new Error('CONFLICT: This subtask changed since it was loaded. Reload and try again.');
  }
}

function assertPlannerRole(role: WorkspaceRole): void {
  if (!isPlanner(role)) {
    throw new Error(
      'FORBIDDEN: Only Product Owner, Admin, or Owner can release or reassign subtasks.',
    );
  }
}

const ACTIVITY_ACTION: Record<AssignmentChannel, string> = {
  claim: 'task.claimed',
  release: 'task.released',
  reassign: 'task.reassigned',
};

async function recordAssignment(
  task: TaskModel,
  actorId: string,
  channel: AssignmentChannel,
  fromAssigneeId: string | null,
  transaction: Transaction,
): Promise<void> {
  await logActivity(
    task.workspaceId,
    task.id,
    actorId,
    ACTIVITY_ACTION[channel],
    {
      channel,
      fromAssigneeId,
      toAssigneeId: task.assigneeId,
      assignmentMode: task.assignmentMode,
      status: task.status,
      deliveryArea: task.deliveryArea,
      parentTaskId: task.parentTaskId,
    },
    transaction,
  );
}

/** Developer/QA takes a matching open subtask. Status is preserved; second claimer gets 409. */
export async function claimTaskImpl(
  actorId: string,
  workspaceId: string,
  taskId: string,
  input: TaskAssignmentMutation,
): Promise<Task> {
  return sequelize.transaction(async (transaction) => {
    const membership = await getActorMembership(workspaceId, actorId, transaction);
    if (membership.role !== 'dev' && membership.role !== 'qa') {
      throw new Error(
        'FORBIDDEN: Only Developer or QA members claim open subtasks; planners assign them.',
      );
    }
    const task = await lockSubtask(workspaceId, taskId, transaction);
    const areas = claimableDeliveryAreas(
      membership.role,
      await listMemberSpecialties(membership, transaction),
    );
    if (!task.deliveryArea || !areas.includes(task.deliveryArea)) {
      throw new Error(
        membership.role === 'dev' && areas.length === 0
          ? 'FORBIDDEN: Set your Developer specialty before claiming open subtasks.'
          : 'FORBIDDEN: This subtask does not match your role or specialty.',
      );
    }
    assertNotClosed(task);
    if (task.assignmentMode !== 'open' || task.assigneeId) {
      throw new Error('CONFLICT: This subtask has already been claimed or is no longer open.');
    }
    assertExpectedVersion(task, input);

    task.assigneeId = actorId;
    task.assignmentMode = 'assigned';
    await task.save({ transaction });
    await recordAssignment(task, actorId, 'claim', null, transaction);
    return formatTask(task);
  });
}

/** Planner returns an assigned subtask to the open queue without changing its status. */
export async function releaseTaskImpl(
  actorId: string,
  workspaceId: string,
  taskId: string,
  input: TaskAssignmentMutation,
): Promise<Task> {
  return sequelize.transaction(async (transaction) => {
    const membership = await getActorMembership(workspaceId, actorId, transaction);
    assertPlannerRole(membership.role);
    const task = await lockSubtask(workspaceId, taskId, transaction);
    assertNotClosed(task);
    if (task.assignmentMode === 'open') {
      throw new Error('CONFLICT: This subtask is already open for claiming.');
    }
    if (!task.deliveryArea) {
      throw new Error('BAD_REQUEST: A subtask needs a delivery area before it can be released.');
    }
    assertExpectedVersion(task, input);

    const fromAssigneeId = task.assigneeId;
    task.assigneeId = null;
    task.assignmentMode = 'open';
    await task.save({ transaction });
    await recordAssignment(task, actorId, 'release', fromAssigneeId, transaction);
    return formatTask(task);
  });
}

/** Planner assigns an open or assigned subtask to a matching member (no implicit override). */
export async function reassignTaskImpl(
  actorId: string,
  workspaceId: string,
  taskId: string,
  input: ReassignTaskInput,
): Promise<Task> {
  const result = await sequelize.transaction(async (transaction) => {
    const membership = await getActorMembership(workspaceId, actorId, transaction);
    assertPlannerRole(membership.role);
    const task = await lockSubtask(workspaceId, taskId, transaction);
    assertNotClosed(task);
    if (task.assigneeId === input.assigneeId) {
      throw new Error('CONFLICT: This subtask is already assigned to that member.');
    }
    assertExpectedVersion(task, input);
    await assertAssigneeBelongsToWorkspace(workspaceId, input.assigneeId, transaction);
    await assertRoleMatchesDeliveryArea(
      workspaceId,
      input.assigneeId,
      task.deliveryArea,
      false,
      undefined,
      membership.role,
      transaction,
    );

    const fromAssigneeId = task.assigneeId;
    task.assigneeId = input.assigneeId;
    task.assignmentMode = 'assigned';
    await task.save({ transaction });
    await recordAssignment(task, actorId, 'reassign', fromAssigneeId, transaction);
    return { formatted: formatTask(task), title: task.title };
  });

  if (input.assigneeId !== actorId) {
    await persistTaskAssignmentNotification({
      assigneeId: input.assigneeId,
      actorId,
      taskTitle: result.title,
      taskId,
      workspaceId,
    });
  }
  return result.formatted;
}
