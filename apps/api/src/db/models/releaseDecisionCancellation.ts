import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface ReleaseDecisionCancellationAttributes {
  id: string;
  workspaceId: string;
  releaseDecisionId: string;
  featureTaskId: string;
  cancelledBy: string;
  cancelledAt?: Date;
  reason: string;
}

type ReleaseDecisionCancellationCreationAttributes = Optional<
  ReleaseDecisionCancellationAttributes,
  'id' | 'cancelledAt'
>;

export class ReleaseDecisionCancellationModel
  extends Model<
    ReleaseDecisionCancellationAttributes,
    ReleaseDecisionCancellationCreationAttributes
  >
  implements ReleaseDecisionCancellationAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare releaseDecisionId: string;
  declare featureTaskId: string;
  declare cancelledBy: string;
  declare readonly cancelledAt: Date;
  declare reason: string;
}

ReleaseDecisionCancellationModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    releaseDecisionId: { type: DataTypes.UUID, allowNull: false, field: 'release_decision_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    cancelledBy: { type: DataTypes.UUID, allowNull: false, field: 'cancelled_by' },
    cancelledAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'cancelled_at',
    },
    reason: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    tableName: 'release_decision_cancellations',
    underscored: true,
    timestamps: false,
  },
);
