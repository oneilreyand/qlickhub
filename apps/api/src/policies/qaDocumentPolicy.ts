import { WorkspaceRole } from '@qlick/contracts';
import { isPlanner } from './shared.js';

export { isPlanner };

export function assertCanReadQaDocuments(role: WorkspaceRole): void {
  if (!role) {
    throw new Error('FORBIDDEN: You must be a workspace member to view QA documents.');
  }
}

export function assertCanCreateQaDocument(role: WorkspaceRole): void {
  if (role === 'owner' || role === 'admin' || role === 'qa') return;
  throw new Error('FORBIDDEN: Only QA Engineer, Admin, or Owner members can create or edit QA documents.');
}

export function assertCanManageProductBrief(role: WorkspaceRole): void {
  if (isPlanner(role)) return;
  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner members can create or update a Product Brief.');
}

export function assertCanLinkQaDocument(
  role: WorkspaceRole,
  actorId: string,
  task: {
    parentTaskId?: string | null;
    assigneeId?: string | null;
  }
): void {
  if (role === 'owner' || role === 'admin') return;

  const isSubtask = Boolean(task.parentTaskId);

  if (isSubtask) {
    if (role === 'qa' || (task.assigneeId && task.assigneeId === actorId)) return;
    throw new Error('FORBIDDEN: Only QA members or project administrators can link QA documents to subtasks.');
  }

  if (role === 'qa') {
    return;
  }

  throw new Error('FORBIDDEN: Only QA Engineer, Admin, or Owner members can link QA documents to this task.');
}
