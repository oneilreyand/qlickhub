import { DataTypes, Model, Optional } from 'sequelize';
import type { FeatureSpecActorType } from '@qlick/contracts';
import { sequelize } from '../sequelize.js';

export interface FeatureSpecVersionAttributes {
  id: string;
  specId: string;
  workspaceId: string;
  version: number;
  snapshot: Record<string, unknown>;
  actorType: FeatureSpecActorType;
  actorId: string | null;
  via: string;
  createdAt?: Date;
}

export interface FeatureSpecVersionCreationAttributes extends Optional<
  FeatureSpecVersionAttributes,
  'id' | 'actorId' | 'createdAt'
> {}

export class FeatureSpecVersionModel
  extends Model<FeatureSpecVersionAttributes, FeatureSpecVersionCreationAttributes>
  implements FeatureSpecVersionAttributes
{
  declare id: string;
  declare specId: string;
  declare workspaceId: string;
  declare version: number;
  declare snapshot: Record<string, unknown>;
  declare actorType: FeatureSpecActorType;
  declare actorId: string | null;
  declare via: string;
  declare readonly createdAt: Date;
}

FeatureSpecVersionModel.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    specId: { type: DataTypes.UUID, allowNull: false, field: 'spec_id' },
    workspaceId: { type: DataTypes.UUID, allowNull: false, field: 'workspace_id' },
    version: { type: DataTypes.INTEGER, allowNull: false },
    snapshot: { type: DataTypes.JSONB, allowNull: false },
    actorType: { type: DataTypes.TEXT, allowNull: false, field: 'actor_type' },
    actorId: { type: DataTypes.UUID, allowNull: true, field: 'actor_id' },
    via: { type: DataTypes.TEXT, allowNull: false },
  },
  {
    sequelize,
    tableName: 'feature_spec_versions',
    underscored: true,
    timestamps: true,
    updatedAt: false,
  },
);
