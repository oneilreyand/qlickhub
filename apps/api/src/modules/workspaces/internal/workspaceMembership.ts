import { sequelize } from '../../../db/sequelize.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';
import { TaskCreationPermissionModel } from '../../../db/models/taskCreationPermission.js';
import { WorkspaceMembershipActivityModel } from '../../../db/models/workspaceMembershipActivity.js';
import { WorkspaceMemberSpecialtyModel } from '../../../db/models/workspaceMemberSpecialty.js';
import { TaskModel } from '../../../db/models/task.js';
import { BugModel } from '../../../db/models/bug.js';
import { Op, type Transaction } from 'sequelize';
import {
  AddWorkspaceMemberInput,
  AssignableWorkspaceRole,
  DeveloperSpecialty,
  UpdateMemberRoleInput,
} from '@qlick/contracts';
import { emailService } from '../../../services/emailService.js';
import { fcmService } from '../../../services/fcmService.js';
import { createPasswordResetToken } from '../../auth/passwordResetToken.js';

export function specialtyValues(member: WorkspaceMemberModel): DeveloperSpecialty[] {
  const rows =
    (member as unknown as { specialties?: WorkspaceMemberSpecialtyModel[] }).specialties || [];
  return rows.map((row) => row.specialty).sort();
}

export async function replaceSpecialties(
  workspaceId: string,
  member: WorkspaceMemberModel,
  specialties: DeveloperSpecialty[],
  actorId: string,
  transaction: Transaction,
) {
  await WorkspaceMemberSpecialtyModel.destroy({
    where: { workspaceId, workspaceMemberId: member.id },
    transaction,
  });
  if (member.role === 'dev' && specialties.length > 0) {
    await WorkspaceMemberSpecialtyModel.bulkCreate(
      [...new Set(specialties)].map((specialty) => ({
        workspaceId,
        workspaceMemberId: member.id,
        specialty,
        createdBy: actorId,
      })),
      { transaction },
    );
  }
}

export async function getWorkspaceMembers(workspaceId: string) {
  const members = await WorkspaceMemberModel.findAll({
    where: { workspaceId },
    include: [
      {
        model: UserModel,
        as: 'user',
        attributes: ['id', 'email', 'name', 'avatarUrl', 'role'],
      },
      {
        model: WorkspaceMemberSpecialtyModel,
        as: 'specialties',
        attributes: ['specialty'],
        required: false,
      },
    ],
    order: [['createdAt', 'ASC']],
  });

  return members.map((m) => {
    const item = m as unknown as { user?: UserModel };
    const u = item.user;
    return {
      id: m.id,
      workspaceId: m.workspaceId,
      userId: m.userId,
      role: m.role,
      specialties: specialtyValues(m),
      joinedAt: m.joinedAt,
      user: u
        ? {
            id: u.id,
            email: u.email,
            name: u.name,
            avatarUrl: u.avatarUrl,
          }
        : undefined,
    };
  });
}

