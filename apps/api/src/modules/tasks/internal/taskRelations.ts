import type { CreateTaskRelationInput, RelatedTask, TaskRelation } from '@qlick/contracts';
import { Op, UniqueConstraintError } from 'sequelize';
import { sequelize } from '../../../db/sequelize.js';
import {
  TaskModel,
  TaskRelationModel,
  WorkspaceMemberModel,
  WorkspaceModel,
} from '../../../db/models/index.js';
import { assertTaskAccessForActor } from './taskAccess.js';
import { logActivity } from './taskLifecycle.js';

/**
 * MY-WORK-REPORT P4 (ADR-047, AUTH-016): relations between tasks across Workspaces.
 * - Create/delete: Planner (Owner/Admin/PO) of the source task's Workspace (route) who is also an
 *   active member of the target task's Workspace (here).
 * - Read: anyone who may read the task (route, AUTH-013). The other task's details are shown only
 *   when the reader may read that task too; otherwise only type and date range (AUTH-011).
 */

const PLANNER = new Set(['owner', 'admin', 'po']);
const TASK_ATTRS = [
  'id',
  'workspaceId',
  'parentTaskId',
  'assigneeId',
  'reporterId',
  'title',
  'status',
  'startDate',
  'dueDate',
] as const;

type TaskLike = Pick<TaskModel, (typeof TASK_ATTRS)[number]>;

/** Readers' Workspace roles, loaded once per request. */
export async function loadActorRoles(actorId: string): Promise<Map<string, string>> {
  const rows = await WorkspaceMemberModel.findAll({
    where: { userId: actorId },
    attributes: ['workspaceId', 'role'],
  });
  return new Map(rows.map((row) => [row.workspaceId, row.role]));
}

/** AUTH-013 applied to a task in any Workspace; false when the reader is not an active member. */
export async function canActorReadTask(
  actorId: string,
  roles: Map<string, string>,
  task: TaskLike,
): Promise<boolean> {
  const role = roles.get(task.workspaceId);
  if (!role) return false;
  if (PLANNER.has(role)) return true;
  try {
    await assertTaskAccessForActor(task.workspaceId, task, actorId, role as 'dev' | 'qa');
    return true;
  } catch {
    return false;
  }
}

/** Describes tasks for one reader, redacting the ones they may not read. */
export async function describeTasksFor(
  actorId: string,
  roles: Map<string, string>,
  tasks: TaskLike[],
): Promise<Map<string, RelatedTask>> {
  const result = new Map<string, RelatedTask>();
  const readable: TaskLike[] = [];
  for (const task of tasks) {
    if (await canActorReadTask(actorId, roles, task)) readable.push(task);
    else {
      result.set(task.id, {
        isRedacted: true,
        startDate: task.startDate ?? null,
        dueDate: task.dueDate ?? null,
      });
    }
  }
  if (!readable.length) return result;
  const featureIds = [...new Set(readable.map((t) => t.parentTaskId).filter(Boolean))] as string[];
  const [features, workspaces] = await Promise.all([
    featureIds.length
      ? TaskModel.findAll({ where: { id: { [Op.in]: featureIds } }, attributes: ['id', 'title'] })
      : Promise.resolve([] as TaskModel[]),
    WorkspaceModel.findAll({
      where: { id: { [Op.in]: [...new Set(readable.map((t) => t.workspaceId))] } },
      attributes: ['id', 'name'],
    }),
  ]);
  const featureName = new Map(features.map((f) => [f.id, f.title]));
  const workspaceName = new Map(workspaces.map((w) => [w.id, w.name]));
  for (const task of readable) {
    result.set(task.id, {
      isRedacted: false,
      id: task.id,
      title: task.title,
      kind: task.parentTaskId ? 'subtask' : 'feature',
      featureId: task.parentTaskId,
      featureName: task.parentTaskId ? (featureName.get(task.parentTaskId) ?? null) : null,
      workspaceId: task.workspaceId,
      workspaceName: workspaceName.get(task.workspaceId) ?? '',
      status: task.status,
      startDate: task.startDate ?? null,
      dueDate: task.dueDate ?? null,
    });
  }
  return result;
}

async function requireTask(workspaceId: string, taskId: string) {
  const task = await TaskModel.findOne({ where: { id: taskId, workspaceId } });
  if (!task) throw new Error('NOT_FOUND: Task not found in this workspace.');
  return task;
}

