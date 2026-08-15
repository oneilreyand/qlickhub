import { WorkspaceRole } from '@qa/contracts';

const plannerRoles: readonly WorkspaceRole[] = ['owner', 'admin', 'po'];

export function isPlanner(role: WorkspaceRole): boolean {
  return plannerRoles.includes(role);
}

export function assertCanReadRequirements(role: WorkspaceRole): void {
  if (!role) {
    throw new Error('FORBIDDEN: You must be a workspace member to view requirements.');
  }
}

export function assertCanCreateRequirement(role: WorkspaceRole): void {
  if (isPlanner(role) || role === 'qa') return;
  throw new Error('FORBIDDEN: Only Product Owner, Admin, Owner, or QA members can create requirements.');
}

export function assertCanLinkRequirement(
  role: WorkspaceRole,
  actorId: string,
  task: {
    parentTaskId?: string | null;
    assigneeId?: string | null;
  },
  allowQaTaskCreation: boolean = true
): void {
  if (isPlanner(role)) return;

  const isSubtask = Boolean(task.parentTaskId);

  if (isSubtask) {
    if (task.assigneeId && task.assigneeId === actorId) return;
    throw new Error('FORBIDDEN: Only assigned members or project planners can link requirements to subtasks.');
  }

  if (role === 'qa') {
    if (allowQaTaskCreation) return;
    if (!task.assigneeId || task.assigneeId === actorId) return;
    throw new Error('FORBIDDEN: QA members may link requirements only to their own or unassigned tasks.');
  }

  throw new Error('FORBIDDEN: You do not have permission to link requirements to this task.');
}
