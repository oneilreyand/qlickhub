import { DataTypes, Model, Optional } from 'sequelize';
import type { QaSignOffDecision, ReadinessSnapshot } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface QaSignOffAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  decision: QaSignOffDecision;
  notes?: string | null;
  readinessSnapshot: ReadinessSnapshot;
  signedBy: string;
  signedAt?: Date;
}

type QaSignOffCreationAttributes = Optional<QaSignOffAttributes, 'id' | 'notes' | 'signedAt'>;

export class QaSignOffModel
  extends Model<QaSignOffAttributes, QaSignOffCreationAttributes>
  implements QaSignOffAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare decision: QaSignOffDecision;
  declare notes: string | null;
  declare readinessSnapshot: ReadinessSnapshot;
  declare signedBy: string;
  declare readonly signedAt: Date;
}

QaSignOffModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
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
