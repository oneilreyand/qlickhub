import { AttachmentCategory, WorkspaceRole } from '@qlick/contracts';

const plannerRoles: readonly WorkspaceRole[] = ['owner', 'admin', 'po'];

export function isPlanner(role: WorkspaceRole): boolean {
  return plannerRoles.includes(role);
}

export function assertCanReadAttachments(role: WorkspaceRole): void {
  // All workspace members can read/list/download task attachments in their workspace
  if (!role) {
    throw new Error('FORBIDDEN: You must be a workspace member to view attachments.');
  }
}

export function assertCanUploadAttachment(
  role: WorkspaceRole,
  actorId: string,
  task: {
    parentTaskId?: string | null;
    assigneeId?: string | null;
  },
  allowQaTaskCreation: boolean = true,
): void {
  if (isPlanner(role)) return;

  const isSubtask = Boolean(task.parentTaskId);

  if (isSubtask) {
    if (task.assigneeId && task.assigneeId === actorId) return;
    throw new Error(
      'FORBIDDEN: Only assigned members or project planners can upload subtask evidence.',
    );
  }

  if (role === 'qa') {
    if (allowQaTaskCreation) return;
    if (!task.assigneeId || task.assigneeId === actorId) return;
    throw new Error(
      'FORBIDDEN: QA members may upload evidence only to their own or unassigned tasks.',
    );
  }

  throw new Error(
    'FORBIDDEN: Only Product Owner, Admin, Owner, or QA members can upload evidence to parent tasks.',
  );
}

export function assertCanDeleteAttachment(
  role: WorkspaceRole,
  actorId: string,
  attachment: {
    uploaderId: string;
    category: AttachmentCategory;
    isLinkedToTestResult: boolean;
  },
): void {
  if (attachment.category === 'qa_evidence' || attachment.isLinkedToTestResult) {
    throw new Error(
      'CONFLICT: Formal QA evidence is immutable and cannot be deleted. Upload a replacement attachment instead.',
    );
  }

  if (isPlanner(role)) return;

  if (attachment.uploaderId === actorId) return;

  throw new Error(
    'FORBIDDEN: Only Product Owner, Admin, Owner, or the original uploader can delete this attachment.',
  );
}
