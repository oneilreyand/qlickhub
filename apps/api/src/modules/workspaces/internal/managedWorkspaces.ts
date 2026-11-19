import { Op, type Transaction } from 'sequelize';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';

/**
 * MEMBER-ACCESS-HUB: Workspaces where the actor is Owner or Admin and that are not archived —
 * the only Workspaces templates and CSV import may grant access to (AUTH-014).
 */
export async function getActiveManagedWorkspaces(
  actorId: string,
  transaction?: Transaction,
): Promise<WorkspaceModel[]> {
  const managed = await WorkspaceMemberModel.findAll({
    where: { userId: actorId, role: { [Op.in]: ['owner', 'admin'] } },
    attributes: ['workspaceId'],
    transaction,
  });
  if (managed.length === 0) {
    throw new Error('FORBIDDEN: Anggota & Akses hanya untuk Owner atau Admin sebuah Workspace.');
  }
  return WorkspaceModel.findAll({
    where: { id: { [Op.in]: managed.map((row) => row.workspaceId) }, archivedAt: null },
    order: [['name', 'ASC']],
    transaction,
  });
}