export async function listTaskRelations(
  workspaceId: string,
  taskId: string,
  actorId: string,
): Promise<TaskRelation[]> {
  await requireTask(workspaceId, taskId);
  const relations = await TaskRelationModel.findAll({
    where: { [Op.or]: [{ sourceTaskId: taskId }, { targetTaskId: taskId }] },
    order: [['createdAt', 'ASC']],
  });
  if (!relations.length) return [];
  const otherIds = relations.map((r) =>
    r.sourceTaskId === taskId ? r.targetTaskId : r.sourceTaskId,
  );
  const others = await TaskModel.findAll({
    where: { id: { [Op.in]: otherIds } },
    attributes: [...TASK_ATTRS],
  });
  const roles = await loadActorRoles(actorId);
  const described = await describeTasksFor(actorId, roles, others);
  return relations
    .filter((relation) =>
      described.has(
        relation.sourceTaskId === taskId ? relation.targetTaskId : relation.sourceTaskId,
      ),
    )
    .map((relation) => {
      const outgoing = relation.sourceTaskId === taskId;
      return {
        id: relation.id,
        type: relation.type,
        direction: outgoing ? 'outgoing' : 'incoming',
        other: described.get(outgoing ? relation.targetTaskId : relation.sourceTaskId)!,
        createdAt: relation.createdAt.toISOString(),
        canDelete: PLANNER.has(roles.get(relation.workspaceId) ?? ''),
      };
    });
}

export async function createTaskRelation(
  workspaceId: string,
  taskId: string,
  actorId: string,
  input: CreateTaskRelationInput,
): Promise<TaskRelation> {
  const source = await requireTask(workspaceId, taskId);
  if (input.targetTaskId === taskId) {
    throw new Error('BAD_REQUEST: Task tidak bisa berelasi dengan dirinya sendiri.');
  }
  const target = await TaskModel.findByPk(input.targetTaskId, { attributes: [...TASK_ATTRS] });
  const targetMember = target
    ? await WorkspaceMemberModel.findOne({
        where: { workspaceId: target.workspaceId, userId: actorId },
      })
    : null;
  // Unknown target and target in a Workspace the actor is not in look the same.
  if (!target || !targetMember) {
    throw new Error(
      'FORBIDDEN: Task tujuan harus berada di Workspace tempat Anda menjadi anggota aktif.',
    );
  }
  try {
    const relation = await sequelize.transaction(async (transaction) => {
      const created = await TaskRelationModel.create(
        {
          workspaceId,
          sourceTaskId: taskId,
          targetTaskId: target.id,
          type: input.type,
          createdBy: actorId,
        },
        { transaction },
      );
      await logActivity(
        workspaceId,
        taskId,
        actorId,
        `${source.parentTaskId ? 'subtask.' : 'task.'}relation_added`,
        { relationId: created.id, type: input.type, targetTaskId: target.id },
        transaction,
      );
      return created;
    });
    const roles = await loadActorRoles(actorId);
    const described = await describeTasksFor(actorId, roles, [target]);
    return {
      id: relation.id,
      type: relation.type,
      direction: 'outgoing',
      other: described.get(target.id)!,
      createdAt: relation.createdAt.toISOString(),
      canDelete: true,
    };
  } catch (error) {
    if (error instanceof UniqueConstraintError) {
      throw new Error('CONFLICT: Relasi ini sudah ada.', { cause: error });
    }
    throw error;
  }
}

export async function deleteTaskRelation(
  workspaceId: string,
  taskId: string,
  relationId: string,
  actorId: string,
) {
  const task = await requireTask(workspaceId, taskId);
  const relation = await TaskRelationModel.findOne({
    where: { id: relationId, [Op.or]: [{ sourceTaskId: taskId }, { targetTaskId: taskId }] },
  });
  if (!relation) throw new Error('NOT_FOUND: Relasi tidak ditemukan.');
  if (relation.workspaceId !== workspaceId) {
    throw new Error('FORBIDDEN: Relasi hanya dapat dihapus dari Workspace task sumbernya.');
  }
  await sequelize.transaction(async (transaction) => {
    await relation.destroy({ transaction });
    await logActivity(
      workspaceId,
      relation.sourceTaskId,
      actorId,
      `${task.parentTaskId ? 'subtask.' : 'task.'}relation_removed`,
      { relationId, type: relation.type, targetTaskId: relation.targetTaskId },
      transaction,
    );
  });
}
