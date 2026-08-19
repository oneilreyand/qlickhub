import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TaskCreationPermissionAttributes {
  id: string;
  workspaceId: string;
  userId: string;
  grantedBy: string;
  expiresAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskCreationPermissionCreationAttributes
  extends Optional<
    TaskCreationPermissionAttributes,
    'id' | 'expiresAt' | 'createdAt' | 'updatedAt'
  > {}

export class TaskCreationPermissionModel
  extends Model<TaskCreationPermissionAttributes, TaskCreationPermissionCreationAttributes>
  implements TaskCreationPermissionAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare userId: string;
  declare grantedBy: string;
  declare expiresAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TaskCreationPermissionModel.init(
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
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    grantedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'granted_by',
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'expires_at',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'task_creation_permissions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_task_creation_permissions_workspace_user',
        unique: true,
        fields: ['workspace_id', 'user_id'],
      },
      {
        name: 'idx_task_creation_permissions_workspace',
        fields: ['workspace_id'],
      },
    ],
  }
);
