/**
 * Task Lifecycle Implementation
 *
 * Internal module: mutation operations for the Task domain.
 * Called exclusively by the TaskService façade — do not import directly
 * from outside the tasks module.
 *
 * Covered concepts:
 * - Actor and assignee membership validation helpers
 * - Delivery-area vs role/specialty validation
 * - Folder propagation on task move
 * - Task and subtask creation (policy, folder, specialty, audit, FCM)
 * - Task update (field mutations, state machine, parent reopening, FCM)
 * - Task move (folder propagation)
 * - Task completion (delegates to update)
 * - Audit activity creation (also used by taskDeletion)
 */

import { Op, Transaction } from 'sequelize';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  TaskActivityModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  UserModel,
  TaskCreationPermissionModel,
} from '../../../db/models/index.js';
import {
  assertCanCreateTask,
  assertCanMutateTask,
  assertCanMoveTask,
  isPlanner,
} from '../../../policies/taskPolicy.js';
import { fcmService } from '../../../services/fcmService.js';
import {
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  CompleteTaskInput,
  Task,
  WorkspaceRole,
  DeveloperSpecialty,
} from '@qlick/contracts';
import { formatTask } from './taskQuery.js';

// ---------------------------------------------------------------------------
// Shared audit helper (also exported for taskDeletion)
// ---------------------------------------------------------------------------

export async function logActivity(
  workspaceId: string,
  taskId: string,
  actorId: string | null,
  action: string,
  metadataJson: Record<string, unknown> | null,
  transaction: Transaction,
): Promise<TaskActivityModel> {
  return await TaskActivityModel.create(
    {
      workspaceId,
      taskId,
      actorId: actorId || null,
      action,
      metadataJson,
    },
    { transaction },
  );
}

// ---------------------------------------------------------------------------
// Membership / access helpers
// ---------------------------------------------------------------------------

export async function getActorMembership(
  workspaceId: string,
  actorId: string,
  transaction: Transaction,
): Promise<WorkspaceMemberModel> {
  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
    transaction,
  });

  if (!membership) {
    throw new Error('FORBIDDEN: You are not a member of this workspace.');
  }

  return membership;
}

async function assertAssigneeBelongsToWorkspace(
  workspaceId: string,
  assigneeId: string | null | undefined,
  transaction: Transaction,
): Promise<void> {
  if (!assigneeId) return;

  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: assigneeId },
    transaction,
  });

  if (!membership) {
    throw new Error('BAD_REQUEST: Assignee must be a member of this workspace.');
  }
}

async function assertRoleMatchesDeliveryArea(
  workspaceId: string,
  assigneeId: string | null | undefined,
  deliveryArea: string | null | undefined,
  allowRoleMismatch: boolean | undefined,
  roleMismatchReason: string | undefined,
  actorRole: WorkspaceRole,
  transaction: Transaction,
): Promise<{
  isMismatch: boolean;
  assigneeRole?: string;
  assigneeSpecialties?: DeveloperSpecialty[];
}> {
  if (!assigneeId || !deliveryArea) return { isMismatch: false };

  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: assigneeId },
    include: [{ model: WorkspaceMemberSpecialtyModel, as: 'specialties', required: false }],
    transaction,
  });

  if (!membership)
    throw new Error('BAD_REQUEST: Assigned user is not an active member of this Workspace.');

  const targetRole = membership.role;
  const specialties = (
    (membership as unknown as { specialties?: WorkspaceMemberSpecialtyModel[] }).specialties || []
  ).map((row) => row.specialty);
  const isPlannerRole = ['owner', 'admin', 'po'].includes(targetRole);
  const isDevArea =
    deliveryArea === 'frontend' ||
    deliveryArea === 'backend' ||
    deliveryArea === 'mobile' ||
    deliveryArea === 'fullstack';
  const isQa = deliveryArea === 'qa';

  let isMismatch = false;
  if (isDevArea && !isPlannerRole) {
    // Existing Developer memberships predate specialty persistence. Keep them
    // assignable during migration, while every newly classified Developer is
    // strictly matched to their configured delivery areas.
    isMismatch =
      targetRole !== 'dev' ||
      (specialties.length > 0 && !specialties.includes(deliveryArea as DeveloperSpecialty));
  } else if (isQa && targetRole !== 'qa' && !isPlannerRole) {
    isMismatch = true;
  }

  if (isMismatch && !allowRoleMismatch) {
    throw new Error(
      `BAD_REQUEST: Assigned member role/specialties do not match subtask delivery area "${deliveryArea}".`,
    );
  }

  if (isMismatch && allowRoleMismatch && actorRole !== 'owner') {
    throw new Error(
      'FORBIDDEN: Only the Workspace Owner may override a delivery-area assignment mismatch.',
    );
  }

  if (isMismatch && allowRoleMismatch && !roleMismatchReason?.trim()) {
    throw new Error('BAD_REQUEST: A role mismatch override reason is required.');
  }

  return { isMismatch, assigneeRole: targetRole, assigneeSpecialties: specialties };
}

