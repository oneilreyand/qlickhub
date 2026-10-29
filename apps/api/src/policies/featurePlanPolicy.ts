import type { WorkspaceRole } from '@qlick/contracts';
import { isPlanner } from './shared.js';

/**
 * P5a-1 (AC-5.5): hanya planner (Owner, Admin, Product Owner) yang menulis Plan.
 * Developer dan QA hanya membaca. Tidak ada jalur izin khusus untuk Plan.
 */
export function assertCanWriteFeaturePlan(role: WorkspaceRole): void {
  if (isPlanner(role)) return;
  throw new Error('FORBIDDEN: Only Product Owner, Admin, or Owner can create or change a Plan.');
}