export async function addWorkspaceMember(
  workspaceId: string,
  input: AddWorkspaceMemberInput,
  actorId?: string,
) {
  if ((input as { role?: string }).role === 'owner') {
    throw new Error('FORBIDDEN: Assigning the owner role requires an ownership transfer.');
  }

  const normalizedEmail = input.email.trim().toLowerCase();
  let user = await UserModel.findOne({
    where: { email: { [Op.iLike]: normalizedEmail } },
    paranoid: false,
  });

  const targetWorkspaceIds = Array.from(new Set([workspaceId, ...(input.workspaceIds || [])]));

  const targetWorkspaces = await WorkspaceModel.findAll({
    where: { id: targetWorkspaceIds },
  });
  if (targetWorkspaces.length !== targetWorkspaceIds.length) {
    throw new Error('NOT_FOUND: One or more selected Workspaces do not exist.');
  }

  if (actorId) {
    const actorMemberships = await WorkspaceMemberModel.findAll({
      where: {
        workspaceId: targetWorkspaceIds,
        userId: actorId,
        role: { [Op.in]: ['owner', 'admin'] },
      },
      attributes: ['workspaceId'],
    });
    const authorizedWorkspaceIds = new Set(
      actorMemberships.map((membership) => membership.workspaceId),
    );
    const unauthorizedWorkspaceIds = targetWorkspaceIds.filter(
      (id) => !authorizedWorkspaceIds.has(id),
    );
    if (unauthorizedWorkspaceIds.length > 0) {
      throw new Error('FORBIDDEN: Owner or Admin access is required for every selected Workspace.');
    }
  }

  let setPasswordToken: string | undefined;
  if (user?.deletedAt) {
    await user.restore();
  }

  if (!user) {
    const reset = createPasswordResetToken();
    user = await UserModel.create({
      email: normalizedEmail,
      name: normalizedEmail.split('@')[0],
      role: input.role || 'dev',
      passwordHash: null,
      passwordResetToken: reset.tokenHash,
      passwordResetExpiresAt: reset.expiresAt,
    });
    setPasswordToken = reset.token;
  } else if (!user.passwordHash) {
    const reset = createPasswordResetToken();
    user.passwordResetToken = reset.tokenHash;
    user.passwordResetExpiresAt = reset.expiresAt;
    await user.save();
    setPasswordToken = reset.token;
  }

  let primaryMember: WorkspaceMemberModel | null = null;
  const addedWorkspaceNames: string[] = [];

  for (const ws of targetWorkspaces) {
    const result = await sequelize.transaction(async (transaction) => {
      const specialtyActorId = actorId || ws.ownerId;
      const existingMember = await WorkspaceMemberModel.findOne({
        where: { workspaceId: ws.id, userId: user.id },
        paranoid: false,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!existingMember) {
        const member = await WorkspaceMemberModel.create(
          {
            workspaceId: ws.id,
            userId: user.id,
            role: input.role || 'dev',
          },
          { transaction },
        );
        await replaceSpecialties(ws.id, member, input.specialties, specialtyActorId, transaction);
        return { member, added: true };
      }

      if (existingMember.deletedAt) {
        const previousRole = existingMember.role;
        await existingMember.restore({ transaction });
        existingMember.role = input.role || 'dev';
        existingMember.joinedAt = new Date();
        await existingMember.save({ transaction });
        await replaceSpecialties(
          ws.id,
          existingMember,
          input.specialties,
          specialtyActorId,
          transaction,
        );

        if (actorId) {
          await WorkspaceMembershipActivityModel.create(
            {
              workspaceId: ws.id,
              actorId,
              targetUserId: user.id,
              action: 'member_restored',
              metadata: {
                previousRole,
                restoredRole: existingMember.role,
                specialties: input.specialties,
              },
            },
            { transaction },
          );
        }

        return { member: existingMember, added: true };
      }

      return { member: existingMember, added: false };
    });

    if (ws.id === workspaceId) {
      primaryMember = result.member;
    }
    if (result.added) {
      addedWorkspaceNames.push(ws.name);
    }
  }

  if (addedWorkspaceNames.length === 0) {
    throw new Error('CONFLICT: User is already a member of all selected workspaces.');
  }

  if (!primaryMember) {
    primaryMember = (await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: user.id },
    })) as WorkspaceMemberModel;
  }

  // Send zero-cost invitation notification email if workspaces were added
  if (addedWorkspaceNames.length > 0) {
    let inviterName = 'Workspace Admin';
    if (actorId) {
      const actor = await UserModel.findByPk(actorId);
      if (actor) inviterName = actor.name;
    }
    await emailService.sendWorkspaceInvitationEmail(
      user.email,
      addedWorkspaceNames,
      inviterName,
      input.role || 'dev',
      setPasswordToken,
    );

    fcmService
      .sendWorkspaceMembershipNotification({
        userId: user.id,
        actorName: inviterName,
        actorId: actorId || user.id,
        workspaceName: addedWorkspaceNames.join(', '),
        workspaceId,
        action: 'added',
        newRole: input.role || 'dev',
      })
      .catch((err) => console.warn('⚠️ Failed to dispatch workspace member notification:', err));
  }

  return {
    id: primaryMember?.id || 'batch-assignment',
    workspaceId,
    userId: user.id,
    role: primaryMember?.role || input.role || 'dev',
    specialties: input.role === 'dev' ? input.specialties : [],
    joinedAt: primaryMember?.joinedAt
      ? primaryMember.joinedAt.toISOString()
      : new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
  };
}

