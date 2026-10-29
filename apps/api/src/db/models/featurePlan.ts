import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export type FeaturePlanStatusValue = 'clarifying' | 'ready' | 'applied';

export interface FeaturePlanAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  ideaText: string;
  status: FeaturePlanStatusValue;
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeaturePlanCreationAttributes extends Optional<
  FeaturePlanAttributes,
  'id' | 'status' | 'createdAt' | 'updatedAt'
> {}

export class FeaturePlanModel
  extends Model<FeaturePlanAttributes, FeaturePlanCreationAttributes>
  implements FeaturePlanAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare ideaText: string;
  declare status: FeaturePlanStatusValue;
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

FeaturePlanModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: { type: DataTypes.UUID, allowNull: false, field: 'feature_task_id' },
    ideaText: { type: DataTypes.TEXT, allowNull: false, field: 'idea_text' },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'clarifying' },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'feature_plans',
    underscored: true,
    timestamps: true,
  },
);
