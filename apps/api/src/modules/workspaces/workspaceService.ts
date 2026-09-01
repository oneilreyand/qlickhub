import { sequelize } from '../../db/sequelize.js';
import { WorkspaceModel } from '../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../db/models/workspaceMember.js';
import { UserModel } from '../../db/models/user.js';
import { TaskCreationPermissionModel } from '../../db/models/taskCreationPermission.js';
import { WorkspaceMembershipActivityModel } from '../../db/models/workspaceMembershipActivity.js';
import { WorkspaceMemberSpecialtyModel } from '../../db/models/workspaceMemberSpecialty.js';
import { TaskModel } from '../../db/models/task.js';
import { TaskActivityModel } from '../../db/models/taskActivity.js';
import { BugModel } from '../../db/models/bug.js';
import { BugActivityModel } from '../../db/models/bugActivity.js';
import { TestCaseModel } from '../../db/models/testCase.js';
import { TestCaseActivityModel } from '../../db/models/testCaseActivity.js';
import { WorkFolderModel } from '../../db/models/workFolder.js';
import { FolderActivityModel } from '../../db/models/folderActivity.js';
import { Op, type Transaction } from 'sequelize';
import {
  AddWorkspaceMemberInput,
  AssignableWorkspaceRole,
  CreateWorkspaceInput,
  DeveloperSpecialty,
  UpdateMemberRoleInput,
  UpdateWorkspaceInput,
  WorkspaceActivityQuery,
  WorkspaceActivityListResponse,
  WorkspaceActivityItem,
} from '@qlick/contracts';
import { emailService } from '../../services/emailService.js';
import { fcmService } from '../../services/fcmService.js';
import { canCreateWorkspace } from '../../policies/workspacePolicy.js';
import { createPasswordResetToken } from '../auth/passwordResetToken.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function specialtyValues(member: WorkspaceMemberModel): DeveloperSpecialty[] {
  const rows =
    (member as unknown as { specialties?: WorkspaceMemberSpecialtyModel[] }).specialties || [];
  return rows.map((row) => row.specialty).sort();
}

