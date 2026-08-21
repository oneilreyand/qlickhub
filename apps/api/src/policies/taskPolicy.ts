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
 * Enforces strict transition maps, planning field protection, and separation of duties.
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
  const currentStatus = currentTask.status || 'todo';

  // Planners (Product Owner, Admin, Owner) have full management rights across tasks & subtasks
  if (isPlanner(role)) {
    if (isSubtask && input.status !== undefined && input.status !== currentStatus) {
      // Prevent self-approval even for planners if they are the assignee, unless owner
      if (
        currentStatus === 'in_review' &&
        input.status === 'done' &&
        currentTask.assigneeId === actorId &&
        role !== 'owner'
      ) {
        throw new Error('FORBIDDEN: Self-approval is not allowed. An independent reviewer or planner must review and approve this subtask.');
      }
    }
    return;
  }

  // Developer role (FE / BE / Mobile / Fullstack executor)
  if (role === 'dev') {
    if (!isSubtask) {
      throw new Error('FORBIDDEN: Developers cannot modify parent tasks. Only assigned subtasks can be updated.');
    }
    if (currentTask.assigneeId !== actorId) {
      throw new Error('FORBIDDEN: Developers can only update subtasks assigned to them.');
    }

    // Check forbidden planning field changes for developers
    if (
      input.title !== undefined ||
      input.assigneeId !== undefined ||
      input.priority !== undefined ||
      input.deliveryArea !== undefined ||
      input.folderId !== undefined ||
      input.parentTaskId !== undefined ||
      input.startDate !== undefined ||
      input.dueDate !== undefined
    ) {
      throw new Error('FORBIDDEN: Developers cannot modify subtask planning fields (title, assignee, priority, delivery area, folder, or schedule dates).');
    }

    // Status transition map validation for developer
    if (input.status !== undefined && input.status !== currentStatus) {
      if (input.status === 'done') {
        throw new Error('FORBIDDEN: Developers cannot mark subtasks as Done directly. Please submit for QA review instead.');
      }

      const validDevTransitions: Record<string, TaskStatus[]> = {
        todo: ['in_progress'],
        in_progress: ['in_review'],
        changes_requested: ['in_progress'],
      };

      const allowedTargets = validDevTransitions[currentStatus] || [];
      if (!allowedTargets.includes(input.status)) {
        throw new Error(`FORBIDDEN: Invalid status transition for developer from "${currentStatus}" to "${input.status}".`);
      }
    }

    return;
  }

  // QA role (Quality Assurance executor & reviewer)
  if (role === 'qa') {
    if (!isSubtask) {
      throw new Error('FORBIDDEN: QA members cannot modify parent tasks.');
    }

    // Check forbidden planning field changes for QA
    if (
      input.title !== undefined ||
      input.assigneeId !== undefined ||
      input.priority !== undefined ||
      input.deliveryArea !== undefined ||
      input.folderId !== undefined ||
      input.parentTaskId !== undefined ||
      input.startDate !== undefined ||
      input.dueDate !== undefined
    ) {
      throw new Error('FORBIDDEN: QA members cannot modify subtask planning fields (title, assignee, priority, delivery area, folder, or schedule dates).');
    }

    const isAssignedQaExecutor = currentTask.deliveryArea === 'qa' && currentTask.assigneeId === actorId;
    const isReviewingInReviewSubtask = currentStatus === 'in_review';

    if (currentTask.deliveryArea === 'qa' && currentTask.assigneeId !== actorId && !isReviewingInReviewSubtask) {
      throw new Error('FORBIDDEN: QA members cannot execute QA subtasks assigned to other members.');
    }

    if (!isAssignedQaExecutor && !isReviewingInReviewSubtask) {
      throw new Error('FORBIDDEN: QA members can only review subtasks in review or execute QA subtasks assigned to them.');
    }

    // Transition map for QA
    if (input.status !== undefined && input.status !== currentStatus) {
      if (isReviewingInReviewSubtask) {
        // QA reviewing subtask in review (from any delivery area)
        if (!['changes_requested', 'done'].includes(input.status)) {
          throw new Error(`FORBIDDEN: QA reviewers can only transition subtasks in review to "changes_requested" or "done".`);
        }
        if (input.status === 'changes_requested' && (!input.reviewNotes || !input.reviewNotes.trim())) {
          throw new Error('BAD_REQUEST: Review notes are required when requesting changes.');
        }
      } else if (isAssignedQaExecutor) {
        // QA executing own QA subtask
        const validQaExecutionTransitions: Record<string, TaskStatus[]> = {
          todo: ['in_progress'],
          in_progress: ['done'],
          changes_requested: ['in_progress'],
        };
        const allowedTargets = validQaExecutionTransitions[currentStatus] || [];
        if (!allowedTargets.includes(input.status)) {
          throw new Error(`FORBIDDEN: Invalid status transition for QA executor from "${currentStatus}" to "${input.status}".`);
        }
      }
    }

    return;
  }

  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner may update task details.');
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
