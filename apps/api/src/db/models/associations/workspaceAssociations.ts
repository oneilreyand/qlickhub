import { UserModel } from '../user.js';
import { WorkspaceModel } from '../workspace.js';
import { WorkspaceMemberModel } from '../workspaceMember.js';
import { WorkspaceMembershipActivityModel } from '../workspaceMembershipActivity.js';
import { WorkspaceMemberSpecialtyModel } from '../workspaceMemberSpecialty.js';
import { TaskCreationPermissionModel } from '../taskCreationPermission.js';

export function setupWorkspaceAssociations() {
  UserModel.hasMany(WorkspaceModel, {
    foreignKey: 'ownerId',
    as: 'ownedWorkspaces',
    onDelete: 'RESTRICT',
  });
  WorkspaceModel.belongsTo(UserModel, { foreignKey: 'ownerId', as: 'owner', onDelete: 'RESTRICT' });

  UserModel.hasMany(WorkspaceMemberModel, {
    foreignKey: 'userId',
    as: 'workspaceMemberships',
    onDelete: 'CASCADE',
  });
  WorkspaceMemberModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(WorkspaceMemberModel, {
    foreignKey: 'workspaceId',
    as: 'members',
    onDelete: 'CASCADE',
  });
  WorkspaceMemberModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.belongsToMany(WorkspaceModel, {
    through: WorkspaceMemberModel,
    foreignKey: 'userId',
    otherKey: 'workspaceId',
    as: 'workspaces',
  });
  WorkspaceModel.belongsToMany(UserModel, {
    through: WorkspaceMemberModel,
    foreignKey: 'workspaceId',
    otherKey: 'userId',
    as: 'users',
  });

  WorkspaceModel.hasMany(WorkspaceMembershipActivityModel, {
    foreignKey: 'workspaceId',
    as: 'membershipActivity',
    onDelete: 'CASCADE',
  });
  WorkspaceMembershipActivityModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });
  UserModel.hasMany(WorkspaceMembershipActivityModel, {
    foreignKey: 'actorId',
    as: 'workspaceMembershipActions',
    onDelete: 'RESTRICT',
  });
  WorkspaceMembershipActivityModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'actor',
    onDelete: 'RESTRICT',
  });
  UserModel.hasMany(WorkspaceMembershipActivityModel, {
    foreignKey: 'targetUserId',
    as: 'workspaceMembershipActivityTargets',
    onDelete: 'RESTRICT',
  });
  WorkspaceMembershipActivityModel.belongsTo(UserModel, {
    foreignKey: 'targetUserId',
    as: 'targetUser',
    onDelete: 'RESTRICT',
  });

  WorkspaceMemberModel.hasMany(WorkspaceMemberSpecialtyModel, {
    foreignKey: 'workspaceMemberId',
    as: 'specialties',
    onDelete: 'CASCADE',
  });
  WorkspaceMemberSpecialtyModel.belongsTo(WorkspaceMemberModel, {
    foreignKey: 'workspaceMemberId',
    as: 'membership',
    onDelete: 'CASCADE',
  });
  WorkspaceModel.hasMany(WorkspaceMemberSpecialtyModel, {
    foreignKey: 'workspaceId',
    as: 'memberSpecialties',
    onDelete: 'CASCADE',
  });
  WorkspaceMemberSpecialtyModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });
  UserModel.hasMany(WorkspaceMemberSpecialtyModel, {
    foreignKey: 'createdBy',
    as: 'createdMemberSpecialties',
    onDelete: 'RESTRICT',
  });
  WorkspaceMemberSpecialtyModel.belongsTo(UserModel, {
    foreignKey: 'createdBy',
    as: 'creator',
    onDelete: 'RESTRICT',
  });

  // Task Creation Permission Associations
  WorkspaceModel.hasMany(TaskCreationPermissionModel, {
    foreignKey: 'workspaceId',
    as: 'taskCreationPermissions',
    onDelete: 'CASCADE',
  });
  TaskCreationPermissionModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TaskCreationPermissionModel, {
    foreignKey: 'userId',
    as: 'taskCreationPermissions',
    onDelete: 'CASCADE',
  });
  TaskCreationPermissionModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TaskCreationPermissionModel, {
    foreignKey: 'grantedBy',
    as: 'grantedTaskCreationPermissions',
    onDelete: 'CASCADE',
  });
  TaskCreationPermissionModel.belongsTo(UserModel, {
    foreignKey: 'grantedBy',
    as: 'granter',
    onDelete: 'CASCADE',
  });
}
