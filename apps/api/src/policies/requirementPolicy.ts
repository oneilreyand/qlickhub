import { WorkspaceRole } from '@qlick/contracts';

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
  if (isPlanner(role)) return;
  throw new Error(
    'FORBIDDEN: Only Product Owner, Admin, or Owner can create requirement references.',
  );
}

export function assertCanUpdateRequirement(role: WorkspaceRole): void {
  if (isPlanner(role)) return;
  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner can update requirements.');
}

export function assertCanLinkRequirement(role: WorkspaceRole): void {
  if (isPlanner(role)) return;
  throw new Error(
    'FORBIDDEN: Only Product Owner, Admin, or Owner can link or embed requirement references to this task.',
  );
}
