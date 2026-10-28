import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestResultAttributes {
  id: string;
  workspaceId: string;
  testRunId: string;
  status: 'passed' | 'failed' | 'blocked' | 'skipped';
  executorId: string;
  actualResult?: string | null;
  notes?: string | null;
  stepResults?: Array<{ index: number; checked: boolean }> | null;
  browser?: string | null;
  device?: string | null;
  executedAt?: Date;
  createdAt?: Date;
}

type TestResultCreationAttributes = Optional<
  TestResultAttributes,
  | 'id'
  | 'actualResult'
  | 'notes'
  | 'stepResults'
  | 'browser'
  | 'device'
  | 'executedAt'
  | 'createdAt'
>;

export class TestResultModel
  extends Model<TestResultAttributes, TestResultCreationAttributes>
  implements TestResultAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare testRunId: string;
  declare status: 'passed' | 'failed' | 'blocked' | 'skipped';
  declare executorId: string;
  declare actualResult: string | null;
  declare notes: string | null;
  declare stepResults: Array<{ index: number; checked: boolean }> | null;
  declare browser: string | null;
  declare device: string | null;
  declare readonly executedAt: Date;
  declare readonly createdAt: Date;
}

TestResultModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    testRunId: { type: DataTypes.UUID, allowNull: false, field: 'test_run_id' },
    status: { type: DataTypes.STRING(32), allowNull: false },
    executorId: { type: DataTypes.UUID, allowNull: false, field: 'executor_id' },
    actualResult: { type: DataTypes.TEXT, allowNull: true, field: 'actual_result' },
    notes: { type: DataTypes.TEXT, allowNull: true },
    stepResults: { type: DataTypes.JSONB, allowNull: true, field: 'step_results' },
    browser: { type: DataTypes.STRING(100), allowNull: true },
    device: { type: DataTypes.STRING(100), allowNull: true },
    executedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'executed_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'test_results',
    underscored: true,
    timestamps: false,
  },
);
