import type {
  CreateTaskBlockerInput,
  ResolveTaskBlockerInput,
  TaskBlocker,
  WorkspaceRole,
} from '@qlick/contracts';
import { TASK_BLOCKER_CATEGORY_LABEL } from '@qlick/contracts';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskBlockerModel,
  TaskModel,
  UserModel,
  WorkspaceMemberModel,
} from '../../../db/models/index.js';
import { isPlanner } from '../../../policies/taskPolicy.js';
import { reliableNotificationOutboxService } from '../../notifications/reliableNotificationOutboxService.js';
import { logActivity } from './taskLifecycle.js';

/**
 * WORK-FOUNDATION P5 (ADR-045): open and resolve blockers on a task. Read access is enforced by
 * the route (`requireTaskReadAccess`, AUTH-013); this module enforces who may resolve.
 */

const format = (row: TaskBlockerModel): TaskBlocker => ({
  id: row.id,
  workspaceId: row.workspaceId,
  taskId: row.taskId,
  category: row.category,
  description: row.description,
  picUserId: row.picUserId,
  openedBy: row.openedBy,
  openedAt: row.openedAt.toISOString(),
  resolvedBy: row.resolvedBy,
  resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
  resolutionNote: row.resolutionNote,
});

const actionPrefix = (task: TaskModel) => (task.parentTaskId ? 'subtask.' : 'task.');

async function requireTask(workspaceId: string, taskId: string) {
  const task = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
  if (!task) throw new Error('NOT_FOUND: Task not found in this workspace.');
  return task;
}

export async function listTaskBlockers(workspaceId: string, taskId: string) {
  await requireTask(workspaceId, taskId);
  const rows = await TaskBlockerModel.findAll({
    where: { workspaceId, taskId },
    order: [
      ['resolvedAt', 'DESC NULLS FIRST'],
      ['openedAt', 'DESC'],
    ],
  });
  return rows.map(format);
}

export async function openTaskBlocker(
  workspaceId: string,
  taskId: string,
  actorId: string,
  input: CreateTaskBlockerInput,
): Promise<TaskBlocker> {
  const task = await requireTask(workspaceId, taskId);
  const result = await sequelize.transaction(async (transaction) => {
    const pic = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: input.picUserId },
      transaction,
    });
    if (!pic) {
      throw new Error('BAD_REQUEST: PIC harus anggota aktif Workspace ini.');
    }
    const blocker = await TaskBlockerModel.create(
      {
        workspaceId,
        taskId,
        category: input.category,
        description: input.description,
        picUserId: input.picUserId,
        openedBy: actorId,
      },
      { transaction },
    );
    await logActivity(
      workspaceId,
      taskId,
      actorId,
      `${actionPrefix(task)}blocker_opened`,
      { blockerId: blocker.id, category: input.category, picUserId: input.picUserId },
      transaction,
    );
    let outboxIds: string[] = [];
    if (input.picUserId !== actorId) {
      const actor = await UserModel.findByPk(actorId, { transaction });
      outboxIds = await reliableNotificationOutboxService.enqueue(
        `task-blocker-opened:${blocker.id}`,
        [
          {
            userId: input.picUserId,
            workspaceId,
            taskId,
            actorId,
            type: 'blocker',
            title: 'Anda menjadi PIC hambatan',
            message: `${actor?.name || 'Anggota Workspace'} mencatat hambatan "${TASK_BLOCKER_CATEGORY_LABEL[input.category]}" pada "${task.title}".`,
            payload: { blockerId: blocker.id },
          },
        ],
        transaction,
      );
    }
    return { blocker, outboxIds };
  });
  if (result.outboxIds.length) void reliableNotificationOutboxService.dispatch(result.outboxIds);
  return format(result.blocker);
}

export async function resolveTaskBlocker(
  workspaceId: string,
  taskId: string,
  blockerId: string,
  actorId: string,
  actorRole: WorkspaceRole,
  input: ResolveTaskBlockerInput,
): Promise<TaskBlocker> {
  const task = await requireTask(workspaceId, taskId);
  return sequelize.transaction(async (transaction) => {
    const blocker = await TaskBlockerModel.findOne({
      where: { id: blockerId, workspaceId, taskId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!blocker) throw new Error('NOT_FOUND: Hambatan tidak ditemukan.');
    if (blocker.resolvedAt) throw new Error('CONFLICT: Hambatan ini sudah ditutup.');
    const allowed =
      isPlanner(actorRole) || blocker.openedBy === actorId || blocker.picUserId === actorId;
    if (!allowed) {
      throw new Error(
        'FORBIDDEN: Hanya pembuka hambatan, PIC, atau Owner/Admin/PO yang dapat menutupnya.',
      );
    }
    blocker.resolvedAt = new Date();
    blocker.resolvedBy = actorId;
    blocker.resolutionNote = input.resolutionNote?.trim() || null;
    await blocker.save({ transaction });
    await logActivity(
      workspaceId,
      taskId,
      actorId,
      `${actionPrefix(task)}blocker_resolved`,
      { blockerId, category: blocker.category },
      transaction,
    );
    return format(blocker);
  });
}