// ---------------------------------------------------------------------------
// Folder propagation helper
// ---------------------------------------------------------------------------

async function moveDirectSubtasksToFolder(
  workspaceId: string,
  parentTaskId: string,
  targetFolderId: string | null,
  actorId: string,
  transaction: Transaction,
): Promise<void> {
  const subtasks = await TaskModel.findAll({
    where: { workspaceId, parentTaskId },
    attributes: ['id', 'folderId'],
    transaction,
  });

  if (subtasks.length === 0) return;

  await TaskModel.update(
    { folderId: targetFolderId },
    { where: { workspaceId, parentTaskId }, transaction },
  );

  await Promise.all(
    subtasks.map((subtask) =>
      logActivity(
        workspaceId,
        subtask.id,
        actorId,
        'subtask.moved',
        { oldFolderId: subtask.folderId, newFolderId: targetFolderId, parentTaskId },
        transaction,
      ),
    ),
  );
}

// ---------------------------------------------------------------------------
// Create task / subtask
// ---------------------------------------------------------------------------

export async function createTaskImpl(actorId: string, input: CreateTaskInput): Promise<Task> {
  const createdResult = await sequelize.transaction(async (transaction) => {
    const {
      workspaceId,
      folderId,
      parentTaskId,
      deliveryArea,
      title,
      description,
      status,
      priority,
      assigneeId,
      startDate,
      dueDate,
    } = input;
    const membership = await getActorMembership(workspaceId, actorId, transaction);

    let hasSpecialPermission = false;
    if (!parentTaskId && !isPlanner(membership.role)) {
      const perm = await TaskCreationPermissionModel.findOne({
        where: {
          workspaceId,
          userId: actorId,
          [Op.or]: [{ expiresAt: null }, { expiresAt: { [Op.gt]: new Date() } }],
        },
        transaction,
      });
      hasSpecialPermission = Boolean(perm);
    }

    assertCanCreateTask(membership.role, actorId, assigneeId, parentTaskId, hasSpecialPermission);

    let targetFolderId = folderId || null;

    // Parent tasks have no individual assignee (unassigned feature container owned by reporter/PO)
    // Subtasks hold the designated execution assignee (FE / BE / QA)
    const resolvedAssigneeId = parentTaskId ? assigneeId || null : null;

    let parentTaskRecord: TaskModel | null = null;
    if (parentTaskId) {
      parentTaskRecord = await TaskModel.findOne({
        where: { id: parentTaskId, workspaceId },
        transaction,
      });

      if (!parentTaskRecord) {
        throw new Error('NOT_FOUND: Parent task not found in this workspace.');
      }

      if (parentTaskRecord.parentTaskId) {
        throw new Error('BAD_REQUEST: Cannot create subtask under another subtask.');
      }

      targetFolderId = parentTaskRecord.folderId;
    }

    if (targetFolderId) {
      const folder = await WorkFolderModel.findOne({
        where: { id: targetFolderId, workspaceId },
        transaction,
      });

      if (!folder) {
        throw new Error('NOT_FOUND: Folder not found in this workspace.');
      }

      if (folder.archivedAt !== null) {
        throw new Error('BAD_REQUEST: Cannot create task in an archived folder.');
      }
    }

    await assertAssigneeBelongsToWorkspace(workspaceId, resolvedAssigneeId, transaction);

    // Validate delivery area vs assignee role
    const roleCheck = await assertRoleMatchesDeliveryArea(
      workspaceId,
      resolvedAssigneeId,
      deliveryArea,
      input.allowRoleMismatch,
      input.roleMismatchReason,
      membership.role,
      transaction,
    );

    const completedAt = status === 'done' ? new Date() : null;

    const task = await TaskModel.create(
      {
        workspaceId,
        folderId: targetFolderId,
        parentTaskId: parentTaskId || null,
        deliveryArea: deliveryArea || null,
        title,
        description: description || null,
        status: status || 'todo',
        priority: priority || 'medium',
        assigneeId: resolvedAssigneeId || null,
        reporterId: actorId,
        startDate: startDate || null,
        dueDate: dueDate || null,
        completedAt,
      },
      { transaction },
    );

    // If parent task is already done, adding an incomplete subtask reopens the parent task
    if (
      parentTaskRecord &&
      parentTaskRecord.status === 'done' &&
      status !== 'done' &&
      status !== 'canceled'
    ) {
      parentTaskRecord.status = 'in_progress';
      parentTaskRecord.completedAt = null;
      await parentTaskRecord.save({ transaction });
      await logActivity(
        workspaceId,
        parentTaskRecord.id,
        actorId,
        'task.reopened',
        { reason: `Incomplete subtask "${title}" added` },
        transaction,
      );
    }

    // Record Activity audit event
    const action = parentTaskId ? 'subtask.created' : 'task.created';
    await logActivity(
      workspaceId,
      task.id,
      actorId,
      action,
      {
        title,
        deliveryArea: deliveryArea || null,
        parentTaskId: parentTaskId || null,
        folderId: targetFolderId,
        status: status || 'todo',
        priority: priority || 'medium',
        assigneeId: assigneeId || null,
        ...(roleCheck.isMismatch
          ? {
              roleMismatchOverride: true,
              roleMismatchReason: input.roleMismatchReason,
              assigneeRole: roleCheck.assigneeRole,
              assigneeSpecialties: roleCheck.assigneeSpecialties,
              deliveryArea,
            }
          : {}),
      },
      transaction,
    );

    return {
      formatted: formatTask(task),
      assigneeId: task.assigneeId,
      title: task.title,
      id: task.id,
    };
  });

  // Trigger 1: User di-assign task on creation
  if (createdResult.assigneeId && createdResult.assigneeId !== actorId) {
    UserModel.findByPk(actorId)
      .then((actorUser) => {
        const actorName = actorUser?.name || actorUser?.email || 'Workspace Member';
        fcmService
          .sendTaskAssignmentNotification({
            assigneeId: createdResult.assigneeId!,
            assignerName: actorName,
            assignerId: actorId,
            taskTitle: createdResult.title,
            taskId: createdResult.id,
            workspaceId: input.workspaceId,
          })
          .catch((err) =>
            console.warn('Failed to dispatch FCM task assignment notification:', err),
          );
      })
      .catch(() => {});
  }

  return createdResult.formatted;
}

