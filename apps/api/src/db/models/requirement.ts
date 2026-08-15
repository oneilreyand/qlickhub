import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface RequirementAttributes {
  id: string;
  workspaceId: string;
  code: string;
  title: string;
  description?: string | null;
  status: 'draft' | 'active' | 'deprecated';
  createdBy: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RequirementCreationAttributes
  extends Optional<RequirementAttributes, 'id' | 'description' | 'status' | 'createdAt' | 'updatedAt'> {}

export class RequirementModel
  extends Model<RequirementAttributes, RequirementCreationAttributes>
  implements RequirementAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare code: string;
  declare title: string;
  declare description: string | null;
  declare status: 'draft' | 'active' | 'deprecated';
  declare createdBy: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

RequirementModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: 'active',
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
  },
  {
    sequelize,
    tableName: 'requirements',
    timestamps: true,
  }
);
