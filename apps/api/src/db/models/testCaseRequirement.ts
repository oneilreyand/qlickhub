import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestCaseRequirementAttributes {
  workspaceId: string;
  testCaseId: string;
  requirementId: string;
  linkedBy: string;
  linkedAt?: Date;
}

export class TestCaseRequirementModel
  extends Model<TestCaseRequirementAttributes, TestCaseRequirementAttributes>
  implements TestCaseRequirementAttributes
{
  declare workspaceId: string;
  declare testCaseId: string;
  declare requirementId: string;
  declare linkedBy: string;
  declare readonly linkedAt: Date;
}

TestCaseRequirementModel.init(
  {
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'workspace_id',
    },
    testCaseId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'test_case_id' },
    requirementId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'requirement_id',
    },
    linkedBy: { type: DataTypes.UUID, allowNull: false, field: 'linked_by' },
    linkedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'linked_at',
    },
  },
  {
    sequelize,
    tableName: 'test_case_requirements',
    underscored: true,
    timestamps: false,
  },
);
