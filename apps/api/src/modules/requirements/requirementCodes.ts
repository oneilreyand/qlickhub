import { QueryTypes, type Transaction } from 'sequelize';
import { sequelize } from '../../db/sequelize.js';

/**
 * E2E-SDLC-FLOW P5 (K4): Requirements created by Apply get short sequential codes per Workspace
 * (`REQ-001`, `REQ-002`, …) instead of `REQ-<uuid>`. A transaction-scoped advisory lock keyed by
 * the Workspace serializes concurrent Applies so two Features never receive the same number; the
 * `uk_requirements_workspace_code` unique constraint remains the final guard.
 */
export function formatRequirementCode(value: number): string {
  return `REQ-${String(value).padStart(3, '0')}`;
}

export async function nextRequirementCodes(
  workspaceId: string,
  count: number,
  transaction: Transaction,
): Promise<string[]> {
  if (count <= 0) return [];
  await sequelize.query(`SELECT pg_advisory_xact_lock(hashtext(:key))`, {
    replacements: { key: `requirement-code:${workspaceId}` },
    type: QueryTypes.SELECT,
    transaction,
  });
  const [row] = await sequelize.query<{ max: number | null }>(
    `SELECT MAX(substring(code FROM '^REQ-([0-9]{1,9})$')::int) AS max
       FROM requirements
      WHERE workspace_id = :workspaceId AND code ~ '^REQ-[0-9]{1,9}$'`,
    { replacements: { workspaceId }, type: QueryTypes.SELECT, transaction },
  );
  const start = Number(row?.max ?? 0) + 1;
  return Array.from({ length: count }, (_, index) => formatRequirementCode(start + index));
}
