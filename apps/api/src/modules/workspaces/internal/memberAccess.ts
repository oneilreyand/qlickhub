import { Op } from 'sequelize';
import type { MemberAccessOverview, MemberAccessPerson } from '@qlick/contracts';
import { UserModel } from '../../../db/models/user.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { WorkspaceMemberSpecialtyModel } from '../../../db/models/workspaceMemberSpecialty.js';
import { specialtyValues } from './workspaceMembership.js';

/**
 * MEMBER-ACCESS-HUB P1 (ADR-046): who has access to which Workspace, limited to the Workspaces
 * where the actor is Owner or Admin. Three bounded queries, no per-row lookups.
 */
export async function getMemberAccessOverview(actorId: string): Promise<MemberAccessOverview> {
  const managed = await WorkspaceMemberModel.findAll({
    where: { userId: actorId, role: { [Op.in]: ['owner', 'admin'] } },
    attributes: ['workspaceId', 'role'],
  });
  if (managed.length === 0) {
    throw new Error('FORBIDDEN: Anggota & Akses hanya untuk Owner atau Admin sebuah Workspace.');
  }
  const managedIds = managed.map((row) => row.workspaceId);
  const actorRoleByWorkspace = new Map(managed.map((row) => [row.workspaceId, row.role]));

  const [workspaces, memberships] = await Promise.all([
    WorkspaceModel.findAll({
      where: { id: { [Op.in]: managedIds } },
      attributes: ['id', 'name', 'archivedAt'],
      order: [['name', 'ASC']],
    }),
    WorkspaceMemberModel.findAll({
      where: { workspaceId: { [Op.in]: managedIds } },
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: ['id', 'email', 'name', 'avatarUrl', 'passwordHash'],
        },
        {
          model: WorkspaceMemberSpecialtyModel,
          as: 'specialties',
          attributes: ['specialty'],
          required: false,
        },
      ],
      order: [['createdAt', 'ASC']],
    }),
  ]);

  const people = new Map<string, MemberAccessPerson>();
  const counts = new Map<string, number>();
  for (const membership of memberships) {
    const user = (membership as unknown as { user?: UserModel }).user;
    if (!user) continue;
    counts.set(membership.workspaceId, (counts.get(membership.workspaceId) ?? 0) + 1);
    const person =
      people.get(user.id) ??
      ({
        userId: user.id,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl ?? null,
        activation: user.passwordHash ? 'active' : 'pending',
        memberships: [],
      } satisfies MemberAccessPerson);
    person.memberships.push({
      workspaceId: membership.workspaceId,
      role: membership.role,
      specialties: specialtyValues(membership),
      joinedAt: new Date(membership.joinedAt).toISOString(),
    });
    people.set(user.id, person);
  }

  return {
    workspaces: workspaces.map((workspace) => ({
      id: workspace.id,
      name: workspace.name,
      actorRole: actorRoleByWorkspace.get(workspace.id) === 'owner' ? 'owner' : 'admin',
      archived: Boolean(workspace.archivedAt),
      memberCount: counts.get(workspace.id) ?? 0,
    })),
    people: [...people.values()].sort((a, b) => a.name.localeCompare(b.name, 'id')),
  };
}
