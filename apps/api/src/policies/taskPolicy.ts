import { WorkspaceRole, UpdateTaskInput } from '@qa/contracts';

const plannerRoles: readonly WorkspaceRole[] = ['owner', 'admin', 'po'];

export function isPlanner(role: WorkspaceRole): boolean {
  return plannerRoles.includes(role);
}

/**
 * Applies the Work Hub task policy to task / subtask creation.
 * PO, Admin, and Owner can create and assign any parent task or subtask.
 * QA members can create unassigned parent tasks or parent tasks assigned to themselves.
 * Subtask creation is reserved for PO, Admin, and Owner.
 */
export function assertCanCreateTask(
  role: WorkspaceRole,
  actorId: string,
  assigneeId: string | null | undefined,
  parentTaskId?: string | null,
  allowQaTaskCreation: boolean = true
): void {
  if (parentTaskId) {
    if (!isPlanner(role)) {
      throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner can create and plan subtasks.');
    }
    return;
  }

  if (isPlanner(role)) return;

  if (role === 'qa') {
    if (allowQaTaskCreation) return;
    if (!assigneeId || assigneeId === actorId) return;
    throw new Error('FORBIDDEN: QA members may assign new tasks only to themselves or leave them unassigned when approval is required.');
  }

  throw new Error('FORBIDDEN: Your workspace role cannot create parent tasks.');
}

/**
 * Applies the Work Hub task policy to field-level mutations on parent tasks and subtasks.
 */
export function assertCanMutateTask(
  role: WorkspaceRole,
  actorId: string,
  currentTask: {
    parentTaskId?: string | null;
    assigneeId?: string | null;
  },
  input: UpdateTaskInput
): void {
  if (isPlanner(role)) return;

  const isSubtask = Boolean(currentTask.parentTaskId);

  if (isSubtask) {
    // Assigned Dev or QA can update execution status/description of their own subtask
    if (currentTask.assigneeId && currentTask.assigneeId === actorId) {
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
      return;
    }

    throw new Error('FORBIDDEN: Only Product Owner, Admin, Owner, or the assigned member may update this subtask.');
  }

  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner may update parent tasks.');
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
