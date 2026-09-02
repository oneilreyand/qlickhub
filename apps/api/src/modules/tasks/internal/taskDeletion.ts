/**
 * Task Deletion Implementation
 *
 * Internal module: deletion guards and soft-delete for the Task domain.
 * Called exclusively by the TaskService façade — do not import directly
 * from outside the tasks module.
 *
 * Covered concepts:
 * - Planner-only authorization check
 * - Release-critical protection (requirement links, document links,
 *   attachments, bugs, active QA sign-offs, active release decisions)
 * - Cascading soft-delete for subtasks with retained audit history
 * - Audit activity creation via logActivity (re-used from taskLifecycle)
 */

import { Op } from 'sequelize';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  WorkspaceMemberModel,
  TaskRequirementModel,
  TaskDocumentModel,
  TaskAttachmentModel,
  BugModel,
  QaSignOffModel,
  QaSignOffCancellationModel,
  ReleaseDecisionModel,
  ReleaseDecisionCancellationModel,
} from '../../../db/models/index.js';
import { logActivity } from './taskLifecycle.js';

export async function deleteTaskImpl(
  workspaceId: string,
  taskId: string,
  actorId: string,
): Promise<void> {
  await sequelize.transaction(async (transaction) => {
    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: actorId },
      transaction,
    });

    if (!membership || !['owner', 'admin', 'po'].includes(membership.role)) {
      throw new Error('FORBIDDEN: Only planners can delete tasks.');
    }

    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const subtasks = await TaskModel.findAll({
      where: { parentTaskId: taskId, workspaceId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    const targetTaskIds = [task.id, ...subtasks.map((subtask) => subtask.id)];

    // A managed transaction uses one PostgreSQL connection, so these checks stay
    // sequential instead of issuing overlapping client.query calls.
    const requirementLinks = await TaskRequirementModel.count({
      where: { workspaceId, taskId: { [Op.in]: targetTaskIds } },
      transaction,
    });
    const documentLinks = await TaskDocumentModel.count({
      where: { workspaceId, taskId: { [Op.in]: targetTaskIds } },
      transaction,
    });
    const attachments = await TaskAttachmentModel.count({
      where: { workspaceId, taskId: { [Op.in]: targetTaskIds } },
      transaction,
    });
    const bugs = await BugModel.count({
      where: { workspaceId, featureTaskId: { [Op.in]: targetTaskIds } },
      transaction,
    });
    const qaSignOffs = await QaSignOffModel.count({
      where: {
        workspaceId,
        featureTaskId: { [Op.in]: targetTaskIds },
        '$cancellation.id$': null,
      },
      include: [{ model: QaSignOffCancellationModel, as: 'cancellation', required: false }],
      transaction,
    });
    const releaseDecisions = await ReleaseDecisionModel.count({
      where: {
        workspaceId,
        featureTaskId: { [Op.in]: targetTaskIds },
        '$cancellation.id$': null,
      },
      include: [{ model: ReleaseDecisionCancellationModel, as: 'cancellation', required: false }],
      transaction,
    });

    if (
      requirementLinks > 0 ||
      documentLinks > 0 ||
      attachments > 0 ||
      bugs > 0 ||
      qaSignOffs > 0 ||
      releaseDecisions > 0
    ) {
      throw new Error(
        `CONFLICT: Unlink or remove permitted Task records before deletion. Immutable delivery history cannot be deleted (${requirementLinks} Requirement link(s), ${documentLinks} document link(s), ${attachments} attachment(s), ${bugs} Bug(s), ${qaSignOffs} active QA Sign-off(s), ${releaseDecisions} active Release Decision(s)).`,
      );
    }

    for (const st of subtasks) {
      await st.destroy({ transaction }); // Note: Using paranoid destroy by default in sequelize if configured
      await logActivity(
        workspaceId,
        st.id,
        actorId,
        'deleted',
        {
          recordType: 'subtask',
          title: st.title,
          parentTaskId: task.id,
          deliveryArea: st.deliveryArea,
        },
        transaction,
      );
    }

    await task.destroy({ transaction });
    await logActivity(
      workspaceId,
      taskId,
      actorId,
      'deleted',
      {
        recordType: task.parentTaskId ? 'subtask' : 'task',
        title: task.title,
        parentTaskId: task.parentTaskId,
        deliveryArea: task.deliveryArea,
      },
      transaction,
    );
  });
}
