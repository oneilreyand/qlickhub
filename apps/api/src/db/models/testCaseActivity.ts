import { DataTypes, Model, Optional } from 'sequelize';
import type { TestActivityAction } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface TestCaseActivityAttributes {
  id: string;
  workspaceId: string;
  testCaseId: string;
  testRunId?: string | null;
  testResultId?: string | null;
  actorId: string;
  action: TestActivityAction;
  metadata?: Record<string, unknown> | null;
  createdAt?: Date;
}

type TestCaseActivityCreationAttributes = Optional<
  TestCaseActivityAttributes,
  'id' | 'testRunId' | 'testResultId' | 'metadata' | 'createdAt'
>;

export class TestCaseActivityModel
  extends Model<TestCaseActivityAttributes, TestCaseActivityCreationAttributes>
  implements TestCaseActivityAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare testCaseId: string;
  declare testRunId: string | null;
  declare testResultId: string | null;
  declare actorId: string;
  declare action: TestActivityAction;
  declare metadata: Record<string, unknown> | null;
  declare readonly createdAt: Date;
}

TestCaseActivityModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    testCaseId: { type: DataTypes.UUID, allowNull: false, field: 'test_case_id' },
    testRunId: { type: DataTypes.UUID, allowNull: true, field: 'test_run_id' },
    testResultId: { type: DataTypes.UUID, allowNull: true, field: 'test_result_id' },
    actorId: { type: DataTypes.UUID, allowNull: false, field: 'actor_id' },
    action: { type: DataTypes.STRING(100), allowNull: false },
    metadata: { type: DataTypes.JSONB, allowNull: true, field: 'metadata_json' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'test_case_activity',
    underscored: true,
    timestamps: false,
  },
);
