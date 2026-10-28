import { DataTypes, Model } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface SubtaskAcceptanceCheckAttributes {
  workspaceId: string;
  taskId: string;
  acceptanceCriterionId: string;
  checkedBy: string;
  checkedAt?: Date;
}

export class SubtaskAcceptanceCheckModel
  extends Model<SubtaskAcceptanceCheckAttributes, SubtaskAcceptanceCheckAttributes>
  implements SubtaskAcceptanceCheckAttributes
{
  declare workspaceId: string;
  declare taskId: string;
  declare acceptanceCriterionId: string;
  declare checkedBy: string;
  declare readonly checkedAt: Date;
}

SubtaskAcceptanceCheckModel.init(
  {
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    taskId: { type: DataTypes.UUID, allowNull: false, primaryKey: true, field: 'task_id' },
    acceptanceCriterionId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'acceptance_criterion_id',
    },
    checkedBy: { type: DataTypes.UUID, allowNull: false, field: 'checked_by' },
    checkedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'checked_at',
    },
  },
  {
    sequelize,
    tableName: 'subtask_acceptance_checks',
    underscored: true,
    timestamps: false,
  },
);
