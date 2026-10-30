import type { WorkspaceRole } from '@qlick/contracts';
import { isPlanner } from './shared.js';

/** ADR-036 / AC-5.7: only planners (Owner, Admin, PO) write a Feature Spec; every active member reads. */
export function assertCanWriteFeatureSpec(role: WorkspaceRole): void {
  if (isPlanner(role)) return;
  throw new Error('FORBIDDEN: Only a Planner can create or change a Feature Spec.');
}
