import { UserModel } from './user.js';
import { AuthSessionModel } from './authSession.js';
import { WorkspaceModel } from './workspace.js';
import { WorkspaceMemberModel } from './workspaceMember.js';
import { WorkspaceMembershipActivityModel } from './workspaceMembershipActivity.js';
import { WorkspaceMemberSpecialtyModel } from './workspaceMemberSpecialty.js';
import { WorkFolderModel } from './workFolder.js';
import { TaskModel } from './task.js';
import { TaskAttachmentModel } from './taskAttachment.js';
import { TaskActivityModel } from './taskActivity.js';
import { TaskCommentModel } from './taskComment.js';
import { TaskCommentMentionModel } from './taskCommentMention.js';
import { RequirementModel } from './requirement.js';
import { AcceptanceCriterionModel } from './acceptanceCriterion.js';
import { TaskRequirementModel } from './taskRequirement.js';
import { QaDocumentModel } from './qaDocument.js';
import { QaDocumentVersionModel } from './qaDocumentVersion.js';
import { TaskDocumentModel } from './taskDocument.js';
import { RequirementTestCaseModel } from './requirementTestCase.js';
import { TestCaseModel } from './testCase.js';
import { TestCaseRequirementModel } from './testCaseRequirement.js';
import { TestRunModel } from './testRun.js';
import { TestResultModel } from './testResult.js';
import { TestResultEvidenceModel } from './testResultEvidence.js';
import { TestResultEvidenceLinkModel } from './testResultEvidenceLink.js';
import { TestCaseActivityModel } from './testCaseActivity.js';
import { TestCaseImportModel } from './testCaseImport.js';
import { TestCaseImportRowModel } from './testCaseImportRow.js';
import { BugModel } from './bug.js';
import { BugActivityModel } from './bugActivity.js';
import { BugEvidenceLinkModel } from './bugEvidenceLink.js';
import { QaSignOffModel } from './qaSignOff.js';
import { QaSignOffCancellationModel } from './qaSignOffCancellation.js';
import { ReleaseDecisionModel } from './releaseDecision.js';
import { ReleaseDecisionCancellationModel } from './releaseDecisionCancellation.js';
import { UserFcmTokenModel } from './userFcmToken.js';
import { TaskCreationPermissionModel } from './taskCreationPermission.js';
import { FolderActivityModel } from './folderActivity.js';
import { NotificationModel } from './notification.js';

