import type { WorkspaceRole } from '@qlick/contracts';

/**
 * The set of Workspace roles that carry planner authority.
 * Planners can create, edit, schedule, and publish tasks, requirements,
 * test cases, and release decisions.
 */
export const PLANNER_ROLES: readonly WorkspaceRole[] = ['owner', 'admin', 'po'];

/**
 * Returns true when `role` has planner authority.
 *
 * Canonical definition — do not redeclare isPlanner in individual policy files.
 * Import from here:
 *   import { isPlanner } from '../policies/shared.js';
 */
export function isPlanner(role: WorkspaceRole): boolean {
  return PLANNER_ROLES.includes(role);
}
