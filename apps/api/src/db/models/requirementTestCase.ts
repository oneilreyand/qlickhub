import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface RequirementTestCaseAttributes {
  id: string;
  workspaceId: string;
  requirementId: string;
  title: string;
  testType: 'e2e' | 'integration' | 'unit' | 'manual';
  status: 'passed' | 'failed' | 'pending' | 'skipped';
  executionDetails?: string | null;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RequirementTestCaseCreationAttributes
  extends Optional<RequirementTestCaseAttributes, 'id' | 'testType' | 'status' | 'executionDetails' | 'createdAt' | 'updatedAt'> {}

export class RequirementTestCaseModel
  extends Model<RequirementTestCaseAttributes, RequirementTestCaseCreationAttributes>
  implements RequirementTestCaseAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare requirementId: string;
  declare title: string;
  declare testType: 'e2e' | 'integration' | 'unit' | 'manual';
  declare status: 'passed' | 'failed' | 'pending' | 'skipped';
  declare executionDetails: string | null;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

RequirementTestCaseModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    requirementId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'requirement_id',
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    testType: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'manual',
      field: 'test_type',
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'pending',
    },
    executionDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'execution_details',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
  },
  {
    sequelize,
    tableName: 'requirement_test_cases',
    timestamps: true,
  }
);
