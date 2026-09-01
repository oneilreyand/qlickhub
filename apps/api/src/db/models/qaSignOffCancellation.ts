import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface QaSignOffCancellationAttributes {
  id: string;
  workspaceId: string;
  qaSignOffId: string;
  featureTaskId: string;
  cancelledBy: string;
  cancelledAt?: Date;
  reason: string;
}

type QaSignOffCancellationCreationAttributes = Optional<
  QaSignOffCancellationAttributes,
  'id' | 'cancelledAt'
>;

export class QaSignOffCancellationModel
  extends Model<QaSignOffCancellationAttributes, QaSignOffCancellationCreationAttributes>
  implements QaSignOffCancellationAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare qaSignOffId: string;
  declare featureTaskId: string;
  declare cancelledBy: string;
  declare readonly cancelledAt: Date;
  declare reason: string;
}

QaSignOffCancellationModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    qaSignOffId: { type: DataTypes.UUID, allowNull: false, field: 'qa_sign_off_id' },
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
    tableName: 'qa_sign_off_cancellations',
    underscored: true,
    timestamps: false,
  },
);
