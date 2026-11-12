import type { WorkspaceRole } from '@qlick/contracts';
import { TaskModel } from '../../../db/models/index.js';
import { assertCanAccessTask } from '../../../policies/taskPolicy.js';

type AccessCheckedTask = {
  id: string;
  parentTaskId?: string | null;
  assigneeId?: string | null;
  reporterId: string;
};

/**
 * Task-level read access (AUTH-013, ADR-043).
 *
 * Planners read every task in the Workspace. A Developer or QA member reads a task only when it
 * is assigned to them, they reported it, or they hold a Subtask under the same Feature. Every
 * task-scoped read must use this single rule instead of re-deriving it.
 */
export async function assertTaskAccessForActor(
  workspaceId: string,
  task: AccessCheckedTask,
  actorId: string,
  actorRole: WorkspaceRole,
): Promise<void> {
  if (actorRole !== 'dev' && actorRole !== 'qa') return;

  const assignedSubtasks = await TaskModel.count({
    where: {
      workspaceId,
      parentTaskId: task.parentTaskId || task.id,
      assigneeId: actorId,
    },
  });

  assertCanAccessTask(actorRole, actorId, task, assignedSubtasks > 0);
}
