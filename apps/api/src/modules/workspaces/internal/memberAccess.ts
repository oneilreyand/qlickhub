import { Op, type Transaction } from 'sequelize';
import { sequelize } from '../../../db/sequelize.js';
import { TaskCreationPermissionModel, TaskModel } from '../../../db/models/index.js';
import { WorkspaceMembershipActivityModel } from '../../../db/models/workspaceMembershipActivity.js';
import { emailService } from '../../../services/emailService.js';
import { createPasswordResetToken } from '../../auth/passwordResetToken.js';
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

/**
 * MEMBER-ACCESS-HUB P3 (ADR-046): invitations that are not activated yet (no password set).
 * Both actions only touch Workspaces the actor manages as Owner/Admin where the person is a
 * member; a person outside them is answered like an unknown one (404).
 */
async function pendingInviteScope(
  actorId: string,
  targetUserId: string,
  transaction?: Transaction,
) {
  const managed = await WorkspaceMemberModel.findAll({
    where: { userId: actorId, role: { [Op.in]: ['owner', 'admin'] } },
    attributes: ['workspaceId'],
    transaction,
  });
  if (managed.length === 0) {
    throw new Error('FORBIDDEN: Anggota & Akses hanya untuk Owner atau Admin sebuah Workspace.');
  }
  // Archived Workspaces are read-only, so they are left out.
  const memberships = await WorkspaceMemberModel.findAll({
    where: {
      userId: targetUserId,
      workspaceId: { [Op.in]: managed.map((row) => row.workspaceId) },
    },
    include: [
      {
        model: WorkspaceModel,
        as: 'workspace',
        attributes: ['id', 'name', 'archivedAt'],
        where: { archivedAt: null },
        required: true,
      },
    ],
    transaction,
  });
  const user = memberships.length
    ? await UserModel.findByPk(targetUserId, { transaction, lock: transaction?.LOCK.UPDATE })
    : null;
  if (!user || memberships.length === 0) throw new Error('NOT_FOUND: Undangan tidak ditemukan.');
  if (user.passwordHash) {
    throw new Error(
      'CONFLICT: Akun ini sudah aktif; undangan tidak bisa dikirim ulang atau dibatalkan.',
    );
  }
  return { user, memberships };
}

export async function resendMemberInvitation(actorId: string, targetUserId: string) {
  const { user, memberships } = await sequelize.transaction(async (transaction) => {
    const scope = await pendingInviteScope(actorId, targetUserId, transaction);
    return scope;
  });
  // A fresh token replaces the stored hash, so every earlier link stops working (AC-3.2).
  const reset = createPasswordResetToken();
  user.passwordResetToken = reset.tokenHash;
  user.passwordResetExpiresAt = reset.expiresAt;
  await user.save();
  const actor = await UserModel.findByPk(actorId, { attributes: ['name'] });
  const workspaceNames = memberships
    .map(
      (membership) =>
        (membership as WorkspaceMemberModel & { workspace?: WorkspaceModel }).workspace?.name,
    )
    .filter((name): name is string => Boolean(name));
  await emailService.sendWorkspaceInvitationEmail(
    user.email,
    workspaceNames,
    actor?.name || 'Workspace Admin',
    memberships[0].role,
    reset.token,
  );
  return { userId: user.id, workspaceIds: memberships.map((m) => m.workspaceId) };
}

export async function cancelMemberInvitation(actorId: string, targetUserId: string) {
  return sequelize.transaction(async (transaction) => {
    const { user, memberships } = await pendingInviteScope(actorId, targetUserId, transaction);
    const activeTasks = await TaskModel.count({
      where: {
        assigneeId: targetUserId,
        workspaceId: { [Op.in]: memberships.map((m) => m.workspaceId) },
        status: { [Op.in]: ['todo', 'in_progress', 'in_review', 'changes_requested'] },
      },
      transaction,
    });
    if (activeTasks > 0) {
      throw new Error(
        `CONFLICT: Pindahkan dulu ${activeTasks} task aktif yang ditugaskan ke orang ini sebelum membatalkan undangan.`,
      );
    }
    for (const membership of memberships) {
      await TaskCreationPermissionModel.destroy({
        where: { workspaceId: membership.workspaceId, userId: targetUserId },
        transaction,
      });
      await membership.destroy({ transaction });
      await WorkspaceMembershipActivityModel.create(
        {
          workspaceId: membership.workspaceId,
          actorId,
          targetUserId,
          action: 'member_removed',
          metadata: { removedRole: membership.role, reason: 'invitation_canceled' },
        },
        { transaction },
      );
    }
    // Without any remaining membership the invitation link must stop working too.
    const remaining = await WorkspaceMemberModel.count({
      where: { userId: targetUserId },
      transaction,
    });
    if (remaining === 0) {
      user.passwordResetToken = null;
      user.passwordResetExpiresAt = null;
      await user.save({ transaction });
    }
    return { userId: user.id, workspaceIds: memberships.map((m) => m.workspaceId) };
  });
}
