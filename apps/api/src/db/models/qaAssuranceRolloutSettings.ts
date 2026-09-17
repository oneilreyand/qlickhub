import { DataTypes, Model, Optional } from 'sequelize';
import type { QaAssuranceRolloutMode } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

interface QaAssuranceRolloutSettingsAttributes {
  workspaceId: string;
  mode: QaAssuranceRolloutMode;
  updatedBy: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export class QaAssuranceRolloutSettingsModel
  extends Model<
    QaAssuranceRolloutSettingsAttributes,
    Optional<QaAssuranceRolloutSettingsAttributes, 'updatedBy' | 'createdAt' | 'updatedAt'>
  >
  implements QaAssuranceRolloutSettingsAttributes
{
  declare workspaceId: string;
  declare mode: QaAssuranceRolloutMode;
  declare updatedBy: string | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

QaAssuranceRolloutSettingsModel.init(
  {
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'workspace_id',
    },
    mode: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'observe' },
    updatedBy: { type: DataTypes.UUID, allowNull: true, field: 'updated_by' },
  },
  { sequelize, tableName: 'qa_assurance_rollout_settings', timestamps: true, underscored: true },
);
