import { sequelize } from '../../db/sequelize.js';
import { WorkspaceModel } from '../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../db/models/workspaceMember.js';
import { UserModel } from '../../db/models/user.js';
import {
  AddWorkspaceMemberInput,
  AssignableWorkspaceRole,
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
} from '@qa/contracts';
import { emailService } from '../../services/emailService.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export class WorkspaceService {
  async createWorkspace(userId: string, input: CreateWorkspaceInput) {
    const name = input.name.trim();
    let slug = input.slug ? slugify(input.slug) : slugify(name);

    if (!slug) {
      slug = `ws-${Date.now()}`;
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
        { transaction }
      );

      const member = await WorkspaceMemberModel.create(
        {
          workspaceId: workspace.id,
          userId,
          role: 'owner',
        },
        { transaction }
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
    };
  }

  async updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('NOT_FOUND: Workspace not found');
    }

    if (input.name) workspace.name = input.name.trim();
    if (input.description !== undefined) workspace.description = input.description;
    if (input.allowQaTaskCreation !== undefined) workspace.allowQaTaskCreation = input.allowQaTaskCreation;

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

    const user = await UserModel.findOne({ where: { email: input.email.trim().toLowerCase() } });
    if (!user) {
      throw new Error('NOT_FOUND: User with this email does not exist.');
    }

    const targetWorkspaceIds = Array.from(
      new Set([workspaceId, ...(input.workspaceIds || [])])
    );

    const targetWorkspaces = await WorkspaceModel.findAll({
      where: { id: targetWorkspaceIds },
    });

    let primaryMember: WorkspaceMemberModel | null = null;
    const addedWorkspaceNames: string[] = [];

    for (const ws of targetWorkspaces) {
      const existingMember = await WorkspaceMemberModel.findOne({
        where: { workspaceId: ws.id, userId: user.id },
      });

      if (!existingMember) {
        const member = await WorkspaceMemberModel.create({
          workspaceId: ws.id,
          userId: user.id,
          role: input.role || 'dev',
        });
        if (ws.id === workspaceId) {
          primaryMember = member;
        }
        addedWorkspaceNames.push(ws.name);
      } else if (ws.id === workspaceId) {
        primaryMember = existingMember;
      }
    }

    if (!primaryMember && addedWorkspaceNames.length === 0) {
      throw new Error('CONFLICT: User is already a member of all selected workspaces.');
    }

    if (!primaryMember) {
      primaryMember = await WorkspaceMemberModel.findOne({
        where: { workspaceId, userId: user.id },
      }) as WorkspaceMemberModel;
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
        input.role || 'dev'
      );
    }

    return {
      id: primaryMember?.id || 'batch-assignment',
      workspaceId,
      userId: user.id,
      role: primaryMember?.role || input.role || 'dev',
      joinedAt: primaryMember?.joinedAt ? primaryMember.joinedAt.toISOString() : new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  async updateMemberRole(workspaceId: string, targetUserId: string, newRole: AssignableWorkspaceRole) {
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('NOT_FOUND: Workspace not found');
    }

    if (targetUserId === workspace.ownerId) {
      throw new Error('FORBIDDEN: The workspace owner role cannot be changed. Transfer ownership first.');
    }

    if ((newRole as string) === 'owner') {
      throw new Error('FORBIDDEN: Assigning the owner role requires an ownership transfer.');
    }

    const member = await WorkspaceMemberModel.findOne({
      where: { workspaceId, userId: targetUserId },
    });

    if (!member) {
      throw new Error('NOT_FOUND: Member not found in workspace.');
    }

    member.role = newRole;
    await member.save();
    return member.toJSON();
  }

  async removeWorkspaceMember(workspaceId: string, targetUserId: string) {
    const workspace = await WorkspaceModel.findByPk(workspaceId);
    if (!workspace) {
      throw new Error('NOT_FOUND: Workspace not found');
    }

    if (workspace.ownerId === targetUserId) {
      throw new Error('FORBIDDEN: Cannot remove the owner of the workspace.');
    }

    const deleted = await WorkspaceMemberModel.destroy({
      where: { workspaceId, userId: targetUserId },
    });

    if (!deleted) {
      throw new Error('NOT_FOUND: Member not found in workspace.');
    }

    return { success: true };
  }
}

export const workspaceService = new WorkspaceService();
