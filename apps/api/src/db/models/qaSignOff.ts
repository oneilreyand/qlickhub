import { DataTypes, Model, Optional } from 'sequelize';
import type { QaSignOffDecision, ReadinessSnapshot } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

import type { QaSignOffCancellationModel } from './qaSignOffCancellation.js';

export interface QaSignOffAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  qaSubtaskId?: string | null;
  testCycleId?: string | null;
  readinessBaselineId?: string | null;
  candidateFingerprint?: string | null;
  decision: QaSignOffDecision;
  notes?: string | null;
  readinessSnapshot: ReadinessSnapshot;
  signedBy: string;
  signedAt?: Date;
  cancellation?: QaSignOffCancellationModel | null;
}

type QaSignOffCreationAttributes = Optional<
  QaSignOffAttributes,
  | 'id'
  | 'qaSubtaskId'
  | 'testCycleId'
  | 'readinessBaselineId'
  | 'candidateFingerprint'
  | 'notes'
  | 'signedAt'
  | 'cancellation'
>;

export class QaSignOffModel
  extends Model<QaSignOffAttributes, QaSignOffCreationAttributes>
  implements QaSignOffAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare qaSubtaskId: string | null;
  declare testCycleId: string | null;
  declare readinessBaselineId: string | null;
  declare candidateFingerprint: string | null;
  declare decision: QaSignOffDecision;
  declare notes: string | null;
  declare readinessSnapshot: ReadinessSnapshot;
  declare signedBy: string;
  declare readonly signedAt: Date;
  declare cancellation?: QaSignOffCancellationModel | null;
}

QaSignOffModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    qaSubtaskId: { type: DataTypes.UUID, allowNull: true, field: 'qa_subtask_id' },
    testCycleId: { type: DataTypes.UUID, allowNull: true, field: 'test_cycle_id' },
    readinessBaselineId: { type: DataTypes.UUID, allowNull: true, field: 'readiness_baseline_id' },
    candidateFingerprint: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'candidate_fingerprint',
    },
    decision: { type: DataTypes.STRING(32), allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    readinessSnapshot: {
      type: DataTypes.JSONB,
      allowNull: false,
      field: 'readiness_snapshot_json',
    },
    signedBy: { type: DataTypes.UUID, allowNull: false, field: 'signed_by' },
    signedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'signed_at',
    },
  },
  {
    sequelize,
    tableName: 'qa_sign_offs',
    underscored: true,
    timestamps: false,
  },
);