// ---------------------------------------------------------------------------
// Update task
// ---------------------------------------------------------------------------

export async function updateTaskImpl(
  actorId: string,
  workspaceId: string,
  taskId: string,
  input: UpdateTaskInput,
): Promise<Task> {
  const updatedResult = await sequelize.transaction(async (transaction) => {
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
      transaction,
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const membership = await getActorMembership(workspaceId, actorId, transaction);
    assertCanMutateTask(
      membership.role,
      actorId,
      {
        parentTaskId: task.parentTaskId,
        assigneeId: task.assigneeId,
        status: task.status,
        deliveryArea: task.deliveryArea,
      },
      input,
    );

    if (input.parentTaskId !== undefined && input.parentTaskId !== task.parentTaskId) {
      throw new Error('BAD_REQUEST: A task parent cannot be changed after creation.');
    }

    if (!task.parentTaskId && input.deliveryArea !== undefined) {
      throw new Error('BAD_REQUEST: Delivery area is allowed only for subtasks.');
    }

    if (task.parentTaskId && input.deliveryArea === null) {
      throw new Error('BAD_REQUEST: Delivery area is required for subtasks.');
    }

    const changes: Record<string, { old: any; new: any }> = {};
    let requiresSubtaskFolderMove = false;

    if (input.folderId !== undefined && input.folderId !== task.folderId) {
      if (task.parentTaskId) {
        throw new Error(
          'BAD_REQUEST: Subtask folder cannot be modified directly; move the parent task instead.',
        );
      }

      if (input.folderId !== null) {
        const folder = await WorkFolderModel.findOne({
          where: { id: input.folderId, workspaceId },
          transaction,
        });

        if (!folder) {
          throw new Error('NOT_FOUND: Target folder not found in this workspace.');
        }

        if (folder.archivedAt !== null) {
          throw new Error('BAD_REQUEST: Cannot move task into an archived folder.');
        }
      }
      changes['folderId'] = { old: task.folderId, new: input.folderId };
      task.folderId = input.folderId;
      requiresSubtaskFolderMove = true;
    }

    if (input.title !== undefined && input.title !== task.title) {
      changes['title'] = { old: task.title, new: input.title };
      task.title = input.title;
    }

    if (input.description !== undefined && input.description !== task.description) {
      changes['description'] = { old: task.description, new: input.description };
      task.description = input.description;
    }

    if (input.deliveryArea !== undefined && input.deliveryArea !== task.deliveryArea) {
      changes['deliveryArea'] = { old: task.deliveryArea, new: input.deliveryArea };
      task.deliveryArea = input.deliveryArea;
    }

    if (input.priority !== undefined && input.priority !== task.priority) {
      changes['priority'] = { old: task.priority, new: input.priority };
      task.priority = input.priority;
    }

    let roleCheckResult: {
      isMismatch: boolean;
      assigneeRole?: string;
      assigneeSpecialties?: DeveloperSpecialty[];
    } = { isMismatch: false };
    if (!task.parentTaskId) {
      if (task.assigneeId !== null) {
        task.assigneeId = null;
      }
    } else if (
      (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) ||
      (input.deliveryArea !== undefined && input.deliveryArea !== changes['deliveryArea']?.old)
    ) {
      const nextAssigneeId = input.assigneeId !== undefined ? input.assigneeId : task.assigneeId;
      await assertAssigneeBelongsToWorkspace(workspaceId, nextAssigneeId, transaction);
      roleCheckResult = await assertRoleMatchesDeliveryArea(
        workspaceId,
        nextAssigneeId,
        task.deliveryArea,
        input.allowRoleMismatch,
        input.roleMismatchReason,
        membership.role,
        transaction,
      );
      if (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) {
        changes['assigneeId'] = { old: task.assigneeId, new: input.assigneeId };
        task.assigneeId = input.assigneeId;
      }
    }

    if (input.startDate !== undefined && input.startDate !== task.startDate) {
      changes['startDate'] = { old: task.startDate, new: input.startDate };
      task.startDate = input.startDate;
    }

    if (input.dueDate !== undefined && input.dueDate !== task.dueDate) {
      changes['dueDate'] = { old: task.dueDate, new: input.dueDate };
      task.dueDate = input.dueDate;
    }

    if (input.reviewNotes !== undefined && input.reviewNotes !== task.reviewNotes) {
      changes['reviewNotes'] = { old: task.reviewNotes, new: input.reviewNotes };
      task.reviewNotes = input.reviewNotes;
    }

    if (input.status !== undefined && input.status !== task.status) {
      // Strict Guard: A parent task cannot be marked done if any subtask is incomplete
      if (input.status === 'done' && !task.parentTaskId) {
        const incompleteSubtasks = await TaskModel.findAll({
          where: {
            workspaceId,
            parentTaskId: task.id,
            status: { [Op.notIn]: ['done', 'canceled'] },
          },
          attributes: ['id', 'title', 'deliveryArea', 'status'],
          transaction,
        });

        if (incompleteSubtasks.length > 0) {
          const incompleteList = incompleteSubtasks
            .map((st) => `"${st.title}" (${st.deliveryArea || 'subtask'}: ${st.status})`)
            .join(', ');
          throw new Error(
            `BAD_REQUEST: Cannot complete task while subtasks are incomplete. Please complete all subtasks first: ${incompleteList}`,
          );
        }
      }

      // Dependency Check: QA Subtask cannot be done until all sibling development subtasks are done
      if (input.status === 'done' && task.parentTaskId && task.deliveryArea === 'qa') {
        const incompleteDevelopment = await TaskModel.findAll({
          where: {
            workspaceId,
            parentTaskId: task.parentTaskId,
            deliveryArea: { [Op.in]: ['frontend', 'backend', 'mobile', 'fullstack'] },
            status: { [Op.notIn]: ['done', 'canceled'] },
          },
          attributes: ['id', 'title', 'deliveryArea', 'status'],
          transaction,
        });

        if (incompleteDevelopment.length > 0) {
          const incompleteList = incompleteDevelopment
            .map((st) => `"${st.title}" (${st.deliveryArea}: ${st.status})`)
            .join(', ');
          throw new Error(
            `BAD_REQUEST: Cannot mark QA subtask as Done until all development subtasks are completed: ${incompleteList}`,
          );
        }
      }

      // Review notes validation on changes_requested
      if (input.status === 'changes_requested') {
        if (!input.reviewNotes && !task.reviewNotes) {
          throw new Error(
            'BAD_REQUEST: Review notes are required when requesting changes on a subtask.',
          );
        }
        task.reviewedBy = actorId;
        changes['reviewedBy'] = { old: task.reviewedBy, new: actorId };
      } else if (input.status === 'done' && task.parentTaskId) {
        task.reviewedBy = actorId;
        changes['reviewedBy'] = { old: task.reviewedBy, new: actorId };
      }

      changes['status'] = { old: task.status, new: input.status };
      task.status = input.status;
      if (input.status === 'done') {
        task.completedAt = new Date();
      } else {
        task.completedAt = null;
      }

      // If a subtask is reopened (status changed from done to an active status), reopen the parent task if it was marked done
      if (task.parentTaskId && input.status !== 'done' && input.status !== 'canceled') {
        const parentTask = await TaskModel.findOne({
          where: { id: task.parentTaskId, workspaceId },
          transaction,
        });
        if (parentTask && parentTask.status === 'done') {
          parentTask.status = 'in_progress';
          parentTask.completedAt = null;
          await parentTask.save({ transaction });
          await logActivity(
            workspaceId,
            parentTask.id,
            actorId,
            'task.reopened',
            { reason: `Subtask "${task.title}" status changed to ${input.status}` },
            transaction,
          );
        }
      }
    }

    if (task.startDate && task.dueDate && task.startDate > task.dueDate) {
      throw new Error('BAD_REQUEST: Start date cannot be after due date.');
    }

    await task.save({ transaction });

    if (requiresSubtaskFolderMove) {
      await moveDirectSubtasksToFolder(workspaceId, task.id, task.folderId, actorId, transaction);
    }

    // Record Activity audit event for updates
    if (Object.keys(changes).length > 0) {
      const actionPrefix = task.parentTaskId ? 'subtask.' : 'task.';
      const primaryAction =
        Object.keys(changes).length === 1
          ? `${actionPrefix}${Object.keys(changes)[0]}_updated`
          : `${actionPrefix}updated`;
      await logActivity(
        workspaceId,
        task.id,
        actorId,
        primaryAction,
        {
          changes,
          ...(roleCheckResult.isMismatch
            ? {
                roleMismatchOverride: true,
                roleMismatchReason: input.roleMismatchReason,
                assigneeRole: roleCheckResult.assigneeRole,
                assigneeSpecialties: roleCheckResult.assigneeSpecialties,
                deliveryArea: task.deliveryArea,
              }
            : {}),
          ...(input.status === 'changes_requested' || input.reviewNotes
            ? { reviewNotes: input.reviewNotes || task.reviewNotes, reviewedBy: actorId }
            : {}),
        },
        transaction,
      );
    }

    return {
      formatted: formatTask(task),
      changes,
      title: task.title,
      id: task.id,
      assigneeId: task.assigneeId,
      reporterId: task.reporterId,
    };
  });

  // Trigger 1: User di-assign task on update (new or changed assignee)
  if (
    updatedResult.changes.assigneeId &&
    updatedResult.assigneeId &&
    updatedResult.assigneeId !== actorId
  ) {
    UserModel.findByPk(actorId)
      .then((actorUser) => {
        const actorName = actorUser?.name || actorUser?.email || 'Workspace Member';
        fcmService
          .sendTaskAssignmentNotification({
            assigneeId: updatedResult.assigneeId!,
            assignerName: actorName,
            assignerId: actorId,
            taskTitle: updatedResult.title,
            taskId: updatedResult.id,
            workspaceId,
          })
          .catch((err) =>
            console.warn('Failed to dispatch FCM task assignment notification:', err),
          );
      })
      .catch(() => {});
  }

  // Trigger 2: User update status task -> notify assignee & reporter
  if (updatedResult.changes.status) {
    const recipientIds: string[] = [];
    if (updatedResult.assigneeId && updatedResult.assigneeId !== actorId) {
      recipientIds.push(updatedResult.assigneeId);
    }
    if (
      updatedResult.reporterId &&
      updatedResult.reporterId !== actorId &&
      !recipientIds.includes(updatedResult.reporterId)
    ) {
      recipientIds.push(updatedResult.reporterId);
    }

    if (recipientIds.length > 0) {
      UserModel.findByPk(actorId)
        .then((actorUser) => {
          const actorName = actorUser?.name || actorUser?.email || 'Workspace Member';
          fcmService
            .sendTaskStatusUpdateNotification({
              recipientUserIds: recipientIds,
              updaterName: actorName,
              updaterId: actorId,
              taskTitle: updatedResult.title,
              taskId: updatedResult.id,
              workspaceId,
              oldStatus: String(updatedResult.changes.status.old),
              newStatus: String(updatedResult.changes.status.new),
            })
            .catch((err) => console.warn('Failed to dispatch FCM task status notification:', err));
        })
        .catch(() => {});
    }
  }

  return updatedResult.formatted;
}

