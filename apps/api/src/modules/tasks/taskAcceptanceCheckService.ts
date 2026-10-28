import {
  AcceptanceCriterionModel,
  SubtaskAcceptanceCheckModel,
  TaskModel,
  TaskRequirementModel,
  UserModel,
} from '../../db/models/index.js';
import { sequelize } from '../../db/sequelize.js';
import { requireActiveMember } from '../../db/repositories/workspaceMemberRepository.js';
import type { SubtaskAcceptanceCheck, SubtaskAcceptanceChecksResponse } from '@qlick/contracts';

/**
 * P2c (AC-2.11): cek mandiri Developer per Acceptance Criterion pada subtask.
 * Dibaca semua anggota Workspace (QA melihat ringkasannya); ditulis hanya oleh
 * penanggung jawab subtask, Owner, atau Admin.
 */
async function loadSubtask(workspaceId: string, taskId: string, transaction: any) {
  const task = await TaskModel.findOne({ where: { id: taskId, workspaceId }, transaction });
  if (!task) throw new Error('NOT_FOUND: Task not found in this workspace.');
  if (!task.parentTaskId) {
    throw new Error('BAD_REQUEST: Cek Acceptance Criterion hanya berlaku untuk subtask.');
  }
  return task;
}

async function formatChecks(
  workspaceId: string,
  taskId: string,
  transaction: any,
): Promise<SubtaskAcceptanceCheck[]> {
  const rows = await SubtaskAcceptanceCheckModel.findAll({
    where: { workspaceId, taskId },
    order: [['checkedAt', 'ASC']],
    transaction,
  });
  const userIds = [...new Set(rows.map((row) => row.checkedBy))];
  const users = userIds.length
    ? await UserModel.findAll({
        where: { id: userIds },
        attributes: ['id', 'name', 'email'],
        transaction,
      })
    : [];
  const names = new Map(users.map((user: any) => [user.id, user.name || user.email || 'Anggota']));
  return rows.map((row) => ({
    acceptanceCriterionId: row.acceptanceCriterionId,
    checkedBy: row.checkedBy,
    checkedByName: names.get(row.checkedBy) ?? 'Anggota',
    checkedAt: new Date(row.checkedAt).toISOString(),
  }));
}

export const taskAcceptanceCheckService = {
  async list(
    actorId: string,
    workspaceId: string,
    taskId: string,
  ): Promise<SubtaskAcceptanceChecksResponse> {
    return sequelize.transaction(async (transaction) => {
      await requireActiveMember(workspaceId, actorId, transaction);
      await loadSubtask(workspaceId, taskId, transaction);
      return { checks: await formatChecks(workspaceId, taskId, transaction) };
    });
  },

  async setChecked(
    actorId: string,
    workspaceId: string,
    taskId: string,
    criterionId: string,
    checked: boolean,
  ): Promise<SubtaskAcceptanceChecksResponse> {
    return sequelize.transaction(async (transaction) => {
      const membership = await requireActiveMember(workspaceId, actorId, transaction);
      const task = await loadSubtask(workspaceId, taskId, transaction);

      const isPrivileged = ['owner', 'admin'].includes(String((membership as any).role));
      if (task.assigneeId !== actorId && !isPrivileged) {
        throw new Error(
          'FORBIDDEN: Hanya penanggung jawab subtask yang dapat mencentang kriteria.',
        );
      }

      const criterion = await AcceptanceCriterionModel.findOne({
        where: { id: criterionId, workspaceId },
        transaction,
      });
      const linked = criterion
        ? await TaskRequirementModel.findOne({
            where: { workspaceId, taskId, requirementId: criterion.requirementId },
            transaction,
          })
        : null;
      if (!criterion || !linked) {
        throw new Error('NOT_FOUND: Acceptance Criterion tidak ditautkan ke subtask ini.');
      }

      if (checked) {
        await SubtaskAcceptanceCheckModel.findOrCreate({
          where: { taskId, acceptanceCriterionId: criterionId },
          defaults: {
            workspaceId,
            taskId,
            acceptanceCriterionId: criterionId,
            checkedBy: actorId,
          },
          transaction,
        });
      } else {
        await SubtaskAcceptanceCheckModel.destroy({
          where: { workspaceId, taskId, acceptanceCriterionId: criterionId },
          transaction,
        });
      }
      return { checks: await formatChecks(workspaceId, taskId, transaction) };
    });
  },
};