async function replaceSpecialties(
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

export class WorkspaceService {
  async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    const name = input.name.trim();
    let slug = input.slug ? slugify(input.slug) : slugify(name);

    if (!slug) {
      slug = `ws-${Date.now()}`;
    }

    // Keep direct service calls aligned with the authenticated route policy.
    const user = await UserModel.findByPk(userId);
    if (!user || !canCreateWorkspace(user.role)) {
      throw new Error(
        'FORBIDDEN: Only workspace owners, admins, and product owners are authorized to create new workspaces.',
      );
    }

    // Check slug uniqueness
    const existing = await WorkspaceModel.findOne({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`;
    }

    return await sequelize.transaction(async (transaction) => {
      const workspace = await WorkspaceModel.create(
        {
          name,
          slug,
          description: input.description || null,
          ownerId: userId,
        },
        { transaction },
      );

      const member = await WorkspaceMemberModel.create(
        {
          workspaceId: workspace.id,
          userId,
          role: 'owner',
        },
        { transaction },
      );

      return {
        ...workspace.toJSON(),
        allowQaTaskCreation: workspace.allowQaTaskCreation ?? true,
        role: member.role,
        myRole: member.role,
      };
    });
  }

  async getUserWorkspaces(userId: string) {
    const memberships = await WorkspaceMemberModel.findAll({
      where: { userId },
      include: [
        {
          model: WorkspaceModel,
          as: 'workspace',
        },
        {
          model: WorkspaceMemberSpecialtyModel,
          as: 'specialties',
          attributes: ['specialty'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return memberships
      .map((m) => {
        const item = m as unknown as { workspace?: WorkspaceModel };
        const ws = item.workspace;
        if (!ws) return null;
        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          description: ws.description,
          ownerId: ws.ownerId,
          allowQaTaskCreation: ws.allowQaTaskCreation ?? true,
          role: m.role,
          myRole: m.role,
          joinedAt: m.joinedAt,
          createdAt: ws.createdAt,
          updatedAt: ws.updatedAt,
          archivedAt: ws.archivedAt ? ws.archivedAt.toISOString() : null,
        };
      })
      .filter((ws): ws is NonNullable<typeof ws> => ws !== null);
  }

  async getWorkspaceById(workspaceId: string, userId: string) {
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('NOT_FOUND: Workspace not found');
    }

    const membership = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId },
    });

    if (!membership) {
      throw new Error('FORBIDDEN: Access denied');
    }

    return {
      ...workspace.toJSON(),
      allowQaTaskCreation: workspace.allowQaTaskCreation ?? true,
      role: membership.role,
      myRole: membership.role,
      archivedAt: workspace.archivedAt ? workspace.archivedAt.toISOString() : null,
    };
  }

  async setWorkspaceArchived(workspaceId: string, actorId: string, archived: boolean) {
    return sequelize.transaction(async (transaction) => {
      const workspace = await WorkspaceModel.findByPk(workspaceId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!workspace) throw new Error('NOT_FOUND: Workspace not found');
      const membership = await WorkspaceMemberModel.findOne({
        where: { workspaceId, userId: actorId, role: 'owner' },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!membership || workspace.ownerId !== actorId) {
        throw new Error(
          'FORBIDDEN: Only the Workspace Owner may archive or restore this Workspace.',
        );
      }
      if (archived && workspace.archivedAt) {
        throw new Error('CONFLICT: Workspace is already archived.');
      }
      if (!archived && !workspace.archivedAt) {
        throw new Error('CONFLICT: Workspace is already active.');
      }

      workspace.archivedAt = archived ? new Date() : null;
      await workspace.save({ transaction });
      await WorkspaceMembershipActivityModel.create(
        {
          workspaceId,
          actorId,
          targetUserId: actorId,
          action: archived ? 'workspace_archived' : 'workspace_restored',
          metadata: { archivedAt: workspace.archivedAt?.toISOString() || null },
        },
        { transaction },
      );
      return {
        ...workspace.toJSON(),
        archivedAt: workspace.archivedAt ? workspace.archivedAt.toISOString() : null,
      };
    });
  }

  async updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('NOT_FOUND: Workspace not found');
    }

    if (input.name) workspace.name = input.name.trim();
    if (input.description !== undefined) workspace.description = input.description;
    if (input.allowQaTaskCreation !== undefined)
      workspace.allowQaTaskCreation = input.allowQaTaskCreation;

    await workspace.save();
    return {
      ...workspace.toJSON(),
      allowQaTaskCreation: workspace.allowQaTaskCreation ?? true,
    };
  }

  async getWorkspaceMembers(workspaceId: string) {
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

  async addWorkspaceMember(workspaceId: string, input: AddWorkspaceMemberInput, actorId?: string) {
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
        throw new Error(
          'FORBIDDEN: Owner or Admin access is required for every selected Workspace.',
        );
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

  async updateMemberRole(
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

  async removeWorkspaceMember(workspaceId: string, targetUserId: string, actorId: string) {
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

  async listTaskCreationPermissions(workspaceId: string) {
    const permissions = await TaskCreationPermissionModel.findAll({
      where: { workspaceId },
      include: [
        {
          model: UserModel,
          as: 'user',
          attributes: ['id', 'email', 'name', 'avatarUrl'],
        },
        {
          model: UserModel,
          as: 'granter',
          attributes: ['id', 'email', 'name'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return permissions.map((p) => {
      const json = p.toJSON() as any;
      return {
        id: json.id,
        workspaceId: json.workspaceId,
        userId: json.userId,
        grantedBy: json.grantedBy,
        expiresAt: json.expiresAt ? new Date(json.expiresAt).toISOString() : null,
        user: json.user
          ? {
              id: json.user.id,
              email: json.user.email,
              name: json.user.name,
              avatarUrl: json.user.avatarUrl,
            }
          : undefined,
        granter: json.granter
          ? {
              id: json.granter.id,
              email: json.granter.email,
              name: json.granter.name,
            }
          : undefined,
        createdAt: json.createdAt
          ? new Date(json.createdAt).toISOString()
          : new Date().toISOString(),
        updatedAt: json.updatedAt
          ? new Date(json.updatedAt).toISOString()
          : new Date().toISOString(),
      };
    });
  }

  async grantTaskCreationPermission(
    workspaceId: string,
    grantedBy: string,
    input: { userId: string; expiresAt?: string | null },
  ) {
    const member = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: input.userId },
    });

    if (!member) {
      throw new Error('NOT_FOUND: User is not a member of this workspace.');
    }

    const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

    let permission = await TaskCreationPermissionModel.findOne({
      where: { workspaceId, userId: input.userId },
    });

    if (permission) {
      permission.grantedBy = grantedBy;
      permission.expiresAt = expiresAt;
      await permission.save();
    } else {
      permission = await TaskCreationPermissionModel.create({
        workspaceId,
        userId: input.userId,
        grantedBy,
        expiresAt,
      });
    }

    const user = await UserModel.findByPk(input.userId, {
      attributes: ['id', 'email', 'name', 'avatarUrl'],
    });

    const granter = await UserModel.findByPk(grantedBy, {
      attributes: ['id', 'email', 'name'],
    });

    return {
      id: permission.id,
      workspaceId: permission.workspaceId,
      userId: permission.userId,
      grantedBy: permission.grantedBy,
      expiresAt: permission.expiresAt ? permission.expiresAt.toISOString() : null,
      user: user
        ? {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
          }
        : undefined,
      granter: granter
        ? {
            id: granter.id,
            email: granter.email,
            name: granter.name,
          }
        : undefined,
      createdAt: permission.createdAt.toISOString(),
      updatedAt: permission.updatedAt.toISOString(),
    };
  }

  async revokeTaskCreationPermission(workspaceId: string, targetUserId: string) {
    const deleted = await TaskCreationPermissionModel.destroy({
      where: { workspaceId, userId: targetUserId },
    });

    if (!deleted) {
      throw new Error(
        'NOT_FOUND: Task creation permission not found for this user in this workspace.',
      );
    }

    return { success: true };
  }

  async listWorkspaceActivities(
    workspaceId: string,
    query: WorkspaceActivityQuery,
    _actorId: string,
  ): Promise<WorkspaceActivityListResponse> {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const offset = (page - 1) * limit;

    const items: WorkspaceActivityItem[] = [];

    const dateWhere: Record<string, unknown> = {};
    if (query.startDate && query.endDate) {
      dateWhere.createdAt = { [Op.between]: [new Date(query.startDate), new Date(query.endDate)] };
    } else if (query.startDate) {
      dateWhere.createdAt = { [Op.gte]: new Date(query.startDate) };
    } else if (query.endDate) {
      dateWhere.createdAt = { [Op.lte]: new Date(query.endDate) };
    }

    const actorFilter = query.actorId ? { actorId: query.actorId } : {};

    // 1. Task activities
    if (!query.entityType || query.entityType === 'task') {
      const taskActivities = await TaskActivityModel.findAll({
        where: { workspaceId, ...actorFilter, ...dateWhere },
        include: [
          { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
          { model: TaskModel, as: 'task', attributes: ['id', 'title'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: limit * page,
      });

      for (const act of taskActivities) {
        const json = act.toJSON() as any;
        items.push({
          id: json.id,
          workspaceId: json.workspaceId,
          entityType: 'task',
          entityId: json.taskId,
          entityTitle: json.task?.title || null,
          actorId: json.actorId || null,
          actorName: json.actor?.name || json.actor?.email || null,
          action: json.action,
          metadataJson: json.metadataJson || null,
          createdAt: new Date(json.createdAt).toISOString(),
        });
      }
    }

    // 2. Bug activities
    if (!query.entityType || query.entityType === 'bug') {
      const bugActivities = await BugActivityModel.findAll({
        where: { workspaceId, ...actorFilter, ...dateWhere },
        include: [
          { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
          { model: BugModel, as: 'bug', attributes: ['id', 'title'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: limit * page,
      });

      for (const act of bugActivities) {
        const json = act.toJSON() as any;
        items.push({
          id: json.id,
          workspaceId: json.workspaceId,
          entityType: 'bug',
          entityId: json.bugId,
          entityTitle: json.bug?.title || null,
          actorId: json.actorId || null,
          actorName: json.actor?.name || json.actor?.email || null,
          action: json.action,
          metadataJson: json.metadata || null,
          createdAt: new Date(json.createdAt).toISOString(),
        });
      }
    }

    // 3. TestCase activities
    if (!query.entityType || query.entityType === 'test_case') {
      const testActivities = await TestCaseActivityModel.findAll({
        where: { workspaceId, ...actorFilter, ...dateWhere },
        include: [
          { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
          { model: TestCaseModel, as: 'testCase', attributes: ['id', 'title'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: limit * page,
      });

      for (const act of testActivities) {
        const json = act.toJSON() as any;
        items.push({
          id: json.id,
          workspaceId: json.workspaceId,
          entityType: 'test_case',
          entityId: json.testCaseId,
          entityTitle: json.testCase?.title || null,
          actorId: json.actorId || null,
          actorName: json.actor?.name || json.actor?.email || null,
          action: json.action,
          metadataJson: json.metadata || null,
          createdAt: new Date(json.createdAt).toISOString(),
        });
      }
    }

    // 4. Folder activities
    if (!query.entityType || query.entityType === 'folder') {
      const folderActivities = await FolderActivityModel.findAll({
        where: { workspaceId, ...actorFilter, ...dateWhere },
        include: [
          { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
          { model: WorkFolderModel, as: 'folder', attributes: ['id', 'name'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: limit * page,
      });

      for (const act of folderActivities) {
        const json = act.toJSON() as any;
        items.push({
          id: json.id,
          workspaceId: json.workspaceId,
          entityType: 'folder',
          entityId: json.folderId,
          entityTitle: json.folder?.name || null,
          actorId: json.actorId || null,
          actorName: json.actor?.name || json.actor?.email || null,
          action: json.action,
          metadataJson: json.metadataJson || null,
          createdAt: new Date(json.createdAt).toISOString(),
        });
      }
    }

    // 5. Membership activities
    if (!query.entityType || query.entityType === 'workspace_membership') {
      const memberActivities = await WorkspaceMembershipActivityModel.findAll({
        where: { workspaceId, ...actorFilter, ...dateWhere },
        include: [
          { model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] },
          { model: UserModel, as: 'targetUser', attributes: ['id', 'name', 'email'] },
        ],
        order: [['createdAt', 'DESC']],
        limit: limit * page,
      });

      for (const act of memberActivities) {
        const json = act.toJSON() as any;
        items.push({
          id: json.id,
          workspaceId: json.workspaceId,
          entityType: 'workspace_membership',
          entityId: json.targetUserId,
          entityTitle: json.targetUser?.name || json.targetUser?.email || null,
          actorId: json.actorId || null,
          actorName: json.actor?.name || json.actor?.email || null,
          action: json.action,
          metadataJson: json.metadata || null,
          createdAt: new Date(json.createdAt).toISOString(),
        });
      }
    }

    // Sort all merged activities by createdAt DESC
    items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = items.length;
    const paginated = items.slice(offset, offset + limit);

    return {
      activities: paginated,
      total,
      page,
      limit,
    };
  }
}

export const workspaceService = new WorkspaceService();
