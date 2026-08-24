import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';
import { WorkspaceRole } from '@qlick/contracts';

export interface WorkspaceMemberAttributes {
  id: string;
  workspaceId: string;
  userId: string;
  role: WorkspaceRole;
  joinedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

export interface WorkspaceMemberCreationAttributes extends Optional<
  WorkspaceMemberAttributes,
  'id' | 'role' | 'joinedAt' | 'deletedAt'
> {}

export class WorkspaceMemberModel
  extends Model<WorkspaceMemberAttributes, WorkspaceMemberCreationAttributes>
  implements WorkspaceMemberAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare userId: string;
  declare role: WorkspaceRole;
  declare joinedAt: Date;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
  declare deletedAt: Date | null;
}

WorkspaceMemberModel.init(
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
    role: {
      type: DataTypes.ENUM('owner', 'admin', 'po', 'dev', 'qa'),
      allowNull: false,
      defaultValue: 'dev',
    },
    joinedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'joined_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
    },
  },
  {
    sequelize,
    tableName: 'workspace_members',
    timestamps: true,
    paranoid: true,
    underscored: true,
  },
);
