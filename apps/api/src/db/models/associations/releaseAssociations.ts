import { UserModel } from '../user.js';
import { WorkspaceModel } from '../workspace.js';
import { TaskModel } from '../task.js';
import { RequirementModel } from '../requirement.js';
import { AcceptanceCriterionModel } from '../acceptanceCriterion.js';
import { TaskRequirementModel } from '../taskRequirement.js';
import { RequirementTestCaseModel } from '../requirementTestCase.js';
import { TestCaseRequirementModel } from '../testCaseRequirement.js';
import { QaSignOffModel } from '../qaSignOff.js';
import { QaSignOffCancellationModel } from '../qaSignOffCancellation.js';
import { ReleaseDecisionModel } from '../releaseDecision.js';
import { ReleaseDecisionCancellationModel } from '../releaseDecisionCancellation.js';

export function setupReleaseAssociations() {
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
}
