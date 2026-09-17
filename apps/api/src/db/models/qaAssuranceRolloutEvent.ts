import { DataTypes, Model, Optional } from 'sequelize';
import type { QaAssuranceRolloutMode } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

interface QaAssuranceRolloutEventAttributes {
  id: string;
  workspaceId: string;
  fromMode: QaAssuranceRolloutMode;
  toMode: QaAssuranceRolloutMode;
  reason: string;
  changedBy: string;
  changedAt?: Date;
}

export class QaAssuranceRolloutEventModel
  extends Model<
    QaAssuranceRolloutEventAttributes,
    Optional<QaAssuranceRolloutEventAttributes, 'id' | 'changedAt'>
  >
  implements QaAssuranceRolloutEventAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare fromMode: QaAssuranceRolloutMode;
  declare toMode: QaAssuranceRolloutMode;
  declare reason: string;
  declare changedBy: string;
  declare changedAt: Date;
}

QaAssuranceRolloutEventModel.init(
  {
    id: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    fromMode: { type: DataTypes.STRING(16), allowNull: false, field: 'from_mode' },
    toMode: { type: DataTypes.STRING(16), allowNull: false, field: 'to_mode' },
    reason: { type: DataTypes.TEXT, allowNull: false },
    changedBy: { type: DataTypes.UUID, allowNull: false, field: 'changed_by' },
    changedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'changed_at',
      defaultValue: DataTypes.NOW,
    },
  },
  { sequelize, tableName: 'qa_assurance_rollout_events', timestamps: false, underscored: true },
);
