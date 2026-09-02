/**
 * Task Query Implementation
 *
 * Internal module: query and read operations for the Task domain.
 * Called exclusively by the TaskService façade — do not import directly
 * from outside the tasks module.
 *
 * Covered concepts:
 * - Task formatting (domain → contract shape)
 * - List queries with filtering, hierarchy, date presets, pagination
 * - Single task retrieval with access-policy enforcement
 * - Subtask listing (delegates to listTasksImpl)
 * - Task activity / audit timeline
 */

import { Op, Transaction } from 'sequelize';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  TaskActivityModel,
  WorkFolderModel,
  WorkspaceMemberModel,
  UserModel,
} from '../../../db/models/index.js';
import { assertCanAccessTask } from '../../../policies/taskPolicy.js';
import {
  TaskListQuery,
  TaskListQuerySchema,
  Task,
  TaskListResponse,
  DeliveryArea,
  SubtaskSummary,
  TaskActivityQuery,
  TaskActivityListResponse,
  WorkspaceRole,
} from '@qlick/contracts';

// ---------------------------------------------------------------------------
// Formatting helper
// ---------------------------------------------------------------------------

export function formatTask(t: TaskModel): Task {
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

// ---------------------------------------------------------------------------
// Subtask summary helper
// ---------------------------------------------------------------------------

export async function attachSubtaskSummaries(
  workspaceId: string,
  parentTasks: Task[],
): Promise<Task[]> {
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

// ---------------------------------------------------------------------------
// List tasks
// ---------------------------------------------------------------------------

export async function listTasksImpl(
  workspaceId: string,
  query: TaskListQuery,
  actorId?: string,
  actorRole?: WorkspaceRole,
): Promise<TaskListResponse> {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const offset = (page - 1) * limit;

  const where: any = { workspaceId };

  // My Tasks specific scoping (PO sees their created/assigned parent tasks; Dev & QA see their assigned subtasks)
  if (query.myTasksOnly && actorId) {
    if (actorRole === 'owner' || actorRole === 'admin' || actorRole === 'po') {
      where[Op.or] = [{ reporterId: actorId }, { assigneeId: actorId }];
      if (!query.parentTaskId) {
        where.parentTaskId = null;
      }
    } else {
      where.assigneeId = actorId;
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
      where[Op.and] = [
        ...(where[Op.and] || []),
        {
          [Op.or]: [subtaskCondition, { reporterId: actorId }],
        },
      ];
    } else if (!query.parentTaskId && !query.assigneeId) {
      // In general task queries (without explicit assignee or parent filter), executors default to their own tasks
      where.assigneeId = actorId;
    }
  }

  // Root-only vs parentTaskId vs default
  if (query.rootOnly && !query.myTasksOnly) {
    where.parentTaskId = null;
  } else if (query.parentTaskId) {
    where.parentTaskId = query.parentTaskId;
  }

  // Folder filtering
  if (query.unfiledOnly) {
    where.folderId = null;
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
      where.folderId = { [Op.in]: descendantIds };
    } else {
      where.folderId = folder.id;
    }
  }

  const include: any[] = [];
  if (query.includeSubtasks) {
    include.push({ model: TaskModel, as: 'subtasks' });
  }

  // Delivery Area filtering
  if (query.deliveryArea) {
    where.deliveryArea = query.deliveryArea;
  }

  // Status filtering
  if (query.status) {
    where.status = Array.isArray(query.status) ? { [Op.in]: query.status } : query.status;
  }

  // Priority filtering
  if (query.priority) {
    where.priority = Array.isArray(query.priority) ? { [Op.in]: query.priority } : query.priority;
  }

  // Assignee filtering
  if (query.assigneeId) {
    where.assigneeId = query.assigneeId;
  }

  // Search query: search across title, description, and id
  if (query.search && query.search.trim() !== '') {
    const term = `%${query.search.trim()}%`;
    where[Op.or] = [
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
      where.dueDate = todayStr;
    } else if (query.datePreset === 'this_week' || query.datePreset === 'week') {
      const day = now.getDay();
      const diffToMon = now.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(now.setDate(diffToMon)).toISOString().split('T')[0];
      const sunday = new Date(now.setDate(diffToMon + 6)).toISOString().split('T')[0];
      where.dueDate = { [Op.between]: [monday, sunday] };
    } else if (query.datePreset === 'this_month' || query.datePreset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split('T')[0];
      where.dueDate = { [Op.between]: [firstDay, lastDay] };
    } else if (query.datePreset === 'overdue') {
      where.dueDate = { [Op.lt]: todayStr };
      where.status = { [Op.notIn]: ['done', 'canceled'] };
    }
  } else if (query.startDate || query.endDate) {
    if (query.startDate && query.endDate) {
      where.dueDate = { [Op.between]: [query.startDate, query.endDate] };
    } else if (query.startDate) {
      where.dueDate = { [Op.gte]: query.startDate };
    } else if (query.endDate) {
      where.dueDate = { [Op.lte]: query.endDate };
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

// ---------------------------------------------------------------------------
// Get single task
// ---------------------------------------------------------------------------

export async function getTaskImpl(
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
    let hasAssignedSubtask: boolean;
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

// ---------------------------------------------------------------------------
// List subtasks
// ---------------------------------------------------------------------------

export async function listSubtasksImpl(
  workspaceId: string,
  parentTaskId: string,
  page = 1,
  limit = 50,
  actorId?: string,
  actorRole?: WorkspaceRole,
): Promise<TaskListResponse> {
  if (actorId && actorRole) {
    await getTaskImpl(workspaceId, parentTaskId, actorId, actorRole);
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

  return listTasksImpl(workspaceId, query, actorId, actorRole);
}

// ---------------------------------------------------------------------------
// List task activity / audit timeline
// ---------------------------------------------------------------------------

export async function listTaskActivityImpl(
  actorId: string,
  workspaceId: string,
  taskId: string,
  query: TaskActivityQuery,
): Promise<TaskActivityListResponse> {
  const page = query.page || 1;
  const limit = query.limit || 50;
  const offset = (page - 1) * limit;

  return await sequelize.transaction(async (transaction: Transaction) => {
    // Verify actor is a workspace member
    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: actorId },
      transaction,
    });
    if (!membership) {
      throw new Error('FORBIDDEN: You are not a member of this workspace.');
    }

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
