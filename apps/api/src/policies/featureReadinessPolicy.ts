import type { WorkspaceRole } from '@qlick/contracts';
import type { RequirementFindingTriageGroup } from '@qlick/contracts';

export function triageGroupForRole(role: WorkspaceRole): RequirementFindingTriageGroup {
  if (role === 'dev') return 'development';
  if (role === 'qa') return 'qa';
  return 'product';
}

export function assertCanGovernRequirementFindingDispute(role: WorkspaceRole): void {
  if (role === 'owner' || role === 'admin') return;
  throw new Error(
    'FORBIDDEN: Only an active Workspace Owner or Admin can record a disputed triage classification.',
  );
}

export function assertCanResolveRequirementFinding(role: WorkspaceRole): void {
  if (['owner', 'admin', 'po'].includes(role)) return;
  throw new Error('FORBIDDEN: Only a Planner can resolve or reopen a Requirement finding.');
}

export function assertCanSubmitFeatureReadinessReview(
  role: WorkspaceRole,
  assignedReviewRole: 'dev' | 'qa' | null,
): asserts assignedReviewRole is 'dev' | 'qa' {
  if (!assignedReviewRole || role !== assignedReviewRole) {
    throw new Error(
      'FORBIDDEN: Readiness input requires assignment to a matching Development or QA Subtask on this Feature.',
    );
  }
}

export function assertCanEstablishFeatureReadinessBaseline(role: WorkspaceRole): void {
  if (['owner', 'admin', 'po'].includes(role)) return;
  throw new Error('FORBIDDEN: Only a Planner can establish a Feature readiness baseline.');
}

export function assertCanOverrideFeatureReadiness(role: WorkspaceRole): void {
  if (['owner', 'admin'].includes(role)) return;
  throw new Error(
    'FORBIDDEN: Only an active Workspace Owner or Admin can create an emergency readiness exception.',
  );
}
