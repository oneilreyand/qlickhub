import type { Transaction } from 'sequelize';
import { WorkspaceMemberModel } from '../models/workspaceMember.js';
import { WorkspaceMemberSpecialtyModel } from '../models/workspaceMemberSpecialty.js';

/**
 * Looks up the active WorkspaceMember record for `actorId` within `workspaceId`.
 *
 * Throws `FORBIDDEN:` if the user is not a member, allowing callers to rely on the
 * shared `handleError` middleware to map this to a 403 response.
 *
 * @param workspaceId - UUID of the target Workspace.
 * @param actorId     - UUID of the acting user.
 * @param transaction - Optional Sequelize transaction to include in the lookup.
 * @returns           The persisted WorkspaceMemberModel row.
 * @throws            Error with `FORBIDDEN:` prefix when the user is not a member.
 */
export async function requireActiveMember(
  workspaceId: string,
  actorId: string,
  transaction?: Transaction,
): Promise<WorkspaceMemberModel> {
  const membership = await WorkspaceMemberModel.findOne({
    where: { workspaceId, userId: actorId },
    transaction,
  });
  if (!membership) {
    throw new Error('FORBIDDEN: You are not a member of this workspace.');
  }
  return membership;
}

/**
 * Persisted Developer specialties of one membership (ADR-038 claim matching).
 * QA and other roles have none; an unclassified Developer returns an empty list.
 */
export async function listMemberSpecialties(
  membership: WorkspaceMemberModel,
  transaction?: Transaction,
): Promise<string[]> {
  if (membership.role !== 'dev') return [];
  const rows = await WorkspaceMemberSpecialtyModel.findAll({
    where: { workspaceId: membership.workspaceId, workspaceMemberId: membership.id },
    attributes: ['specialty'],
    transaction,
  });
  return rows.map((row) => row.specialty);
}
