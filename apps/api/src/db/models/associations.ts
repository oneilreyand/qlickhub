import { UserModel } from './user.js';
import { AuthSessionModel } from './authSession.js';
import { WorkspaceModel } from './workspace.js';
import { WorkspaceMemberModel } from './workspaceMember.js';
import { WorkFolderModel } from './workFolder.js';
import { TaskModel } from './task.js';
import { TaskActivityModel } from './taskActivity.js';
import { TaskCommentModel } from './taskComment.js';
import { TaskCommentMentionModel } from './taskCommentMention.js';
import { TaskAttachmentModel } from './taskAttachment.js';
import { RequirementModel } from './requirement.js';
import { TaskRequirementModel } from './taskRequirement.js';
import { QaDocumentModel } from './qaDocument.js';
import { QaDocumentVersionModel } from './qaDocumentVersion.js';
import { TaskDocumentModel } from './taskDocument.js';
import { RequirementTestCaseModel } from './requirementTestCase.js';
import { UserFcmTokenModel } from './userFcmToken.js';
import { TaskCreationPermissionModel } from './taskCreationPermission.js';

export function setupAssociations() {
  UserModel.hasMany(UserFcmTokenModel, { foreignKey: 'userId', as: 'fcmTokens', onDelete: 'CASCADE' });
  UserFcmTokenModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  UserModel.hasMany(AuthSessionModel, { foreignKey: 'userId', as: 'authSessions', onDelete: 'CASCADE' });
  AuthSessionModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  UserModel.hasMany(WorkspaceModel, { foreignKey: 'ownerId', as: 'ownedWorkspaces', onDelete: 'RESTRICT' });
  WorkspaceModel.belongsTo(UserModel, { foreignKey: 'ownerId', as: 'owner', onDelete: 'RESTRICT' });

  UserModel.hasMany(WorkspaceMemberModel, { foreignKey: 'userId', as: 'workspaceMemberships', onDelete: 'CASCADE' });
  WorkspaceMemberModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  WorkspaceModel.hasMany(WorkspaceMemberModel, { foreignKey: 'workspaceId', as: 'members', onDelete: 'CASCADE' });
  WorkspaceMemberModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  UserModel.belongsToMany(WorkspaceModel, { through: WorkspaceMemberModel, foreignKey: 'userId', otherKey: 'workspaceId', as: 'workspaces' });
  WorkspaceModel.belongsToMany(UserModel, { through: WorkspaceMemberModel, foreignKey: 'workspaceId', otherKey: 'userId', as: 'users' });

  // Task Creation Permission Associations
  WorkspaceModel.hasMany(TaskCreationPermissionModel, { foreignKey: 'workspaceId', as: 'taskCreationPermissions', onDelete: 'CASCADE' });
  TaskCreationPermissionModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  UserModel.hasMany(TaskCreationPermissionModel, { foreignKey: 'userId', as: 'taskCreationPermissions', onDelete: 'CASCADE' });
  TaskCreationPermissionModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  UserModel.hasMany(TaskCreationPermissionModel, { foreignKey: 'grantedBy', as: 'grantedTaskCreationPermissions', onDelete: 'CASCADE' });
  TaskCreationPermissionModel.belongsTo(UserModel, { foreignKey: 'grantedBy', as: 'granter', onDelete: 'CASCADE' });

  // Workspace <-> WorkFolder
  WorkspaceModel.hasMany(WorkFolderModel, { foreignKey: 'workspaceId', as: 'folders', onDelete: 'CASCADE' });
  WorkFolderModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  // Self-referential WorkFolder (Parent / Children)
  WorkFolderModel.hasMany(WorkFolderModel, { foreignKey: 'parentFolderId', as: 'children', onDelete: 'RESTRICT' });
  WorkFolderModel.belongsTo(WorkFolderModel, { foreignKey: 'parentFolderId', as: 'parent', onDelete: 'RESTRICT' });

  // User <-> WorkFolder (Creator)
  UserModel.hasMany(WorkFolderModel, { foreignKey: 'createdBy', as: 'createdFolders', onDelete: 'RESTRICT' });
  WorkFolderModel.belongsTo(UserModel, { foreignKey: 'createdBy', as: 'creator', onDelete: 'RESTRICT' });

  // Task Associations
  WorkspaceModel.hasMany(TaskModel, { foreignKey: 'workspaceId', as: 'tasks', onDelete: 'CASCADE' });
  TaskModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  WorkFolderModel.hasMany(TaskModel, { foreignKey: 'folderId', as: 'tasks', onDelete: 'RESTRICT' });
  TaskModel.belongsTo(WorkFolderModel, { foreignKey: 'folderId', as: 'folder', onDelete: 'RESTRICT' });

  UserModel.hasMany(TaskModel, { foreignKey: 'reporterId', as: 'reportedTasks', onDelete: 'RESTRICT' });
  TaskModel.belongsTo(UserModel, { foreignKey: 'reporterId', as: 'reporter', onDelete: 'RESTRICT' });

  UserModel.hasMany(TaskModel, { foreignKey: 'assigneeId', as: 'assignedTasks', onDelete: 'SET NULL' });
  TaskModel.belongsTo(UserModel, { foreignKey: 'assigneeId', as: 'assignee', onDelete: 'SET NULL' });

  UserModel.hasMany(TaskModel, { foreignKey: 'reviewedBy', as: 'reviewedTasks', onDelete: 'SET NULL' });
  TaskModel.belongsTo(UserModel, { foreignKey: 'reviewedBy', as: 'reviewer', onDelete: 'SET NULL' });

  // Self-referential Task (Parent / Subtasks)
  TaskModel.hasMany(TaskModel, { foreignKey: 'parentTaskId', as: 'subtasks', onDelete: 'RESTRICT' });
  TaskModel.belongsTo(TaskModel, { foreignKey: 'parentTaskId', as: 'parentTask', onDelete: 'RESTRICT' });

  // Task Activity Associations
  TaskModel.hasMany(TaskActivityModel, { foreignKey: 'taskId', as: 'activities', onDelete: 'CASCADE' });
  TaskActivityModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task', onDelete: 'CASCADE' });

  WorkspaceModel.hasMany(TaskActivityModel, { foreignKey: 'workspaceId', as: 'taskActivities', onDelete: 'CASCADE' });
  TaskActivityModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  UserModel.hasMany(TaskActivityModel, { foreignKey: 'actorId', as: 'taskActivities', onDelete: 'SET NULL' });
  TaskActivityModel.belongsTo(UserModel, { foreignKey: 'actorId', as: 'actor', onDelete: 'SET NULL' });

  // Task Discussion Comments Associations
  TaskModel.hasMany(TaskCommentModel, { foreignKey: 'taskId', as: 'comments', onDelete: 'CASCADE' });
  TaskCommentModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task', onDelete: 'CASCADE' });

  WorkspaceModel.hasMany(TaskCommentModel, { foreignKey: 'workspaceId', as: 'taskComments', onDelete: 'CASCADE' });
  TaskCommentModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  UserModel.hasMany(TaskCommentModel, { foreignKey: 'authorId', as: 'authoredComments', onDelete: 'RESTRICT' });
  TaskCommentModel.belongsTo(UserModel, { foreignKey: 'authorId', as: 'author', onDelete: 'RESTRICT' });

  TaskCommentModel.hasMany(TaskCommentModel, { foreignKey: 'parentCommentId', as: 'replies', onDelete: 'CASCADE' });
  TaskCommentModel.belongsTo(TaskCommentModel, { foreignKey: 'parentCommentId', as: 'parentComment', onDelete: 'CASCADE' });

  // Task Comment Mentions Associations
  TaskCommentModel.hasMany(TaskCommentMentionModel, { foreignKey: 'commentId', as: 'mentions', onDelete: 'CASCADE' });
  TaskCommentMentionModel.belongsTo(TaskCommentModel, { foreignKey: 'commentId', as: 'comment', onDelete: 'CASCADE' });

  UserModel.hasMany(TaskCommentMentionModel, { foreignKey: 'userId', as: 'commentMentions', onDelete: 'RESTRICT' });
  TaskCommentMentionModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'RESTRICT' });

  WorkspaceModel.hasMany(TaskCommentMentionModel, { foreignKey: 'workspaceId', as: 'commentMentions', onDelete: 'CASCADE' });
  TaskCommentMentionModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  // Task Attachment Associations
  TaskModel.hasMany(TaskAttachmentModel, { foreignKey: 'taskId', as: 'attachments', onDelete: 'CASCADE' });
  TaskAttachmentModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task', onDelete: 'CASCADE' });

  WorkspaceModel.hasMany(TaskAttachmentModel, { foreignKey: 'workspaceId', as: 'taskAttachments', onDelete: 'CASCADE' });
  TaskAttachmentModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  UserModel.hasMany(TaskAttachmentModel, { foreignKey: 'uploaderId', as: 'uploadedAttachments', onDelete: 'RESTRICT' });
  TaskAttachmentModel.belongsTo(UserModel, { foreignKey: 'uploaderId', as: 'uploader', onDelete: 'RESTRICT' });

  // Requirement & Task Requirement Link Associations
  WorkspaceModel.hasMany(RequirementModel, { foreignKey: 'workspaceId', as: 'requirements', onDelete: 'CASCADE' });
  RequirementModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  UserModel.hasMany(RequirementModel, { foreignKey: 'createdBy', as: 'createdRequirements', onDelete: 'RESTRICT' });
  RequirementModel.belongsTo(UserModel, { foreignKey: 'createdBy', as: 'creator', onDelete: 'RESTRICT' });

  TaskModel.hasMany(TaskRequirementModel, { foreignKey: 'taskId', as: 'requirementLinks', onDelete: 'CASCADE' });
  TaskRequirementModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task', onDelete: 'CASCADE' });

  RequirementModel.hasMany(TaskRequirementModel, { foreignKey: 'requirementId', as: 'taskLinks', onDelete: 'CASCADE' });
  TaskRequirementModel.belongsTo(RequirementModel, { foreignKey: 'requirementId', as: 'requirement', onDelete: 'CASCADE' });

  UserModel.hasMany(TaskRequirementModel, { foreignKey: 'linkedBy', as: 'linkedTaskRequirements', onDelete: 'RESTRICT' });
  TaskRequirementModel.belongsTo(UserModel, { foreignKey: 'linkedBy', as: 'linker', onDelete: 'RESTRICT' });

  // QA Document Associations
  WorkspaceModel.hasMany(QaDocumentModel, { foreignKey: 'workspaceId', as: 'qaDocuments', onDelete: 'CASCADE' });
  QaDocumentModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });

  WorkFolderModel.hasMany(QaDocumentModel, { foreignKey: 'folderId', as: 'qaDocuments', onDelete: 'SET NULL' });
  QaDocumentModel.belongsTo(WorkFolderModel, { foreignKey: 'folderId', as: 'folder', onDelete: 'SET NULL' });

  QaDocumentModel.hasMany(QaDocumentVersionModel, { foreignKey: 'documentId', as: 'versions', onDelete: 'CASCADE' });
  QaDocumentVersionModel.belongsTo(QaDocumentModel, { foreignKey: 'documentId', as: 'document', onDelete: 'CASCADE' });

  TaskModel.hasMany(TaskDocumentModel, { foreignKey: 'taskId', as: 'documentLinks', onDelete: 'CASCADE' });
  TaskDocumentModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task', onDelete: 'CASCADE' });

  QaDocumentModel.hasMany(TaskDocumentModel, { foreignKey: 'documentId', as: 'taskLinks', onDelete: 'CASCADE' });
  TaskDocumentModel.belongsTo(QaDocumentModel, { foreignKey: 'documentId', as: 'document', onDelete: 'CASCADE' });

  // Requirement Test Cases Associations
  RequirementModel.hasMany(RequirementTestCaseModel, { foreignKey: 'requirementId', as: 'testCases', onDelete: 'CASCADE' });
  RequirementTestCaseModel.belongsTo(RequirementModel, { foreignKey: 'requirementId', as: 'requirement', onDelete: 'CASCADE' });

  WorkspaceModel.hasMany(RequirementTestCaseModel, { foreignKey: 'workspaceId', as: 'testCases', onDelete: 'CASCADE' });
  RequirementTestCaseModel.belongsTo(WorkspaceModel, { foreignKey: 'workspaceId', as: 'workspace', onDelete: 'CASCADE' });
}

setupAssociations();
