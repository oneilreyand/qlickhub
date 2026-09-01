import { Op, Transaction, WhereOptions } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import {
  TaskModel,
  TaskActivityModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  WorkspaceMemberSpecialtyModel,
  UserModel,
  TaskCreationPermissionModel,
  TaskAttachmentModel,
  TaskRequirementModel,
  TaskDocumentModel,
  BugModel,
  QaSignOffModel,
  QaSignOffCancellationModel,
  ReleaseDecisionModel,
  ReleaseDecisionCancellationModel,
} from '../../db/models/index.js';
import {
  assertCanCreateTask,
  assertCanMutateTask,
  assertCanMoveTask,
  assertCanAccessTask,
  isPlanner,
} from '../../policies/taskPolicy.js';
import { fcmService } from '../../services/fcmService.js';
import {
  CreateTaskInput,
  UpdateTaskInput,
  MoveTaskInput,
  CompleteTaskInput,
  TaskListQuery,
  TaskListQuerySchema,
  Task,
  TaskListResponse,
  DeliveryArea,
  SubtaskSummary,
  TaskActivityQuery,
  TaskActivityListResponse,
  WorkspaceRole,
  DeveloperSpecialty,
} from '@qlick/contracts';

function formatTask(t: TaskModel): Task {
  const json = t.toJSON();
  return {
    id: json.id,
    workspaceId: json.workspaceId,
    folderId: json.folderId || null,
    parentTaskId: json.parentTaskId || null,
    deliveryArea: (json.deliveryArea as DeliveryArea) || null,
    title: json.title,
    description: json.description || null,
    status: json.status,
    priority: json.priority,
    assigneeId: json.assigneeId || null,
    reporterId: json.reporterId,
    reviewedBy: json.reviewedBy || null,
    reviewNotes: json.reviewNotes || null,
    startDate: json.startDate || null,
    dueDate: json.dueDate || null,
    completedAt: json.completedAt ? new Date(json.completedAt).toISOString() : null,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
    ...((json as any).subtasks && {
      subtasks: (json as any).subtasks.map((st: any) => formatTask(st)),
    }),
  } as Task;
}

