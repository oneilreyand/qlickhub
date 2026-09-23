import { UserModel } from '../user.js';
import { WorkspaceModel } from '../workspace.js';
import { WorkFolderModel } from '../workFolder.js';
import { TaskModel } from '../task.js';
import { TaskAttachmentModel } from '../taskAttachment.js';
import { TaskDocumentModel } from '../taskDocument.js';
import { QaDocumentModel } from '../qaDocument.js';
import { QaDocumentVersionModel } from '../qaDocumentVersion.js';
import { TestCaseModel } from '../testCase.js';
import { TestCaseVersionModel } from '../testCaseVersion.js';
import { TestCaseVersionAcceptanceCriterionModel } from '../testCaseVersionAcceptanceCriterion.js';
import { QaTestCycleModel } from '../qaTestCycle.js';
import { QrisSandboxTransactionModel } from '../qrisSandboxTransaction.js';
import { TestCaseRequirementModel } from '../testCaseRequirement.js';
import { TestRunModel } from '../testRun.js';
import { TestResultModel } from '../testResult.js';
import { TestResultEvidenceModel } from '../testResultEvidence.js';
import { TestResultEvidenceLinkModel } from '../testResultEvidenceLink.js';
import { TestResultEvidenceManifestModel } from '../testResultEvidenceManifest.js';
import { TestCaseActivityModel } from '../testCaseActivity.js';
import { TestCaseImportModel } from '../testCaseImport.js';
import { TestCaseImportRowModel } from '../testCaseImportRow.js';
import { BugModel } from '../bug.js';
import { BugActivityModel } from '../bugActivity.js';
import { BugEvidenceLinkModel } from '../bugEvidenceLink.js';
import { BugResolutionEventModel } from '../bugResolutionEvent.js';
import { RequirementModel } from '../requirement.js';
import { AcceptanceCriterionModel } from '../acceptanceCriterion.js';