export function setupAssociations() {
  UserModel.hasMany(UserFcmTokenModel, {
    foreignKey: 'userId',
    as: 'fcmTokens',
    onDelete: 'CASCADE',
  });
  UserFcmTokenModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  UserModel.hasMany(AuthSessionModel, {
    foreignKey: 'userId',
    as: 'authSessions',
    onDelete: 'CASCADE',
  });
  AuthSessionModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

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

  // Workspace <-> WorkFolder
  WorkspaceModel.hasMany(WorkFolderModel, {
    foreignKey: 'workspaceId',
    as: 'folders',
    onDelete: 'CASCADE',
  });
  WorkFolderModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  // Self-referential WorkFolder (Parent / Children)
  WorkFolderModel.hasMany(WorkFolderModel, {
    foreignKey: 'parentFolderId',
    as: 'children',
    onDelete: 'RESTRICT',
  });
  WorkFolderModel.belongsTo(WorkFolderModel, {
    foreignKey: 'parentFolderId',
    as: 'parent',
    onDelete: 'RESTRICT',
  });

  // User <-> WorkFolder (Creator)
  UserModel.hasMany(WorkFolderModel, {
    foreignKey: 'createdBy',
    as: 'createdFolders',
    onDelete: 'RESTRICT',
  });
  WorkFolderModel.belongsTo(UserModel, {
    foreignKey: 'createdBy',
    as: 'creator',
    onDelete: 'RESTRICT',
  });

  // Folder Activity Associations
  WorkFolderModel.hasMany(FolderActivityModel, {
    foreignKey: 'folderId',
    as: 'activities',
    onDelete: 'CASCADE',
  });
  FolderActivityModel.belongsTo(WorkFolderModel, {
    foreignKey: 'folderId',
    as: 'folder',
    onDelete: 'CASCADE',
  });
  WorkspaceModel.hasMany(FolderActivityModel, {
    foreignKey: 'workspaceId',
    as: 'folderActivities',
    onDelete: 'CASCADE',
  });
  FolderActivityModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });
  UserModel.hasMany(FolderActivityModel, {
    foreignKey: 'actorId',
    as: 'folderActivities',
    onDelete: 'SET NULL',
  });
  FolderActivityModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'actor',
    onDelete: 'SET NULL',
  });

  // Task Associations
  WorkspaceModel.hasMany(TaskModel, {
    foreignKey: 'workspaceId',
    as: 'tasks',
    onDelete: 'CASCADE',
  });
  TaskModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  WorkFolderModel.hasMany(TaskModel, { foreignKey: 'folderId', as: 'tasks', onDelete: 'RESTRICT' });
  TaskModel.belongsTo(WorkFolderModel, {
    foreignKey: 'folderId',
    as: 'folder',
    onDelete: 'RESTRICT',
  });

  UserModel.hasMany(TaskModel, {
    foreignKey: 'reporterId',
    as: 'reportedTasks',
    onDelete: 'RESTRICT',
  });
  TaskModel.belongsTo(UserModel, {
    foreignKey: 'reporterId',
    as: 'reporter',
    onDelete: 'RESTRICT',
  });

  UserModel.hasMany(TaskModel, {
    foreignKey: 'assigneeId',
    as: 'assignedTasks',
    onDelete: 'SET NULL',
  });
  TaskModel.belongsTo(UserModel, {
    foreignKey: 'assigneeId',
    as: 'assignee',
    onDelete: 'SET NULL',
  });

  UserModel.hasMany(TaskModel, {
    foreignKey: 'reviewedBy',
    as: 'reviewedTasks',
    onDelete: 'SET NULL',
  });
  TaskModel.belongsTo(UserModel, {
    foreignKey: 'reviewedBy',
    as: 'reviewer',
    onDelete: 'SET NULL',
  });

  // Self-referential Task (Parent / Subtasks)
  TaskModel.hasMany(TaskModel, {
    foreignKey: 'parentTaskId',
    as: 'subtasks',
    onDelete: 'RESTRICT',
  });
  TaskModel.belongsTo(TaskModel, {
    foreignKey: 'parentTaskId',
    as: 'parentTask',
    onDelete: 'RESTRICT',
  });

  // Task Attachment Associations
  TaskModel.hasMany(TaskAttachmentModel, {
    foreignKey: 'taskId',
    as: 'attachments',
    onDelete: 'CASCADE',
  });
  TaskAttachmentModel.belongsTo(TaskModel, {
    foreignKey: 'taskId',
    as: 'task',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(TaskAttachmentModel, {
    foreignKey: 'workspaceId',
    as: 'taskAttachments',
    onDelete: 'CASCADE',
  });
  TaskAttachmentModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TaskAttachmentModel, {
    foreignKey: 'uploaderId',
    as: 'uploadedTaskAttachments',
    onDelete: 'RESTRICT',
  });
  TaskAttachmentModel.belongsTo(UserModel, {
    foreignKey: 'uploaderId',
    as: 'uploader',
    onDelete: 'RESTRICT',
  });

  // Task Activity Associations
  TaskModel.hasMany(TaskActivityModel, {
    foreignKey: 'taskId',
    as: 'activities',
    onDelete: 'CASCADE',
  });
  TaskActivityModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task', onDelete: 'CASCADE' });

  WorkspaceModel.hasMany(TaskActivityModel, {
    foreignKey: 'workspaceId',
    as: 'taskActivities',
    onDelete: 'CASCADE',
  });
  TaskActivityModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TaskActivityModel, {
    foreignKey: 'actorId',
    as: 'taskActivities',
    onDelete: 'SET NULL',
  });
  TaskActivityModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'actor',
    onDelete: 'SET NULL',
  });

  // Task Discussion Comments Associations
  TaskModel.hasMany(TaskCommentModel, {
    foreignKey: 'taskId',
    as: 'comments',
    onDelete: 'CASCADE',
  });
  TaskCommentModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task', onDelete: 'CASCADE' });

  WorkspaceModel.hasMany(TaskCommentModel, {
    foreignKey: 'workspaceId',
    as: 'taskComments',
    onDelete: 'CASCADE',
  });
  TaskCommentModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TaskCommentModel, {
    foreignKey: 'authorId',
    as: 'authoredComments',
    onDelete: 'RESTRICT',
  });
  TaskCommentModel.belongsTo(UserModel, {
    foreignKey: 'authorId',
    as: 'author',
    onDelete: 'RESTRICT',
  });

  TaskCommentModel.hasMany(TaskCommentModel, {
    foreignKey: 'parentCommentId',
    as: 'replies',
    onDelete: 'CASCADE',
  });
  TaskCommentModel.belongsTo(TaskCommentModel, {
    foreignKey: 'parentCommentId',
    as: 'parentComment',
    onDelete: 'CASCADE',
  });

  // Task Comment Mentions Associations
  TaskCommentModel.hasMany(TaskCommentMentionModel, {
    foreignKey: 'commentId',
    as: 'mentions',
    onDelete: 'CASCADE',
  });
  TaskCommentMentionModel.belongsTo(TaskCommentModel, {
    foreignKey: 'commentId',
    as: 'comment',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TaskCommentMentionModel, {
    foreignKey: 'userId',
    as: 'commentMentions',
    onDelete: 'RESTRICT',
  });
  TaskCommentMentionModel.belongsTo(UserModel, {
    foreignKey: 'userId',
    as: 'user',
    onDelete: 'RESTRICT',
  });

  WorkspaceModel.hasMany(TaskCommentMentionModel, {
    foreignKey: 'workspaceId',
    as: 'commentMentions',
    onDelete: 'CASCADE',
  });
  TaskCommentMentionModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  // Requirement & Task Requirement Link Associations
  WorkspaceModel.hasMany(RequirementModel, {
    foreignKey: 'workspaceId',
    as: 'requirements',
    onDelete: 'CASCADE',
  });
  RequirementModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(RequirementModel, {
    foreignKey: 'createdBy',
    as: 'createdRequirements',
    onDelete: 'RESTRICT',
  });
  RequirementModel.belongsTo(UserModel, {
    foreignKey: 'createdBy',
    as: 'creator',
    onDelete: 'RESTRICT',
  });

  RequirementModel.hasMany(AcceptanceCriterionModel, {
    foreignKey: 'requirementId',
    as: 'acceptanceCriteria',
    onDelete: 'CASCADE',
  });
  AcceptanceCriterionModel.belongsTo(RequirementModel, {
    foreignKey: 'requirementId',
    as: 'requirement',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(AcceptanceCriterionModel, {
    foreignKey: 'workspaceId',
    as: 'acceptanceCriteria',
    onDelete: 'CASCADE',
  });
  AcceptanceCriterionModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(AcceptanceCriterionModel, {
    foreignKey: 'createdBy',
    as: 'createdAcceptanceCriteria',
    onDelete: 'RESTRICT',
  });
  AcceptanceCriterionModel.belongsTo(UserModel, {
    foreignKey: 'createdBy',
    as: 'creator',
    onDelete: 'RESTRICT',
  });

  TaskModel.hasMany(TaskRequirementModel, {
    foreignKey: 'taskId',
    as: 'requirementLinks',
    onDelete: 'CASCADE',
  });
  TaskRequirementModel.belongsTo(TaskModel, {
    foreignKey: 'taskId',
    as: 'task',
    onDelete: 'CASCADE',
  });

  RequirementModel.hasMany(TaskRequirementModel, {
    foreignKey: 'requirementId',
    as: 'taskLinks',
    onDelete: 'CASCADE',
  });
  TaskRequirementModel.belongsTo(RequirementModel, {
    foreignKey: 'requirementId',
    as: 'requirement',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TaskRequirementModel, {
    foreignKey: 'linkedBy',
    as: 'linkedTaskRequirements',
    onDelete: 'RESTRICT',
  });
  TaskRequirementModel.belongsTo(UserModel, {
    foreignKey: 'linkedBy',
    as: 'linker',
    onDelete: 'RESTRICT',
  });

  // QA Document Associations
  WorkspaceModel.hasMany(QaDocumentModel, {
    foreignKey: 'workspaceId',
    as: 'qaDocuments',
    onDelete: 'CASCADE',
  });
  QaDocumentModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  WorkFolderModel.hasMany(QaDocumentModel, {
    foreignKey: 'folderId',
    as: 'qaDocuments',
    onDelete: 'SET NULL',
  });
  QaDocumentModel.belongsTo(WorkFolderModel, {
    foreignKey: 'folderId',
    as: 'folder',
    onDelete: 'SET NULL',
  });

  QaDocumentModel.hasMany(QaDocumentVersionModel, {
    foreignKey: 'documentId',
    as: 'versions',
    onDelete: 'CASCADE',
  });
  QaDocumentVersionModel.belongsTo(QaDocumentModel, {
    foreignKey: 'documentId',
    as: 'document',
    onDelete: 'CASCADE',
  });

  TaskModel.hasMany(TaskDocumentModel, {
    foreignKey: 'taskId',
    as: 'documentLinks',
    onDelete: 'CASCADE',
  });
  TaskDocumentModel.belongsTo(TaskModel, { foreignKey: 'taskId', as: 'task', onDelete: 'CASCADE' });

  QaDocumentModel.hasMany(TaskDocumentModel, {
    foreignKey: 'documentId',
    as: 'taskLinks',
    onDelete: 'CASCADE',
  });
  TaskDocumentModel.belongsTo(QaDocumentModel, {
    foreignKey: 'documentId',
    as: 'document',
    onDelete: 'CASCADE',
  });

  // Requirement Test Cases Associations
  RequirementModel.hasMany(RequirementTestCaseModel, {
    foreignKey: 'requirementId',
    as: 'testCases',
    onDelete: 'CASCADE',
  });
  RequirementTestCaseModel.belongsTo(RequirementModel, {
    foreignKey: 'requirementId',
    as: 'requirement',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(RequirementTestCaseModel, {
    foreignKey: 'workspaceId',
    as: 'testCases',
    onDelete: 'CASCADE',
  });
  RequirementTestCaseModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  // Canonical Test Management Associations
  WorkspaceModel.hasMany(TestCaseModel, {
    foreignKey: 'workspaceId',
    as: 'canonicalTestCases',
    onDelete: 'CASCADE',
  });
  TestCaseModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TestCaseModel, {
    foreignKey: 'createdBy',
    as: 'createdCanonicalTestCases',
    onDelete: 'RESTRICT',
  });
  TestCaseModel.belongsTo(UserModel, {
    foreignKey: 'createdBy',
    as: 'creator',
    onDelete: 'RESTRICT',
  });

  TestCaseModel.hasMany(TestCaseRequirementModel, {
    foreignKey: 'testCaseId',
    as: 'requirementLinks',
    onDelete: 'CASCADE',
  });
  TestCaseRequirementModel.belongsTo(TestCaseModel, {
    foreignKey: 'testCaseId',
    as: 'testCase',
    onDelete: 'CASCADE',
  });

  RequirementModel.hasMany(TestCaseRequirementModel, {
    foreignKey: 'requirementId',
    as: 'canonicalTestCaseLinks',
    onDelete: 'CASCADE',
  });
  TestCaseRequirementModel.belongsTo(RequirementModel, {
    foreignKey: 'requirementId',
    as: 'requirement',
    onDelete: 'CASCADE',
  });

  TestCaseModel.hasMany(TestRunModel, {
    foreignKey: 'testCaseId',
    as: 'runs',
    onDelete: 'CASCADE',
  });
  TestRunModel.belongsTo(TestCaseModel, {
    foreignKey: 'testCaseId',
    as: 'testCase',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(TestRunModel, {
    foreignKey: 'workspaceId',
    as: 'testRuns',
    onDelete: 'CASCADE',
  });
  TestRunModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TestRunModel, {
    foreignKey: 'executorId',
    as: 'executedTestRuns',
    onDelete: 'RESTRICT',
  });
  TestRunModel.belongsTo(UserModel, {
    foreignKey: 'executorId',
    as: 'executor',
    onDelete: 'RESTRICT',
  });

  TestRunModel.hasOne(TestResultModel, {
    foreignKey: 'testRunId',
    as: 'result',
    onDelete: 'CASCADE',
  });
  TestResultModel.belongsTo(TestRunModel, {
    foreignKey: 'testRunId',
    as: 'run',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TestResultModel, {
    foreignKey: 'executorId',
    as: 'testResults',
    onDelete: 'RESTRICT',
  });
  TestResultModel.belongsTo(UserModel, {
    foreignKey: 'executorId',
    as: 'executor',
    onDelete: 'RESTRICT',
  });

  TestResultModel.hasMany(TestResultEvidenceModel, {
    foreignKey: 'testResultId',
    as: 'evidenceLinks',
    onDelete: 'CASCADE',
  });
  TestResultEvidenceModel.belongsTo(TestResultModel, {
    foreignKey: 'testResultId',
    as: 'result',
    onDelete: 'CASCADE',
  });

  TestResultModel.hasMany(TestResultEvidenceLinkModel, {
    foreignKey: 'testResultId',
    as: 'externalEvidenceLinks',
    onDelete: 'CASCADE',
  });
  TestResultEvidenceLinkModel.belongsTo(TestResultModel, {
    foreignKey: 'testResultId',
    as: 'result',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(TestResultEvidenceLinkModel, {
    foreignKey: 'workspaceId',
    as: 'testResultEvidenceLinks',
    onDelete: 'CASCADE',
  });
  TestResultEvidenceLinkModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TestResultEvidenceLinkModel, {
    foreignKey: 'addedBy',
    as: 'addedResultEvidenceLinks',
    onDelete: 'RESTRICT',
  });
  TestResultEvidenceLinkModel.belongsTo(UserModel, {
    foreignKey: 'addedBy',
    as: 'author',
    onDelete: 'RESTRICT',
  });

  TaskAttachmentModel.hasMany(TestResultEvidenceModel, {
    foreignKey: 'attachmentId',
    as: 'testResultLinks',
    onDelete: 'RESTRICT',
  });
  TestResultEvidenceModel.belongsTo(TaskAttachmentModel, {
    foreignKey: 'attachmentId',
    as: 'attachment',
    onDelete: 'RESTRICT',
  });

  TestCaseModel.hasMany(TestCaseActivityModel, {
    foreignKey: 'testCaseId',
    as: 'testActivity',
    onDelete: 'CASCADE',
  });
  TestCaseActivityModel.belongsTo(TestCaseModel, {
    foreignKey: 'testCaseId',
    as: 'testCase',
    onDelete: 'CASCADE',
  });

  TestRunModel.hasMany(TestCaseActivityModel, {
    foreignKey: 'testRunId',
    as: 'activity',
    onDelete: 'CASCADE',
  });
  TestCaseActivityModel.belongsTo(TestRunModel, {
    foreignKey: 'testRunId',
    as: 'run',
    onDelete: 'CASCADE',
  });

  TestResultModel.hasMany(TestCaseActivityModel, {
    foreignKey: 'testResultId',
    as: 'activity',
    onDelete: 'CASCADE',
  });
  TestCaseActivityModel.belongsTo(TestResultModel, {
    foreignKey: 'testResultId',
    as: 'result',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TestCaseActivityModel, {
    foreignKey: 'actorId',
    as: 'testCaseActivity',
    onDelete: 'RESTRICT',
  });
  TestCaseActivityModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'actor',
    onDelete: 'RESTRICT',
  });

  // Test Case Import Associations
  WorkspaceModel.hasMany(TestCaseImportModel, {
    foreignKey: 'workspaceId',
    as: 'testCaseImports',
    onDelete: 'CASCADE',
  });
  TestCaseImportModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TestCaseImportModel, {
    foreignKey: 'actorId',
    as: 'testCaseImports',
    onDelete: 'RESTRICT',
  });
  TestCaseImportModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'importer',
    onDelete: 'RESTRICT',
  });

  TestCaseImportModel.hasMany(TestCaseImportRowModel, {
    foreignKey: 'importId',
    as: 'rows',
    onDelete: 'CASCADE',
  });
  TestCaseImportRowModel.belongsTo(TestCaseImportModel, {
    foreignKey: 'importId',
    as: 'import',
    onDelete: 'CASCADE',
  });

  // First-class Bug & Retest Associations
  WorkspaceModel.hasMany(BugModel, { foreignKey: 'workspaceId', as: 'bugs', onDelete: 'CASCADE' });
  BugModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  TaskModel.hasMany(BugModel, {
    foreignKey: 'featureTaskId',
    as: 'featureBugs',
    onDelete: 'RESTRICT',
  });
  BugModel.belongsTo(TaskModel, {
    foreignKey: 'featureTaskId',
    as: 'featureTask',
    onDelete: 'RESTRICT',
  });

  RequirementModel.hasMany(BugModel, {
    foreignKey: 'requirementId',
    as: 'bugs',
    onDelete: 'RESTRICT',
  });
  BugModel.belongsTo(RequirementModel, {
    foreignKey: 'requirementId',
    as: 'requirement',
    onDelete: 'RESTRICT',
  });

  TestResultModel.hasMany(BugModel, {
    foreignKey: 'testResultId',
    as: 'bugs',
    onDelete: 'RESTRICT',
  });
  BugModel.belongsTo(TestResultModel, {
    foreignKey: 'testResultId',
    as: 'originatingTestResult',
    onDelete: 'RESTRICT',
  });

  UserModel.hasMany(BugModel, {
    foreignKey: 'assigneeId',
    as: 'assignedBugs',
    onDelete: 'RESTRICT',
  });
  BugModel.belongsTo(UserModel, { foreignKey: 'assigneeId', as: 'assignee', onDelete: 'RESTRICT' });

  UserModel.hasMany(BugModel, { foreignKey: 'createdBy', as: 'createdBugs', onDelete: 'RESTRICT' });
  BugModel.belongsTo(UserModel, { foreignKey: 'createdBy', as: 'creator', onDelete: 'RESTRICT' });

  BugModel.hasMany(BugEvidenceLinkModel, {
    foreignKey: 'bugId',
    as: 'externalEvidenceLinks',
    onDelete: 'CASCADE',
  });
  BugEvidenceLinkModel.belongsTo(BugModel, { foreignKey: 'bugId', as: 'bug', onDelete: 'CASCADE' });

  WorkspaceModel.hasMany(BugEvidenceLinkModel, {
    foreignKey: 'workspaceId',
    as: 'bugEvidenceLinks',
    onDelete: 'CASCADE',
  });
  BugEvidenceLinkModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(BugEvidenceLinkModel, {
    foreignKey: 'addedBy',
    as: 'addedBugEvidenceLinks',
    onDelete: 'RESTRICT',
  });
  BugEvidenceLinkModel.belongsTo(UserModel, {
    foreignKey: 'addedBy',
    as: 'author',
    onDelete: 'RESTRICT',
  });

  BugModel.hasMany(BugActivityModel, { foreignKey: 'bugId', as: 'activity', onDelete: 'CASCADE' });
  BugActivityModel.belongsTo(BugModel, { foreignKey: 'bugId', as: 'bug', onDelete: 'CASCADE' });

  UserModel.hasMany(BugActivityModel, {
    foreignKey: 'actorId',
    as: 'bugActivity',
    onDelete: 'RESTRICT',
  });
  BugActivityModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'actor',
    onDelete: 'RESTRICT',
  });

  // Immutable QA Sign-off & Release Decision Associations
  WorkspaceModel.hasMany(QaSignOffModel, {
    foreignKey: 'workspaceId',
    as: 'qaSignOffs',
    onDelete: 'CASCADE',
  });
  QaSignOffModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  TaskModel.hasMany(QaSignOffModel, {
    foreignKey: 'featureTaskId',
    as: 'qaSignOffs',
    onDelete: 'RESTRICT',
  });
  QaSignOffModel.belongsTo(TaskModel, {
    foreignKey: 'featureTaskId',
    as: 'featureTask',
    onDelete: 'RESTRICT',
  });

  UserModel.hasMany(QaSignOffModel, {
    foreignKey: 'signedBy',
    as: 'qaSignOffs',
    onDelete: 'RESTRICT',
  });
  QaSignOffModel.belongsTo(UserModel, {
    foreignKey: 'signedBy',
    as: 'signer',
    onDelete: 'RESTRICT',
  });

  WorkspaceModel.hasMany(ReleaseDecisionModel, {
    foreignKey: 'workspaceId',
    as: 'releaseDecisions',
    onDelete: 'CASCADE',
  });
  ReleaseDecisionModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  TaskModel.hasMany(ReleaseDecisionModel, {
    foreignKey: 'featureTaskId',
    as: 'releaseDecisions',
    onDelete: 'RESTRICT',
  });
  ReleaseDecisionModel.belongsTo(TaskModel, {
    foreignKey: 'featureTaskId',
    as: 'featureTask',
    onDelete: 'RESTRICT',
  });

  QaSignOffModel.hasMany(ReleaseDecisionModel, {
    foreignKey: 'qaSignOffId',
    as: 'releaseDecisions',
    onDelete: 'RESTRICT',
  });
  ReleaseDecisionModel.belongsTo(QaSignOffModel, {
    foreignKey: 'qaSignOffId',
    as: 'qaSignOff',
    onDelete: 'RESTRICT',
  });

  UserModel.hasMany(ReleaseDecisionModel, {
    foreignKey: 'decidedBy',
    as: 'releaseDecisions',
    onDelete: 'RESTRICT',
  });
  ReleaseDecisionModel.belongsTo(UserModel, {
    foreignKey: 'decidedBy',
    as: 'decider',
    onDelete: 'RESTRICT',
  });

  // Append-only QA Sign-off & Release Decision Cancellation Associations
  QaSignOffModel.hasOne(QaSignOffCancellationModel, {
    foreignKey: 'qaSignOffId',
    as: 'cancellation',
    onDelete: 'CASCADE',
  });
  QaSignOffCancellationModel.belongsTo(QaSignOffModel, {
    foreignKey: 'qaSignOffId',
    as: 'qaSignOff',
    onDelete: 'RESTRICT',
  });

  ReleaseDecisionModel.hasOne(ReleaseDecisionCancellationModel, {
    foreignKey: 'releaseDecisionId',
    as: 'cancellation',
    onDelete: 'CASCADE',
  });
  ReleaseDecisionCancellationModel.belongsTo(ReleaseDecisionModel, {
    foreignKey: 'releaseDecisionId',
    as: 'releaseDecision',
    onDelete: 'RESTRICT',
  });

  WorkspaceModel.hasMany(QaSignOffCancellationModel, {
    foreignKey: 'workspaceId',
    as: 'qaSignOffCancellations',
    onDelete: 'CASCADE',
  });
  QaSignOffCancellationModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(ReleaseDecisionCancellationModel, {
    foreignKey: 'workspaceId',
    as: 'releaseDecisionCancellations',
    onDelete: 'CASCADE',
  });
  ReleaseDecisionCancellationModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  TaskModel.hasMany(QaSignOffCancellationModel, {
    foreignKey: 'featureTaskId',
    as: 'qaSignOffCancellations',
    onDelete: 'RESTRICT',
  });
  QaSignOffCancellationModel.belongsTo(TaskModel, {
    foreignKey: 'featureTaskId',
    as: 'featureTask',
    onDelete: 'RESTRICT',
  });

  TaskModel.hasMany(ReleaseDecisionCancellationModel, {
    foreignKey: 'featureTaskId',
    as: 'releaseDecisionCancellations',
    onDelete: 'RESTRICT',
  });
  ReleaseDecisionCancellationModel.belongsTo(TaskModel, {
    foreignKey: 'featureTaskId',
    as: 'featureTask',
    onDelete: 'RESTRICT',
  });

  UserModel.hasMany(QaSignOffCancellationModel, {
    foreignKey: 'cancelledBy',
    as: 'qaSignOffCancellations',
    onDelete: 'RESTRICT',
  });
  QaSignOffCancellationModel.belongsTo(UserModel, {
    foreignKey: 'cancelledBy',
    as: 'canceller',
    onDelete: 'RESTRICT',
  });

  UserModel.hasMany(ReleaseDecisionCancellationModel, {
    foreignKey: 'cancelledBy',
    as: 'releaseDecisionCancellations',
    onDelete: 'RESTRICT',
  });
  ReleaseDecisionCancellationModel.belongsTo(UserModel, {
    foreignKey: 'cancelledBy',
    as: 'canceller',
    onDelete: 'RESTRICT',
  });

  // Notifications Associations
  UserModel.hasMany(NotificationModel, {
    foreignKey: 'userId',
    as: 'notifications',
    onDelete: 'CASCADE',
  });
  NotificationModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  UserModel.hasMany(NotificationModel, {
    foreignKey: 'actorId',
    as: 'actedNotifications',
    onDelete: 'SET NULL',
  });
  NotificationModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'actor',
    onDelete: 'SET NULL',
  });

  WorkspaceModel.hasMany(NotificationModel, {
    foreignKey: 'workspaceId',
    as: 'notifications',
    onDelete: 'CASCADE',
  });
  NotificationModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  TaskModel.hasMany(NotificationModel, {
    foreignKey: 'taskId',
    as: 'notifications',
    onDelete: 'SET NULL',
  });
  NotificationModel.belongsTo(TaskModel, {
    foreignKey: 'taskId',
    as: 'task',
    onDelete: 'SET NULL',
  });
}

setupAssociations();
