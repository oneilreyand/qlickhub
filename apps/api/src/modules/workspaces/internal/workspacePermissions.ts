import { TaskCreationPermissionModel } from '../../../db/models/taskCreationPermission.js';
import { WorkspaceMemberModel } from '../../../db/models/workspaceMember.js';
import { UserModel } from '../../../db/models/user.js';

export async function listTaskCreationPermissions(workspaceId: string) {
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
      createdAt: json.createdAt ? new Date(json.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: json.updatedAt ? new Date(json.updatedAt).toISOString() : new Date().toISOString(),
    };
  });
}

export async function grantTaskCreationPermission(
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

export async function revokeTaskCreationPermission(workspaceId: string, targetUserId: string) {
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
