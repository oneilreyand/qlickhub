import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TestRunAttributes {
  id: string;
  workspaceId: string;
  testCaseId: string;
  featureTaskId?: string | null;
  qaSubtaskId?: string | null;
  testCycleId?: string | null;
  testCaseVersionId?: string | null;
  readinessBaselineId?: string | null;
  candidateFingerprint?: string | null;
  retestBugId?: string | null;
  retestResolutionEventId?: string | null;
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
  | 'id'
  | 'featureTaskId'
  | 'qaSubtaskId'
  | 'testCycleId'
  | 'testCaseVersionId'
  | 'readinessBaselineId'
  | 'candidateFingerprint'
  | 'retestBugId'
  | 'retestResolutionEventId'
  | 'status'
  | 'startedAt'
  | 'completedAt'
  | 'createdAt'
  | 'updatedAt'
>;

export class TestRunModel
  extends Model<TestRunAttributes, TestRunCreationAttributes>
  implements TestRunAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare testCaseId: string;
  declare featureTaskId: string | null;
  declare qaSubtaskId: string | null;
  declare testCycleId: string | null;
  declare testCaseVersionId: string | null;
  declare readinessBaselineId: string | null;
  declare candidateFingerprint: string | null;
  declare retestBugId: string | null;
  declare retestResolutionEventId: string | null;
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
    featureTaskId: { type: DataTypes.UUID, allowNull: true, field: 'feature_task_id' },
    qaSubtaskId: { type: DataTypes.UUID, allowNull: true, field: 'qa_subtask_id' },
    testCycleId: { type: DataTypes.UUID, allowNull: true, field: 'test_cycle_id' },
    testCaseVersionId: { type: DataTypes.UUID, allowNull: true, field: 'test_case_version_id' },
    readinessBaselineId: { type: DataTypes.UUID, allowNull: true, field: 'readiness_baseline_id' },
    candidateFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'candidate_fingerprint',
    },
    retestBugId: { type: DataTypes.UUID, allowNull: true, field: 'retest_bug_id' },
    retestResolutionEventId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'retest_resolution_event_id',
    },
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
