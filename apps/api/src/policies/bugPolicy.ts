import type { BugStatus, UpdateBugInput, WorkspaceRole } from '@qlick/contracts';

const bugManagers: readonly WorkspaceRole[] = ['owner', 'admin', 'qa'];

export function assertCanReadBug(role: WorkspaceRole, actorId: string, assigneeId: string): void {
  if (role !== 'dev' || assigneeId === actorId) return;
  throw new Error('FORBIDDEN: Developers can only access Bugs assigned to them.');
}

export function assertCanCreateBug(role: WorkspaceRole): void {
  if (bugManagers.includes(role)) return;
  throw new Error('FORBIDDEN: Only Owner, Admin, or QA can open Bugs.');
}

export function assertCanUpdateBug(
  role: WorkspaceRole,
  actorId: string,
  assigneeId: string,
  input: UpdateBugInput,
): void {
  if (bugManagers.includes(role)) return;

  if (role === 'dev' && assigneeId === actorId) {
    const changedFields = Object.keys(input).filter(
      (key) => !['workspaceId', 'bugId'].includes(key),
    );
    if (changedFields.every((field) => ['status', 'resolutionNotes'].includes(field))) return;
    throw new Error(
      'FORBIDDEN: Developers can only update status and resolution notes on assigned Bugs.',
    );
  }

  if (role === 'dev') {
    throw new Error('FORBIDDEN: Developers can only work Bugs assigned to them.');
  }
  throw new Error('FORBIDDEN: Product Owners have read-only Bug access.');
}

export function assertBugStatusTransition(
  role: WorkspaceRole,
  currentStatus: BugStatus,
  nextStatus: BugStatus,
): void {
  if (currentStatus === nextStatus) {
    throw new Error('CONFLICT: Bug is already in the requested status.');
  }

  if (role === 'dev') {
    const allowed: Partial<Record<BugStatus, BugStatus[]>> = {
      open: ['in_progress'],
      reopened: ['in_progress'],
      in_progress: ['resolved'],
    };
    if (allowed[currentStatus]?.includes(nextStatus)) return;
    throw new Error(
      `FORBIDDEN: Invalid Developer Bug transition from "${currentStatus}" to "${nextStatus}".`,
    );
  }

  if (bugManagers.includes(role)) {
    const allowed: Partial<Record<BugStatus, BugStatus[]>> = {
      resolved: ['verified', 'reopened'],
      verified: ['reopened'],
    };
    if (allowed[currentStatus]?.includes(nextStatus)) return;
    throw new Error(
      `FORBIDDEN: QA verification policy does not allow transition from "${currentStatus}" to "${nextStatus}".`,
    );
  }

  throw new Error('FORBIDDEN: Product Owners have read-only Bug access.');
}

export function assertCanAddBugEvidence(
  role: WorkspaceRole,
  actorId: string,
  assigneeId: string,
  kind: 'triage' | 'resolution' = 'triage',
): void {
  if (role === 'owner' || role === 'admin') return;
  if (kind === 'triage') {
    if (role === 'qa') return;
    throw new Error('FORBIDDEN: Only QA, Admin, or Owner can attach triage evidence to a Bug.');
  }
  if (kind === 'resolution') {
    if (role === 'dev' && assigneeId === actorId) return;
    throw new Error(
      'FORBIDDEN: Only the assigned Developer, Admin, or Owner can attach resolution evidence to a Bug.',
    );
  }
  throw new Error('FORBIDDEN: You do not have permission to attach evidence to this Bug.');
}