export function setupQaAssociations() {
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

  TestCaseModel.hasMany(TestCaseVersionModel, {
    foreignKey: 'testCaseId',
    as: 'versions',
    onDelete: 'CASCADE',
  });
  TestCaseVersionModel.belongsTo(TestCaseModel, {
    foreignKey: 'testCaseId',
    as: 'testCase',
    onDelete: 'CASCADE',
  });
  WorkspaceModel.hasMany(TestCaseVersionModel, {
    foreignKey: 'workspaceId',
    as: 'testCaseVersions',
    onDelete: 'CASCADE',
  });
  TestCaseVersionModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });
  UserModel.hasMany(TestCaseVersionModel, {
    foreignKey: 'authoredBy',
    as: 'authoredTestCaseVersions',
    onDelete: 'RESTRICT',
  });
  TestCaseVersionModel.belongsTo(UserModel, {
    foreignKey: 'authoredBy',
    as: 'author',
    onDelete: 'RESTRICT',
  });

  TestCaseVersionModel.hasMany(TestCaseVersionAcceptanceCriterionModel, {
    foreignKey: 'testCaseVersionId',
    as: 'acceptanceCriterionMappings',
    onDelete: 'CASCADE',
  });
  TestCaseVersionAcceptanceCriterionModel.belongsTo(TestCaseVersionModel, {
    foreignKey: 'testCaseVersionId',
    as: 'testCaseVersion',
    onDelete: 'CASCADE',
  });
  AcceptanceCriterionModel.hasMany(TestCaseVersionAcceptanceCriterionModel, {
    foreignKey: 'acceptanceCriterionId',
    as: 'testCaseVersionMappings',
    onDelete: 'RESTRICT',
  });
  TestCaseVersionAcceptanceCriterionModel.belongsTo(AcceptanceCriterionModel, {
    foreignKey: 'acceptanceCriterionId',
    as: 'acceptanceCriterion',
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

  TestCaseModel.hasMany(TestRunModel, {
    foreignKey: 'testCaseId',
    as: 'runs',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(QaTestCycleModel, {
    foreignKey: 'workspaceId',
    as: 'qaTestCycles',
    onDelete: 'CASCADE',
  });
  QaTestCycleModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });
  TaskModel.hasMany(QaTestCycleModel, {
    foreignKey: 'featureTaskId',
    as: 'featureQaTestCycles',
    onDelete: 'RESTRICT',
  });
  QaTestCycleModel.belongsTo(TaskModel, {
    foreignKey: 'featureTaskId',
    as: 'featureTask',
    onDelete: 'RESTRICT',
  });
  TaskModel.hasMany(QaTestCycleModel, {
    foreignKey: 'qaSubtaskId',
    as: 'qaSubtaskTestCycles',
    onDelete: 'RESTRICT',
  });
  QaTestCycleModel.belongsTo(TaskModel, {
    foreignKey: 'qaSubtaskId',
    as: 'qaSubtask',
    onDelete: 'RESTRICT',
  });
  UserModel.hasMany(QaTestCycleModel, {
    foreignKey: 'ownerQaId',
    as: 'ownedQaTestCycles',
    onDelete: 'RESTRICT',
  });
  QaTestCycleModel.belongsTo(UserModel, {
    foreignKey: 'ownerQaId',
    as: 'ownerQa',
    onDelete: 'RESTRICT',
  });
  QaTestCycleModel.hasMany(TestRunModel, {
    foreignKey: 'testCycleId',
    as: 'testRuns',
    onDelete: 'RESTRICT',
  });
  TestRunModel.belongsTo(QaTestCycleModel, {
    foreignKey: 'testCycleId',
    as: 'testCycle',
    onDelete: 'RESTRICT',
  });
  TestCaseVersionModel.hasMany(TestRunModel, {
    foreignKey: 'testCaseVersionId',
    as: 'testRuns',
    onDelete: 'RESTRICT',
  });
  TestRunModel.belongsTo(TestCaseVersionModel, {
    foreignKey: 'testCaseVersionId',
    as: 'testCaseVersion',
    onDelete: 'RESTRICT',
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

  WorkspaceModel.hasMany(QrisSandboxTransactionModel, {
    foreignKey: 'workspaceId',
    as: 'qrisSandboxTransactions',
    onDelete: 'CASCADE',
  });
  QrisSandboxTransactionModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });
  TestRunModel.hasMany(QrisSandboxTransactionModel, {
    foreignKey: 'testRunId',
    as: 'qrisSandboxTransactions',
    onDelete: 'RESTRICT',
  });
  QrisSandboxTransactionModel.belongsTo(TestRunModel, {
    foreignKey: 'testRunId',
    as: 'testRun',
    onDelete: 'RESTRICT',
  });
  TestCaseModel.hasMany(QrisSandboxTransactionModel, {
    foreignKey: 'testCaseId',
    as: 'qrisSandboxTransactions',
    onDelete: 'RESTRICT',
  });
  QrisSandboxTransactionModel.belongsTo(TestCaseModel, {
    foreignKey: 'testCaseId',
    as: 'testCase',
    onDelete: 'RESTRICT',
  });
  UserModel.hasMany(QrisSandboxTransactionModel, {
    foreignKey: 'createdBy',
    as: 'createdQrisSandboxTransactions',
    onDelete: 'RESTRICT',
  });
  QrisSandboxTransactionModel.belongsTo(UserModel, {
    foreignKey: 'createdBy',
    as: 'creator',
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

  TestResultModel.hasMany(TestResultEvidenceManifestModel, {
    foreignKey: 'testResultId',
    as: 'evidenceManifests',
    onDelete: 'CASCADE',
  });
  TestResultEvidenceManifestModel.belongsTo(TestResultModel, {
    foreignKey: 'testResultId',
    as: 'result',
    onDelete: 'CASCADE',
  });

  WorkspaceModel.hasMany(TestResultEvidenceManifestModel, {
    foreignKey: 'workspaceId',
    as: 'testResultEvidenceManifests',
    onDelete: 'CASCADE',
  });
  TestResultEvidenceManifestModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  UserModel.hasMany(TestResultEvidenceManifestModel, {
    foreignKey: 'sealedBy',
    as: 'sealedTestResultEvidenceManifests',
    onDelete: 'RESTRICT',
  });
  TestResultEvidenceManifestModel.belongsTo(UserModel, {
    foreignKey: 'sealedBy',
    as: 'sealer',
    onDelete: 'RESTRICT',
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

  BugResolutionEventModel.hasMany(BugEvidenceLinkModel, {
    foreignKey: 'resolutionEventId',
    as: 'evidenceLinks',
    onDelete: 'RESTRICT',
  });
  BugEvidenceLinkModel.belongsTo(BugResolutionEventModel, {
    foreignKey: 'resolutionEventId',
    as: 'resolutionEvent',
    onDelete: 'RESTRICT',
  });

  BugModel.hasMany(TestRunModel, {
    foreignKey: 'retestBugId',
    as: 'retestRuns',
    onDelete: 'RESTRICT',
  });
  TestRunModel.belongsTo(BugModel, {
    foreignKey: 'retestBugId',
    as: 'retestBug',
    onDelete: 'RESTRICT',
  });
  BugResolutionEventModel.hasOne(TestRunModel, {
    foreignKey: 'retestResolutionEventId',
    as: 'retestRun',
    onDelete: 'RESTRICT',
  });
  TestRunModel.belongsTo(BugResolutionEventModel, {
    foreignKey: 'retestResolutionEventId',
    as: 'retestResolutionEvent',
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
}
