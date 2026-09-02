import { sequelize } from '../../../db/sequelize.js';
import { WorkspaceModel } from '../../../db/models/workspace.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';
import { WorkspaceMembershipActivityModel } from '../../../db/models/workspaceMembershipActivity.js';
import { WorkspaceMemberSpecialtyModel } from '../../../db/models/workspaceMemberSpecialty.js';
import { CreateWorkspaceInput, UpdateWorkspaceInput } from '@qlick/contracts';
import { canCreateWorkspace } from '../../../policies/workspacePolicy.js';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function createWorkspace(userId: string, input: CreateWorkspaceInput) {
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

export async function getUserWorkspaces(userId: string) {
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

export async function getWorkspaceById(workspaceId: string, userId: string) {
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

export async function setWorkspaceArchived(
  workspaceId: string,
  actorId: string,
  archived: boolean,
) {
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
      throw new Error('FORBIDDEN: Only the Workspace Owner may archive or restore this Workspace.');
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

export async function updateWorkspace(workspaceId: string, input: UpdateWorkspaceInput) {
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
