import { WorkspaceRole, UpdateTaskInput, TaskStatus, DeliveryArea } from '@qlick/contracts';

const plannerRoles: readonly WorkspaceRole[] = ['owner', 'admin', 'po'];

export function isPlanner(role: WorkspaceRole): boolean {
  return plannerRoles.includes(role);
}

/**
 * Applies the Work Hub task policy to task / subtask creation.
 * PO, Admin, and Owner can create and assign any parent task or subtask.
 * Users with explicit active task creation permission may create parent tasks.
 * Subtask creation is reserved for PO, Admin, and Owner.
 */
export function assertCanCreateTask(
  role: WorkspaceRole,
  _actorId?: string,
  _assigneeId?: string | null,
  parentTaskId?: string | null,
  hasSpecialPermission?: boolean
): void {
  if (parentTaskId) {
    if (!isPlanner(role)) {
      throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner can create and plan subtasks.');
    }
    return;
  }

  if (isPlanner(role) || hasSpecialPermission) return;

  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner can create tasks.');
}

/**
 * Applies policy to task read/access operations.
 * Planners (owner, admin, po) can access all tasks in the workspace.
 * Non-planners (dev, qa) can access tasks if:
 * 1. The task is assigned to them, OR
 * 2. They are the reporter/creator, OR
 * 3. They are assigned to at least one subtask under the parent task (or sibling subtask).
 */
export function assertCanAccessTask(
  role: WorkspaceRole,
  actorId: string,
  task: {
    id: string;
    parentTaskId?: string | null;
    assigneeId?: string | null;
    reporterId: string;
  },
  hasAssignedSubtask: boolean
): void {
  if (isPlanner(role)) return;

  if (task.assigneeId === actorId || task.reporterId === actorId) return;

  if (hasAssignedSubtask) return;

  throw new Error('FORBIDDEN: You do not have permission to access this task.');
}

/**
 * Applies the Work Hub task policy to field-level mutations on parent tasks and subtasks.
 * Enforces separation of duties (no self-approval for assignees on subtasks).
 */
export function assertCanMutateTask(
  role: WorkspaceRole,
  actorId: string,
  currentTask: {
    parentTaskId?: string | null;
    assigneeId?: string | null;
    status?: TaskStatus;
    deliveryArea?: DeliveryArea | null;
  },
  input: UpdateTaskInput
): void {
  const isSubtask = Boolean(currentTask.parentTaskId);

  // Planners can mutate parent tasks and subtask planning fields
  if (isPlanner(role)) {
    if (isSubtask && input.status !== undefined) {
      // Prevent self-approval even for planners if they are the assignee, unless owner
      if (
        currentTask.status === 'in_review' &&
        input.status === 'done' &&
        currentTask.assigneeId === actorId &&
        role !== 'owner'
      ) {
        throw new Error('FORBIDDEN: Self-approval is not allowed. An independent reviewer or planner must review and approve this subtask.');
      }
    }
    return;
  }

  if (!isSubtask) {
    throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner may update parent tasks.');
  }

  // Subtask non-planner mutation rules
  const planningFieldsRequested =
    input.title !== undefined ||
    input.deliveryArea !== undefined ||
    input.assigneeId !== undefined ||
    input.priority !== undefined ||
    input.startDate !== undefined ||
    input.dueDate !== undefined ||
    input.folderId !== undefined ||
    input.parentTaskId !== undefined;

  if (planningFieldsRequested) {
    throw new Error('FORBIDDEN: Assigned Dev or QA members may update only their own subtask execution status and description.');
  }

  const isAssignee = currentTask.assigneeId && currentTask.assigneeId === actorId;

  // Case 1: Assigned member updating execution
  if (isAssignee) {
    if (input.status !== undefined && input.status !== currentTask.status) {
      const fromStatus = currentTask.status || 'todo';
      const toStatus = input.status;

      // Assignee cannot approve own work
      if (toStatus === 'done') {
        throw new Error('FORBIDDEN: Self-approval is not allowed. An independent reviewer or planner must review and approve this subtask.');
      }

      // Assignee cannot request changes on own review
      if (toStatus === 'changes_requested') {
        throw new Error('FORBIDDEN: Assignees cannot request changes on their own subtask review.');
      }

      // Valid assignee transitions:
      // todo -> in_progress
      // in_progress -> in_review
      // changes_requested -> in_progress
      // done -> in_progress (reopen if needed)
      const validAssigneeTransitions: Record<string, string[]> = {
        todo: ['in_progress', 'in_review'],
        in_progress: ['in_review', 'todo'],
        changes_requested: ['in_progress'],
        done: ['in_progress'],
        canceled: ['in_progress'],
      };

      const allowedTargets = validAssigneeTransitions[fromStatus] || [];
      if (!allowedTargets.includes(toStatus)) {
        throw new Error(`FORBIDDEN: Invalid subtask transition from ${fromStatus} to ${toStatus} for assignee.`);
      }
    }
    return;
  }

  // Case 2: Independent Reviewer (e.g. QA reviewing FE or BE subtask)
  if (
    role === 'qa' &&
    currentTask.status === 'in_review' &&
    (input.status === 'done' || input.status === 'changes_requested') &&
    currentTask.deliveryArea !== 'qa'
  ) {
    return;
  }

  throw new Error('FORBIDDEN: Only Product Owner, Admin, Owner, the assigned member, or an authorized reviewer may update this subtask.');
}

/**
 * Applies policy to task move operations. Moving a parent task updates its subtasks atomically
 * and requires PO/Admin/Owner authorization. Moving subtasks independently is forbidden.
 */
export function assertCanMoveTask(role: WorkspaceRole, isSubtask: boolean): void {
  if (isSubtask) {
    throw new Error('FORBIDDEN: Subtasks cannot be moved independently from their parent task.');
  }

  if (isPlanner(role)) return;

  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner can move parent tasks.');
}