export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  input: AssignableWorkspaceRole | UpdateMemberRoleInput,
  actorId?: string,
) {
  const requestedRole = typeof input === 'string' ? input : input.role;
  const requestedSpecialties = typeof input === 'string' ? undefined : input.specialties;

  return sequelize.transaction(async (transaction) => {
    const workspace = await WorkspaceModel.findByPk(workspaceId, { transaction });
    if (!workspace) throw new Error('NOT_FOUND: Workspace not found');
    if (targetUserId === workspace.ownerId) {
      throw new Error(
        'FORBIDDEN: The workspace owner role cannot be changed. Transfer ownership first.',
      );
    }
    if ((requestedRole as string) === 'owner') {
      throw new Error('FORBIDDEN: Assigning the owner role requires an ownership transfer.');
    }

    const member = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: targetUserId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!member) throw new Error('NOT_FOUND: Member not found in workspace.');

    const previousRole = member.role;
    const previousSpecialtyRows = await WorkspaceMemberSpecialtyModel.findAll({
      where: { workspaceId, workspaceMemberId: member.id },
      transaction,
    });
    const previousSpecialties = previousSpecialtyRows.map((row) => row.specialty).sort();
    const nextSpecialties =
      requestedRole === 'dev'
        ? [...new Set(requestedSpecialties ?? previousSpecialties)].sort()
        : [];

    const activeDevelopmentTasks = await TaskModel.findAll({
      where: {
        workspaceId,
        assigneeId: targetUserId,
        parentTaskId: { [Op.ne]: null },
        deliveryArea: { [Op.in]: ['frontend', 'backend', 'mobile', 'fullstack'] },
        status: { [Op.in]: ['todo', 'in_progress', 'in_review', 'changes_requested'] },
      },
      attributes: ['id', 'title', 'deliveryArea'],
      transaction,
    });
    if (requestedRole === 'qa' || requestedRole === 'dev') {
      const unsupported = activeDevelopmentTasks.filter(
        (task) =>
          requestedRole !== 'dev' ||
          !task.deliveryArea ||
          !nextSpecialties.includes(task.deliveryArea as DeveloperSpecialty),
      );
      if (unsupported.length > 0) {
        throw new Error(
          `CONFLICT: Reassign active development work before removing its role or specialty: ${unsupported
            .map((task) => `"${task.title}" (${task.deliveryArea})`)
            .join(', ')}.`,
        );
      }
    }

    member.role = requestedRole;
    await member.save({ transaction });
    await replaceSpecialties(
      workspaceId,
      member,
      nextSpecialties,
      actorId || workspace.ownerId,
      transaction,
    );

    if (previousRole !== requestedRole) {
      await WorkspaceMembershipActivityModel.create(
        {
          workspaceId,
          actorId: actorId || workspace.ownerId,
          targetUserId,
          action: 'member_role_updated',
          metadata: { previousRole, newRole: requestedRole },
        },
        { transaction },
      );

      UserModel.findByPk(actorId || workspace.ownerId)
        .then((actor) => {
          const actorName = actor?.name || 'Workspace Admin';
          fcmService
            .sendWorkspaceMembershipNotification({
              userId: targetUserId,
              actorName,
              actorId: actorId || workspace.ownerId,
              workspaceName: workspace.name,
              workspaceId,
              action: 'role_updated',
              newRole: requestedRole,
            })
            .catch((err) => console.warn('⚠️ Failed to dispatch role update notification:', err));
        })
        .catch(() => {});
    }
    if (previousSpecialties.join(',') !== nextSpecialties.join(',')) {
      await WorkspaceMembershipActivityModel.create(
        {
          workspaceId,
          actorId: actorId || workspace.ownerId,
          targetUserId,
          action: 'member_specialties_updated',
          metadata: { previousSpecialties, newSpecialties: nextSpecialties },
        },
        { transaction },
      );
    }

    return { ...member.toJSON(), specialties: nextSpecialties };
  });
}

export async function removeWorkspaceMember(
  workspaceId: string,
  targetUserId: string,
  actorId: string,
) {
  return await sequelize.transaction(async (transaction) => {
    const workspace = await WorkspaceModel.findByPk(workspaceId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!workspace) {
      throw new Error('NOT_FOUND: Workspace not found');
    }

    const actorMembership = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: actorId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!actorMembership || !['owner', 'admin'].includes(actorMembership.role)) {
      throw new Error('FORBIDDEN: Only an active Workspace Owner or Admin may remove members.');
    }

    const targetMembership = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: targetUserId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!targetMembership) {
      throw new Error('NOT_FOUND: Member not found in workspace.');
    }

    if (workspace.ownerId === targetUserId || targetMembership.role === 'owner') {
      throw new Error(
        'FORBIDDEN: Cannot remove the owner of the workspace. Transfer ownership first.',
      );
    }

    if (actorMembership.role === 'admin' && targetMembership.role === 'admin') {
      throw new Error(
        'FORBIDDEN: Workspace Admins cannot remove another Admin. Only the Owner may do that.',
      );
    }

    const [activeTaskCount, activeBugCount] = await Promise.all([
      TaskModel.count({
        where: {
          workspaceId,
          assigneeId: targetUserId,
          status: { [Op.in]: ['todo', 'in_progress', 'in_review', 'changes_requested'] },
        },
        transaction,
      }),
      BugModel.count({
        where: {
          workspaceId,
          assigneeId: targetUserId,
          status: { [Op.in]: ['open', 'in_progress', 'resolved', 'reopened'] },
        },
        transaction,
      }),
    ]);

    if (activeTaskCount > 0 || activeBugCount > 0) {
      throw new Error(
        `CONFLICT: Reassign or complete this member's active work before removal (${activeTaskCount} Task assignment(s), ${activeBugCount} Bug assignment(s)).`,
      );
    }

    const revokedTaskCreationPermissions = await TaskCreationPermissionModel.destroy({
      where: { workspaceId, userId: targetUserId },
      transaction,
    });

    await targetMembership.destroy({ transaction });
    await WorkspaceMembershipActivityModel.create(
      {
        workspaceId,
        actorId,
        targetUserId,
        action: 'member_removed',
        metadata: {
          removedRole: targetMembership.role,
          revokedTaskCreationPermissions,
        },
      },
      { transaction },
    );

    return {
      success: true,
      revokedTaskCreationPermissions,
    };
  });
}
