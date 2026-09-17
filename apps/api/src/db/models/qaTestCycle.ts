import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface QaTestCycleAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  qaSubtaskId: string;
  readinessBaselineId: string;
  candidateFingerprint: string;
  build: string;
  environment: string;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'superseded';
  ownerQaId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

type QaTestCycleCreationAttributes = Optional<
  QaTestCycleAttributes,
  'id' | 'status' | 'createdAt' | 'updatedAt'
>;

export class QaTestCycleModel
  extends Model<QaTestCycleAttributes, QaTestCycleCreationAttributes>
  implements QaTestCycleAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare qaSubtaskId: string;
  declare readinessBaselineId: string;
  declare candidateFingerprint: string;
  declare build: string;
  declare environment: string;
  declare status: 'planned' | 'in_progress' | 'completed' | 'cancelled' | 'superseded';
  declare ownerQaId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

QaTestCycleModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    qaSubtaskId: { type: DataTypes.UUID, allowNull: false, field: 'qa_subtask_id' },
    readinessBaselineId: { type: DataTypes.UUID, allowNull: false, field: 'readiness_baseline_id' },
    candidateFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'candidate_fingerprint',
    },
    build: { type: DataTypes.STRING(100), allowNull: false },
    environment: { type: DataTypes.STRING(100), allowNull: false },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'in_progress' },
    ownerQaId: { type: DataTypes.UUID, allowNull: false, field: 'owner_qa_id' },
  },
  {
    sequelize,
    tableName: 'qa_test_cycles',
    underscored: true,
    timestamps: true,
  },
);
