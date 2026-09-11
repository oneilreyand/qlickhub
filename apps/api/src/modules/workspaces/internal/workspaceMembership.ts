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
  WorkspaceMemberAssignment,
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
  const assignments: WorkspaceMemberAssignment[] = input.assignments
    ? input.assignments.map((assignment) => ({
        ...assignment,
        specialties: assignment.specialties || [],
      }))
    : Array.from(new Set([workspaceId, ...(input.workspaceIds || [])])).map(
        (targetWorkspaceId) => ({
          workspaceId: targetWorkspaceId,
          role: input.role || 'dev',
          specialties: input.specialties || [],
        }),
      );

  const mutation = await sequelize.transaction(async (transaction) => {
    const targetWorkspaceIds = assignments.map((assignment) => assignment.workspaceId);
    const targetWorkspaces = await WorkspaceModel.findAll({
      where: { id: targetWorkspaceIds },
      transaction,
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
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const authorizedWorkspaceIds = new Set(
        actorMemberships.map((membership) => membership.workspaceId),
      );
      const unauthorizedWorkspaceIds = targetWorkspaceIds.filter(
        (id) => !authorizedWorkspaceIds.has(id),
      );
      if (unauthorizedWorkspaceIds.length > 0) {
        throw new Error(
          'FORBIDDEN: Owner or Admin access is required for every selected Workspace.',
        );
      }
    }

    const workspaceById = new Map(targetWorkspaces.map((workspace) => [workspace.id, workspace]));
    let user = await UserModel.findOne({
      where: { email: { [Op.iLike]: normalizedEmail } },
      paranoid: false,
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    let setPasswordToken: string | undefined;

    if (user?.deletedAt) {
      await user.restore({ transaction });
    }

    if (!user) {
      const reset = createPasswordResetToken();
      user = await UserModel.create(
        {
          email: normalizedEmail,
          name: normalizedEmail.split('@')[0],
          role: assignments[0].role,
          passwordHash: null,
          passwordResetToken: reset.tokenHash,
          passwordResetExpiresAt: reset.expiresAt,
        },
        { transaction },
      );
      setPasswordToken = reset.token;
    } else if (!user.passwordHash) {
      const reset = createPasswordResetToken();
      user.passwordResetToken = reset.tokenHash;
      user.passwordResetExpiresAt = reset.expiresAt;
      await user.save({ transaction });
      setPasswordToken = reset.token;
    }

    const processedMembers = new Map<string, WorkspaceMemberModel>();
    const assignmentResults: Array<{
      workspaceId: string;
      workspaceName: string;
      status: 'added' | 'restored' | 'already_member';
    }> = [];

    for (const assignment of assignments) {
      const workspace = workspaceById.get(assignment.workspaceId)!;
      const activityActorId = actorId || workspace.ownerId;
      const existingMember = await WorkspaceMemberModel.findOne({
        where: { workspaceId: workspace.id, userId: user.id },
        paranoid: false,
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!existingMember) {
        const member = await WorkspaceMemberModel.create(
          {
            workspaceId: workspace.id,
            userId: user.id,
            role: assignment.role,
          },
          { transaction },
        );
        await replaceSpecialties(
          workspace.id,
          member,
          assignment.specialties,
          activityActorId,
          transaction,
        );
        await WorkspaceMembershipActivityModel.create(
          {
            workspaceId: workspace.id,
            actorId: activityActorId,
            targetUserId: user.id,
            action: 'member_added',
            metadata: { role: assignment.role, specialties: assignment.specialties },
          },
          { transaction },
        );
        processedMembers.set(workspace.id, member);
        assignmentResults.push({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          status: 'added',
        });
        continue;
      }

      if (existingMember.deletedAt) {
        const previousRole = existingMember.role;
        await existingMember.restore({ transaction });
        existingMember.role = assignment.role;
        existingMember.joinedAt = new Date();
        await existingMember.save({ transaction });
        await replaceSpecialties(
          workspace.id,
          existingMember,
          assignment.specialties,
          activityActorId,
          transaction,
        );
        await WorkspaceMembershipActivityModel.create(
          {
            workspaceId: workspace.id,
            actorId: activityActorId,
            targetUserId: user.id,
            action: 'member_restored',
            metadata: {
              previousRole,
              restoredRole: existingMember.role,
              specialties: assignment.specialties,
            },
          },
          { transaction },
        );
        processedMembers.set(workspace.id, existingMember);
        assignmentResults.push({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          status: 'restored',
        });
        continue;
      }

      processedMembers.set(workspace.id, existingMember);
      assignmentResults.push({
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        status: 'already_member',
      });
    }

    const changedWorkspaceNames = assignmentResults
      .filter((result) => result.status !== 'already_member')
      .map((result) => result.workspaceName);
    if (changedWorkspaceNames.length === 0) {
      throw new Error('CONFLICT: User is already a member of all selected workspaces.');
    }

    const primaryMember =
      processedMembers.get(workspaceId) || processedMembers.values().next().value || null;
    if (!primaryMember) {
      throw new Error('INTERNAL: Member assignment completed without a persisted membership.');
    }
    const primarySpecialtyRows = await WorkspaceMemberSpecialtyModel.findAll({
      where: { workspaceId: primaryMember.workspaceId, workspaceMemberId: primaryMember.id },
      transaction,
    });

    return {
      user,
      primaryMember,
      primarySpecialties: primarySpecialtyRows.map((row) => row.specialty).sort(),
      assignmentResults,
      changedWorkspaceNames,
      setPasswordToken,
    };
  });

  const {
    user,
    primaryMember,
    primarySpecialties,
    assignmentResults,
    changedWorkspaceNames,
    setPasswordToken,
  } = mutation;

  // Send zero-cost invitation notification email if workspaces were added
  if (changedWorkspaceNames.length > 0) {
    let inviterName = 'Workspace Admin';
    if (actorId) {
      const actor = await UserModel.findByPk(actorId);
      if (actor) inviterName = actor.name;
    }
    await emailService.sendWorkspaceInvitationEmail(
      user.email,
      changedWorkspaceNames,
      inviterName,
      primaryMember.role,
      setPasswordToken,
    );

    fcmService
      .sendWorkspaceMembershipNotification({
        userId: user.id,
        actorName: inviterName,
        actorId: actorId || user.id,
        workspaceName: changedWorkspaceNames.join(', '),
        workspaceId: primaryMember.workspaceId,
        action: 'added',
        newRole: primaryMember.role,
      })
      .catch((err) => console.warn('⚠️ Failed to dispatch workspace member notification:', err));
  }

  return {
    id: primaryMember.id,
    workspaceId: primaryMember.workspaceId,
    userId: user.id,
    role: primaryMember.role,
    specialties: primarySpecialties,
    joinedAt: primaryMember.joinedAt.toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
    },
    assignmentResults,
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
