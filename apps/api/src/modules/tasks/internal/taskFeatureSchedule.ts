import { Op, type Transaction } from 'sequelize';
import {
  FEATURE_SCHEDULE_CONFLICT_CODE,
  SUBTASK_SCHEDULE_OUT_OF_RANGE_CODE,
  type Task,
  type TaskStatus,
} from '@qlick/contracts';
import { TaskModel } from '../../../db/models/task.js';

export class FeatureScheduleError extends Error {
  readonly code: string;
  constructor(kind: 'feature' | 'subtask', message: string) {
    super(`${kind === 'feature' ? 'CONFLICT' : 'BAD_REQUEST'}: ${message}`);
    this.code =
      kind === 'feature' ? FEATURE_SCHEDULE_CONFLICT_CODE : SUBTASK_SCHEDULE_OUT_OF_RANGE_CODE;
  }
}

type Schedule = { startDate?: string | null; dueDate?: string | null };
const terminal = (status: TaskStatus) => status === 'done' || status === 'canceled';
const outside = (child: Schedule, root: Schedule) =>
  Boolean(
    root.startDate &&
    root.dueDate &&
    child.startDate &&
    child.dueDate &&
    (child.startDate < root.startDate || child.dueDate > root.dueDate),
  );

/** Serialize every schedule writer on its root; always lock the root before a child. */
export async function lockFeatureSchedule(
  workspaceId: string,
  rootId: string,
  transaction: Transaction,
) {
  const root = await TaskModel.findOne({
    where: { id: rootId, workspaceId, parentTaskId: null },
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!root) throw new Error('NOT_FOUND: Parent Feature not found in this workspace.');
  return root;
}

/** Caller owns the transaction/root lock and has already checked authorization and date pairing. */
export async function assertSubtasksWithinFeatureSchedule(
  workspaceId: string,
  root: TaskModel,
  schedule: Schedule,
  transaction: Transaction,
  child?: Schedule & { status: TaskStatus },
) {
  if (child) {
    if (!terminal(child.status) && outside(child, schedule)) {
      throw new FeatureScheduleError(
        'subtask',
        `Jadwal Subtask harus di dalam rentang Feature ${schedule.startDate}–${schedule.dueDate}.`,
      );
    }
    return;
  }
  if (!schedule.startDate || !schedule.dueDate) return;
  const conflicts = await TaskModel.findAll({
    where: {
      workspaceId,
      parentTaskId: root.id,
      status: { [Op.notIn]: ['done', 'canceled'] },
      [Op.or]: [
        { startDate: { [Op.lt]: schedule.startDate } },
        { dueDate: { [Op.gt]: schedule.dueDate } },
      ],
    },
    attributes: ['id', 'title', 'startDate', 'dueDate'],
    order: [['id', 'ASC']],
    transaction,
  });
  if (conflicts.length) {
    throw new FeatureScheduleError(
      'feature',
      `Rentang Feature ${schedule.startDate}–${schedule.dueDate} bertentangan dengan Subtask: ${conflicts.map((c) => `${c.title}: ${c.startDate}–${c.dueDate}`).join('; ')}.`,
    );
  }
}

/** One Workspace-scoped batch per page; legacy metadata is never persisted or computed in React. */
export async function attachFeatureScheduleConstraints(
  workspaceId: string,
  tasks: Task[],
  transaction?: Transaction,
): Promise<Task[]> {
  // Canonical hierarchy is one direct child level, including optional embedded list responses.
  const records = tasks.flatMap((task) => [task, ...(task.subtasks ?? [])]);
  const rootIds = [...new Set(records.flatMap((t) => (t.parentTaskId ? [t.parentTaskId] : [])))];
  if (!rootIds.length) return tasks;
  const roots = await TaskModel.findAll({
    where: { workspaceId, id: { [Op.in]: rootIds }, parentTaskId: null },
    attributes: ['id', 'startDate', 'dueDate'],
    transaction,
  });
  const byId = new Map(roots.map((root) => [root.id, root]));
  function attach(task: Task): Task {
    const decorated = task.subtasks ? { ...task, subtasks: task.subtasks.map(attach) } : task;
    if (!task.parentTaskId) return decorated;
    const root = byId.get(task.parentTaskId);
    // A missing parent is an integrity/access failure, not evidence of an unbounded schedule.
    if (!root) throw new Error('NOT_FOUND: Parent Feature not found in this workspace.');
    const status = terminal(task.status)
      ? 'ignored'
      : !root.startDate || !root.dueDate
        ? 'unbounded'
        : !task.startDate || !task.dueDate
          ? 'unscheduled'
          : outside(task, root)
            ? 'outside'
            : 'within';
    const label =
      status === 'outside'
        ? 'Di luar jadwal Feature'
        : status === 'unbounded'
          ? 'Feature tanpa jadwal'
          : status === 'unscheduled'
            ? 'Subtask tanpa jadwal'
            : status === 'ignored'
              ? 'Subtask selesai/dibatalkan'
              : 'Dalam jadwal Feature';
    return {
      ...decorated,
      featureScheduleConstraint: {
        status,
        label,
        featureStartDate: root.startDate,
        featureDueDate: root.dueDate,
        ...(status === 'outside'
          ? {
              reason: `Jadwal ${task.startDate}–${task.dueDate}; rentang Feature ${root.startDate}–${root.dueDate}. Perbaiki tanggal secara manual.`,
            }
          : {}),
      },
    };
  }
  return tasks.map(attach);
}
