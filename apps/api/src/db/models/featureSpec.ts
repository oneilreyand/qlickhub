import { DataTypes, Model, Optional } from 'sequelize';
import type {
  FeatureSpecPlan,
  FeatureSpecPrd,
  FeatureSpecStatus,
  FeatureSpecTasks,
} from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface FeatureSpecAttributes {
  id: string;
  workspaceId: string;
  featureTaskId: string;
  version: number;
  status: FeatureSpecStatus;
  plan: FeatureSpecPlan;
  prd: FeatureSpecPrd;
  tasks: FeatureSpecTasks;
  applyFingerprint: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FeatureSpecCreationAttributes extends Optional<
  FeatureSpecAttributes,
  | 'id'
  | 'version'
  | 'status'
  | 'plan'
  | 'prd'
  | 'tasks'
  | 'applyFingerprint'
  | 'createdAt'
  | 'updatedAt'
> {}

export class FeatureSpecModel
  extends Model<FeatureSpecAttributes, FeatureSpecCreationAttributes>
  implements FeatureSpecAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare featureTaskId: string;
  declare version: number;
  declare status: FeatureSpecStatus;
  declare plan: FeatureSpecPlan;
  declare prd: FeatureSpecPrd;
  declare tasks: FeatureSpecTasks;
  declare applyFingerprint: string | null;
  declare createdBy: string;
  declare updatedBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

FeatureSpecModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    featureTaskId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'feature_task_id',
    },
    version: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    status: { type: DataTypes.TEXT, allowNull: false, defaultValue: 'plan' },
    plan: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    prd: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    tasks: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    applyFingerprint: {
      type: DataTypes.TEXT,
      allowNull: true,
      unique: true,
      field: 'apply_fingerprint',
    },
    createdBy: { type: DataTypes.UUID, allowNull: false, field: 'created_by' },
    updatedBy: { type: DataTypes.UUID, allowNull: false, field: 'updated_by' },
  },
  {
    sequelize,
    tableName: 'feature_specs',
    underscored: true,
    timestamps: true,
  },
);