// ---------------------------------------------------------------------------
// Move task
// ---------------------------------------------------------------------------

export async function moveTaskImpl(
  actorId: string,
  workspaceId: string,
  taskId: string,
  input: MoveTaskInput,
): Promise<Task> {
  return await sequelize.transaction(async (transaction) => {
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
      transaction,
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    const membership = await getActorMembership(workspaceId, actorId, transaction);
    assertCanMoveTask(membership.role, Boolean(task.parentTaskId));

    if (input.targetFolderId !== null) {
      const folder = await WorkFolderModel.findOne({
        where: { id: input.targetFolderId, workspaceId },
        transaction,
      });

      if (!folder) {
        throw new Error('NOT_FOUND: Target folder not found in this workspace.');
      }

      if (folder.archivedAt !== null) {
        throw new Error('BAD_REQUEST: Cannot move task into an archived folder.');
      }
    }

    const oldFolderId = task.folderId;
    task.folderId = input.targetFolderId;
    await task.save({ transaction });

    // Propagate folder change to direct subtasks and audit each visible change.
    await moveDirectSubtasksToFolder(
      workspaceId,
      taskId,
      input.targetFolderId,
      actorId,
      transaction,
    );

    // Record Activity audit event for move
    await logActivity(
      workspaceId,
      task.id,
      actorId,
      'task.moved',
      { oldFolderId, newFolderId: input.targetFolderId },
      transaction,
    );

    return formatTask(task);
  });
}

// ---------------------------------------------------------------------------
// Complete task (delegates to update)
// ---------------------------------------------------------------------------

export async function completeTaskImpl(
  actorId: string,
  workspaceId: string,
  taskId: string,
  input: CompleteTaskInput,
): Promise<Task> {
  return updateTaskImpl(actorId, workspaceId, taskId, {
    status: input.status,
    reviewNotes: input.reviewNotes,
  });
}
