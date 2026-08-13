import { Op, Transaction, WhereOptions } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';
import {
  TaskModel,
  TaskActivityModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  UserModel,
} from '../../db/models/index.js';
import { assertCanCreateTask, assertCanMutateTask, assertCanMoveTask } from '../../policies/taskPolicy.js';
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
} from '@qa/contracts';

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
    position: 0,
    startDate: json.startDate || null,
    dueDate: json.dueDate || null,
    completedAt: json.completedAt ? new Date(json.completedAt).toISOString() : null,
    createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
    updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
  };
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
  transaction: Transaction
): Promise<TaskActivityModel> {
  return await TaskActivityModel.create(
    {
      workspaceId,
      taskId,
      actorId: actorId || null,
      action,
      metadataJson,
    },
    { transaction }
  );
}

async function assertAssigneeBelongsToWorkspace(
  workspaceId: string,
  assigneeId: string | null | undefined,
  transaction: Transaction
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
  transaction: Transaction
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
  async listTasks(workspaceId: string, query: TaskListQuery): Promise<TaskListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const where: WhereOptions<TaskModel> = { workspaceId };

    // Root-only vs parentTaskId vs default
    if (query.rootOnly) {
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
        const children = await WorkFolderModel.findAll({
          where: { workspaceId, parentFolderId: folder.id, archivedAt: null },
          attributes: ['id'],
        });
        (where as any).folderId = { [Op.in]: [folder.id, ...children.map((child) => child.id)] };
      } else {
        (where as any).folderId = folder.id;
      }
    }

    // Status filtering
    if (query.status) {
      (where as any).status = Array.isArray(query.status) ? { [Op.in]: query.status } : query.status;
    }

    // Priority filtering
    if (query.priority) {
      (where as any).priority = Array.isArray(query.priority) ? { [Op.in]: query.priority } : query.priority;
    }

    // Assignee filtering
    if (query.assigneeId) {
      (where as any).assigneeId = query.assigneeId;
    }

    // Search query
    if (query.search && query.search.trim() !== '') {
      (where as any).title = { [Op.iLike]: `%${query.search.trim()}%` };
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
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
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

  /**
   * Lists direct subtasks for a given parent task.
   */
  async listSubtasks(
    workspaceId: string,
    parentTaskId: string,
    page = 1,
    limit = 50
  ): Promise<TaskListResponse> {
    const parentTask = await TaskModel.findOne({
      where: { id: parentTaskId, workspaceId },
    });

    if (!parentTask) {
      throw new Error('NOT_FOUND: Parent task not found in this workspace.');
    }

    const query = TaskListQuerySchema.parse({
      workspaceId,
      parentTaskId,
      page,
      limit,
    });

    return this.listTasks(workspaceId, query);
  }

  /**
   * Lists paginated task activity audit timeline for a task or aggregated parent timeline.
   */
  async listTaskActivity(
    actorId: string,
    workspaceId: string,
    taskId: string,
    query: TaskActivityQuery
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
          createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
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
    return await sequelize.transaction(async (transaction) => {
      const { workspaceId, folderId, parentTaskId, deliveryArea, title, description, status, priority, assigneeId, startDate, dueDate } = input;
      const membership = await getActorMembership(workspaceId, actorId, transaction);

      assertCanCreateTask(membership.role, actorId, assigneeId, parentTaskId);

      let targetFolderId = folderId || null;

      if (parentTaskId) {
        const parentTask = await TaskModel.findOne({
          where: { id: parentTaskId, workspaceId },
          transaction,
        });

        if (!parentTask) {
          throw new Error('NOT_FOUND: Parent task not found in this workspace.');
        }

        if (parentTask.parentTaskId) {
          throw new Error('BAD_REQUEST: Cannot create subtask under another subtask.');
        }

        targetFolderId = parentTask.folderId;
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

      await assertAssigneeBelongsToWorkspace(workspaceId, assigneeId, transaction);

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
          assigneeId: assigneeId || null,
          reporterId: actorId,
          startDate: startDate || null,
          dueDate: dueDate || null,
          completedAt,
        },
        { transaction }
      );

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
        },
        transaction
      );

      return formatTask(task);
    });
  }

  /**
   * Updates task details. Enforces field-level policy and records Activity audit events.
   */
  async updateTask(actorId: string, workspaceId: string, taskId: string, input: UpdateTaskInput): Promise<Task> {
    return await sequelize.transaction(async (transaction) => {
      const task = await TaskModel.findOne({
        where: { id: taskId, workspaceId },
        transaction,
      });

      if (!task) {
        throw new Error('NOT_FOUND: Task not found in this workspace.');
      }

      const membership = await getActorMembership(workspaceId, actorId, transaction);
      assertCanMutateTask(membership.role, actorId, task, input);

      const changes: Record<string, { old: any; new: any }> = {};

      if (input.folderId !== undefined && input.folderId !== task.folderId) {
        if (task.parentTaskId) {
          throw new Error('BAD_REQUEST: Subtask folder cannot be modified directly; move the parent task instead.');
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

        // Cascade folderId update to subtasks
        await TaskModel.update(
          { folderId: input.folderId },
          { where: { workspaceId, parentTaskId: task.id }, transaction }
        );
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

      if (input.assigneeId !== undefined && input.assigneeId !== task.assigneeId) {
        await assertAssigneeBelongsToWorkspace(workspaceId, input.assigneeId, transaction);
        changes['assigneeId'] = { old: task.assigneeId, new: input.assigneeId };
        task.assigneeId = input.assigneeId;
      }

      if (input.startDate !== undefined && input.startDate !== task.startDate) {
        changes['startDate'] = { old: task.startDate, new: input.startDate };
        task.startDate = input.startDate;
      }

      if (input.dueDate !== undefined && input.dueDate !== task.dueDate) {
        changes['dueDate'] = { old: task.dueDate, new: input.dueDate };
        task.dueDate = input.dueDate;
      }

      if (input.status !== undefined && input.status !== task.status) {
        changes['status'] = { old: task.status, new: input.status };
        task.status = input.status;
        if (input.status === 'done') {
          task.completedAt = new Date();
        } else {
          task.completedAt = null;
        }
      }

      await task.save({ transaction });

      // Record Activity audit event for updates
      if (Object.keys(changes).length > 0) {
        const actionPrefix = task.parentTaskId ? 'subtask.' : 'task.';
        const primaryAction = Object.keys(changes).length === 1 ? `${actionPrefix}${Object.keys(changes)[0]}_updated` : `${actionPrefix}updated`;
        await logActivity(
          workspaceId,
          task.id,
          actorId,
          primaryAction,
          { changes },
          transaction
        );
      }

      return formatTask(task);
    });
  }

  /**
   * Moves a parent task to a target folder or unfiled, propagating folder change to all direct subtasks and logging Activity.
   */
  async moveTask(actorId: string, workspaceId: string, taskId: string, input: MoveTaskInput): Promise<Task> {
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

      // Propagate folder change to direct subtasks in the same transaction
      await TaskModel.update(
        { folderId: input.targetFolderId },
        { where: { workspaceId, parentTaskId: taskId }, transaction }
      );

      // Record Activity audit event for move
      await logActivity(
        workspaceId,
        task.id,
        actorId,
        'task.moved',
        { oldFolderId, newFolderId: input.targetFolderId },
        transaction
      );

      return formatTask(task);
    });
  }

  /**
   * Completes or cancels a task or subtask.
   */
  async completeTask(actorId: string, workspaceId: string, taskId: string, input: CompleteTaskInput): Promise<Task> {
    return this.updateTask(actorId, workspaceId, taskId, { status: input.status });
  }
}

export const taskService = new TaskService();
