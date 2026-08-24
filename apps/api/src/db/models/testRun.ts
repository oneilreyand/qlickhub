import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestRunAttributes {
  id: string;
  workspaceId: string;
  testCaseId: string;
  build: string;
  environment: string;
  status: 'in_progress' | 'completed' | 'cancelled';
  executorId: string;
  startedAt?: Date;
  completedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

type TestRunCreationAttributes = Optional<
  TestRunAttributes,
  'id' | 'status' | 'startedAt' | 'completedAt' | 'createdAt' | 'updatedAt'
>;

export class TestRunModel
  extends Model<TestRunAttributes, TestRunCreationAttributes>
  implements TestRunAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare testCaseId: string;
  declare build: string;
  declare environment: string;
  declare status: 'in_progress' | 'completed' | 'cancelled';
  declare executorId: string;
  declare readonly startedAt: Date;
  declare completedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TestRunModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    testCaseId: { type: DataTypes.UUID, allowNull: false, field: 'test_case_id' },
    build: { type: DataTypes.STRING(100), allowNull: false },
    environment: { type: DataTypes.STRING(100), allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'in_progress' },
    executorId: { type: DataTypes.UUID, allowNull: false, field: 'executor_id' },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'started_at',
    },
    completedAt: { type: DataTypes.DATE, allowNull: true, field: 'completed_at' },
  },
  {
    sequelize,
    tableName: 'test_runs',
    underscored: true,
    timestamps: true,
  },
);