async function assertRoleMatchesDeliveryArea(
  workspaceId: string,
  assigneeId: string | null | undefined,
  deliveryArea: DeliveryArea | null | undefined,
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

async function attachSubtaskSummaries(workspaceId: string, parentTasks: Task[]): Promise<Task[]> {
  const parentIds = parentTasks.map((t) => t.id);
  if (parentIds.length === 0) return parentTasks;

  const subtasks = await TaskModel.findAll({
    where: {
      workspaceId,
      parentTaskId: { [Op.in]: parentIds },
    },
    attributes: ['id', 'parentTaskId', 'deliveryArea', 'status'],
  });

  const summaryMap = new Map<string, SubtaskSummary>();

  for (const pId of parentIds) {
    summaryMap.set(pId, {
      total: 0,
      completed: 0,
      areas: {
        frontend: { total: 0, completed: 0 },
        backend: { total: 0, completed: 0 },
        mobile: { total: 0, completed: 0 },
        fullstack: { total: 0, completed: 0 },
        qa: { total: 0, completed: 0 },
      },
    });
  }

  for (const st of subtasks) {
    const pId = st.parentTaskId;
    if (!pId || !summaryMap.has(pId)) continue;

    const summary = summaryMap.get(pId)!;
    summary.total += 1;

    const isDone = st.status === 'done';
    if (isDone) {
      summary.completed += 1;
    }

    const area = st.deliveryArea as DeliveryArea | null;
    if (area && summary.areas[area]) {
      summary.areas[area].total += 1;
      if (isDone) {
        summary.areas[area].completed += 1;
      }
    }
  }

  return parentTasks.map((t) => ({
    ...t,
    subtaskSummary: summaryMap.get(t.id),
  }));
}

async function logActivity(
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

async function getActorMembership(
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

export class TaskService {
  /**
   * Lists tasks in a workspace with filtering, hierarchy options, date presets, search, and pagination.
   */
  async listTasks(
    workspaceId: string,
    query: TaskListQuery,
    actorId?: string,
    actorRole?: WorkspaceRole,
  ): Promise<TaskListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const where: WhereOptions<TaskModel> = { workspaceId };

    // My Tasks specific scoping (PO sees their created/assigned parent tasks; Dev & QA see their assigned subtasks)
    if (query.myTasksOnly && actorId) {
      if (actorRole === 'owner' || actorRole === 'admin' || actorRole === 'po') {
        (where as any)[Op.or] = [{ reporterId: actorId }, { assigneeId: actorId }];
        if (!query.parentTaskId) {
          (where as any).parentTaskId = null;
        }
      } else {
        (where as any).assigneeId = actorId;
      }
    } else if (actorId && (actorRole === 'dev' || actorRole === 'qa')) {
      // Role-based task scoping for Dev and QA (non-planners) in general queries
      if (query.rootOnly) {
        // In Root-only (Task Hub), executors only see Parent Tasks where:
        // 1. They have at least one assigned subtask, OR
        // 2. They are the reporter/creator
        const subtaskCondition = sequelize.literal(
          `EXISTS (
            SELECT 1 FROM tasks AS st
            WHERE st.parent_task_id = "TaskModel"."id"
              AND st.assignee_id = ${sequelize.escape(actorId)}
              AND st.deleted_at IS NULL
          )`,
        );
        (where as any)[Op.and] = [
          ...((where as any)[Op.and] || []),
          {
            [Op.or]: [subtaskCondition, { reporterId: actorId }],
          },
        ];
      } else if (!query.parentTaskId && !query.assigneeId) {
        // In general task queries (without explicit assignee or parent filter), executors default to their own tasks
        (where as any).assigneeId = actorId;
      }
    }

    // Root-only vs parentTaskId vs default
    if (query.rootOnly && !query.myTasksOnly) {
      (where as any).parentTaskId = null;
    } else if (query.parentTaskId) {
      (where as any).parentTaskId = query.parentTaskId;
    }

    // Folder filtering
    if (query.unfiledOnly) {
      (where as any).folderId = null;
    } else if (query.folderId) {
      const folder = await WorkFolderModel.findOne({
        where: { id: query.folderId, workspaceId },
      });

      if (!folder) {
        throw new Error('NOT_FOUND: Folder not found in this workspace.');
      }

      if (query.includeDescendants) {
        const [results] = (await sequelize.query(
          `WITH RECURSIVE folder_tree AS (
            SELECT id FROM work_folders WHERE id = :folderId AND workspace_id = :workspaceId AND archived_at IS NULL
            UNION ALL
            SELECT wf.id FROM work_folders wf
            JOIN folder_tree ft ON wf.parent_folder_id = ft.id
            WHERE wf.workspace_id = :workspaceId AND wf.archived_at IS NULL
          )
          SELECT id FROM folder_tree;`,
          {
            replacements: { folderId: folder.id, workspaceId },
          },
        )) as Array<{ id: string }[]>;

        const descendantIds = results.map((row: any) => row.id);
        (where as any).folderId = { [Op.in]: descendantIds };
      } else {
        (where as any).folderId = folder.id;
      }
    }

    const include: any[] = [];
    if (query.includeSubtasks) {
      include.push({ model: TaskModel, as: 'subtasks' });
    }

    // Delivery Area filtering
    if (query.deliveryArea) {
      (where as any).deliveryArea = query.deliveryArea;
    }

    // Status filtering
    if (query.status) {
      (where as any).status = Array.isArray(query.status)
        ? { [Op.in]: query.status }
        : query.status;
    }

    // Priority filtering
    if (query.priority) {
      (where as any).priority = Array.isArray(query.priority)
        ? { [Op.in]: query.priority }
        : query.priority;
    }

    // Assignee filtering
    if (query.assigneeId) {
      (where as any).assigneeId = query.assigneeId;
    }

    // Search query: search across title, description, and id
    if (query.search && query.search.trim() !== '') {
      const term = `%${query.search.trim()}%`;
      (where as any)[Op.or] = [
        { title: { [Op.iLike]: term } },
        { description: { [Op.iLike]: term } },
        sequelize.where(sequelize.cast(sequelize.col('TaskModel.id'), 'text'), {
          [Op.iLike]: term,
        }),
      ];
    }

    // Date filtering
    const todayStr = new Date().toISOString().split('T')[0];

    if (query.datePreset) {
      const now = new Date();
      if (query.datePreset === 'today') {
        (where as any).dueDate = todayStr;
      } else if (query.datePreset === 'this_week' || query.datePreset === 'week') {
        const day = now.getDay();
        const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(now.setDate(diffToMon)).toISOString().split('T')[0];
        const sunday = new Date(now.setDate(diffToMon + 6)).toISOString().split('T')[0];
        (where as any).dueDate = { [Op.between]: [monday, sunday] };
      } else if (query.datePreset === 'this_month' || query.datePreset === 'month') {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
          .toISOString()
          .split('T')[0];
        (where as any).dueDate = { [Op.between]: [firstDay, lastDay] };
      } else if (query.datePreset === 'overdue') {
        (where as any).dueDate = { [Op.lt]: todayStr };
        (where as any).status = { [Op.notIn]: ['done', 'canceled'] };
      }
    } else if (query.startDate || query.endDate) {
      if (query.startDate && query.endDate) {
        (where as any).dueDate = { [Op.between]: [query.startDate, query.endDate] };
      } else if (query.startDate) {
        (where as any).dueDate = { [Op.gte]: query.startDate };
      } else if (query.endDate) {
        (where as any).dueDate = { [Op.lte]: query.endDate };
      }
    }

    const { rows, count } = await TaskModel.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    let tasks = rows.map(formatTask);

    if (query.includeSubtaskSummary) {
      tasks = await attachSubtaskSummaries(workspaceId, tasks);
    }

    return {
      tasks,
      total: count,
      page,
      limit,
    };
  }

  async getTask(
    workspaceId: string,
    taskId: string,
    actorId: string,
    actorRole?: WorkspaceRole,
  ): Promise<Task> {
    const task = await TaskModel.findOne({
      where: { id: taskId, workspaceId },
    });

    if (!task) {
      throw new Error('NOT_FOUND: Task not found in this workspace.');
    }

    if (actorRole && (actorRole === 'dev' || actorRole === 'qa')) {
      let hasAssignedSubtask = false;
      if (!task.parentTaskId) {
        const count = await TaskModel.count({
          where: {
            workspaceId,
            parentTaskId: task.id,
            assigneeId: actorId,
          },
        });
        hasAssignedSubtask = count > 0;
      } else {
        const count = await TaskModel.count({
          where: {
            workspaceId,
            parentTaskId: task.parentTaskId,
            assigneeId: actorId,
          },
        });
        hasAssignedSubtask = count > 0;
      }

      assertCanAccessTask(actorRole, actorId, task, hasAssignedSubtask);
    }

    return formatTask(task);
  }

  async deleteTask(workspaceId: string, taskId: string, actorId: string): Promise<void> {
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

  /**
   * Lists direct subtasks for a given parent task.
   */
  async listSubtasks(
    workspaceId: string,
    parentTaskId: string,
    page = 1,
    limit = 50,
    actorId?: string,
    actorRole?: WorkspaceRole,
  ): Promise<TaskListResponse> {
    if (actorId && actorRole) {
      await this.getTask(workspaceId, parentTaskId, actorId, actorRole);
    } else {
      const parentTask = await TaskModel.findOne({
        where: { id: parentTaskId, workspaceId },
      });

      if (!parentTask) {
        throw new Error('NOT_FOUND: Parent task not found in this workspace.');
      }
    }

    const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);

    const query = TaskListQuerySchema.parse({
      workspaceId,
      parentTaskId,
      page: safePage,
      limit: safeLimit,
    });

    return this.listTasks(workspaceId, query, actorId, actorRole);
  }

  /**
   * Lists paginated task activity audit timeline for a task or aggregated parent timeline.
   */
  async listTaskActivity(
    actorId: string,
    workspaceId: string,
    taskId: string,
    query: TaskActivityQuery,
  ): Promise<TaskActivityListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    return await sequelize.transaction(async (transaction) => {
      await getActorMembership(workspaceId, actorId, transaction);

      const task = await TaskModel.findOne({
        where: { id: taskId, workspaceId },
        transaction,
      });

      if (!task) {
        throw new Error('NOT_FOUND: Task not found in this workspace.');
      }

      let taskIds = [taskId];

      if (!task.parentTaskId && query.aggregateSubtasks !== false) {
        const subtasks = await TaskModel.findAll({
          where: { workspaceId, parentTaskId: taskId },
          attributes: ['id'],
          // Deletion activity belongs to the Feature audit trail even after a
          // direct subtask is soft-deleted.
          paranoid: false,
          transaction,
        });
        taskIds = [taskId, ...subtasks.map((st) => st.id)];
      }

      const { rows, count } = await TaskActivityModel.findAndCountAll({
        where: {
          workspaceId,
          taskId: { [Op.in]: taskIds },
        },
        include: [
          {
            model: TaskModel,
            as: 'task',
            attributes: ['id', 'title', 'parentTaskId', 'deliveryArea'],
            // Keep the deleted subtask context (title, area, hierarchy) on
            // its retained audit event.
            paranoid: false,
          },
          {
            model: UserModel,
            as: 'actor',
            attributes: ['id', 'name', 'email'],
          },
        ],
        order: [['createdAt', 'DESC']],
        limit,
        offset,
        transaction,
      });

      const activities = rows.map((row) => {
        const json = row.toJSON() as any;
        const taskInfo = json.task;
        const actorInfo = json.actor;

        return {
          id: json.id,
          workspaceId: json.workspaceId,
          taskId: json.taskId,
          taskTitle: taskInfo?.title,
          isSubtask: Boolean(taskInfo?.parentTaskId),
          deliveryArea: (taskInfo?.deliveryArea as DeliveryArea) || null,
          actorId: json.actorId || null,
          actorName: actorInfo?.name || actorInfo?.email || 'System',
          action: json.action,
          metadataJson: json.metadataJson || null,
          createdAt: json.createdAt
            ? new Date(json.createdAt).toISOString()
            : new Date().toISOString(),
        };
      });

      return {
        activities,
        total: count,
        page,
        limit,
      };
    });
  }

  /**
   * Creates a new task or subtask. Enforces active folder, policy rules, and records Activity audit event.
   */
  async createTask(actorId: string, input: CreateTaskInput): Promise<Task> {
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

  /**
   * Updates task details. Enforces field-level policy and records Activity audit events.
   */
  async updateTask(
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
              .catch((err) =>
                console.warn('Failed to dispatch FCM task status notification:', err),
              );
          })
          .catch(() => {});
      }
    }

    return updatedResult.formatted;
  }

  /**
   * Moves a parent task to a target folder or unfiled, propagating folder change to all direct subtasks and logging Activity.
   */
  async moveTask(
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

  /**
   * Completes or cancels a task or subtask.
   */
  async completeTask(
    actorId: string,
    workspaceId: string,
    taskId: string,
    input: CompleteTaskInput,
  ): Promise<Task> {
    return this.updateTask(actorId, workspaceId, taskId, {
      status: input.status,
      reviewNotes: input.reviewNotes,
    });
  }
}

export const taskService = new TaskService();
