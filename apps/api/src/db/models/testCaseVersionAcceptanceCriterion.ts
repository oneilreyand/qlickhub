import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize.js';

export type TestCaseVersionAcceptanceCriterionMappingStatus = 'mapped' | 'excluded';

export interface TestCaseVersionAcceptanceCriterionAttributes {
  workspaceId: string;
  testCaseVersionId: string;
  acceptanceCriterionId: string;
  mappingStatus: TestCaseVersionAcceptanceCriterionMappingStatus;
  exclusionReason?: string | null;
  mappedBy: string;
  mappedAt?: Date;
}

export class TestCaseVersionAcceptanceCriterionModel
  extends Model<
    TestCaseVersionAcceptanceCriterionAttributes,
    TestCaseVersionAcceptanceCriterionAttributes
  >
  implements TestCaseVersionAcceptanceCriterionAttributes
{
  declare workspaceId: string;
  declare testCaseVersionId: string;
  declare acceptanceCriterionId: string;
  declare mappingStatus: TestCaseVersionAcceptanceCriterionMappingStatus;
  declare exclusionReason: string | null;
  declare mappedBy: string;
  declare readonly mappedAt: Date;
}

TestCaseVersionAcceptanceCriterionModel.init(
  {
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'workspace_id',
    },
    testCaseVersionId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'test_case_version_id',
    },
    acceptanceCriterionId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'acceptance_criterion_id',
    },
    mappingStatus: { type: DataTypes.STRING(32), allowNull: false, field: 'mapping_status' },
    exclusionReason: { type: DataTypes.TEXT, allowNull: true, field: 'exclusion_reason' },
    mappedBy: { type: DataTypes.UUID, allowNull: false, field: 'mapped_by' },
    mappedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'mapped_at',
    },
  },
  {
    sequelize,
    tableName: 'test_case_version_acceptance_criteria',
    underscored: true,
    timestamps: false,
  },
);
