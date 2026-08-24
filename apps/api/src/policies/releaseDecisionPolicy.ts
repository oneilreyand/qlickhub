import type { WorkspaceRole } from '@qlick/contracts';

const qaSignOffRoles: readonly WorkspaceRole[] = ['owner', 'admin', 'qa'];
const releaseDecisionRoles: readonly WorkspaceRole[] = ['owner', 'admin', 'po'];

export function assertCanCreateQaSignOff(role: WorkspaceRole): void {
  if (!qaSignOffRoles.includes(role)) {
    throw new Error('FORBIDDEN: Only Owner, Admin, or QA can record QA Sign-off.');
  }
}

export function assertCanCreateReleaseDecision(role: WorkspaceRole): void {
  if (!releaseDecisionRoles.includes(role)) {
    throw new Error(
      'FORBIDDEN: Only Owner, Admin, or Product Owner can record a Release Decision.',
    );
  }
}

export function assertIndependentReleaseDecision(actorId: string, qaSignerId: string): void {
  if (actorId === qaSignerId) {
    throw new Error(
      'FORBIDDEN: The QA signer cannot make the Release Decision for the same certification.',
    );
  }
}
