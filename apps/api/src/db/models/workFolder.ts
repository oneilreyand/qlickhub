import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface WorkFolderAttributes {
  id: string;
  workspaceId: string;
  parentFolderId?: string | null;
  name: string;
  position: number;
  createdBy: string;
  archivedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface WorkFolderCreationAttributes
  extends Optional<WorkFolderAttributes, 'id' | 'parentFolderId' | 'position' | 'archivedAt'> {}

export class WorkFolderModel
  extends Model<WorkFolderAttributes, WorkFolderCreationAttributes>
  implements WorkFolderAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare parentFolderId: string | null;
  declare name: string;
  declare position: number;
  declare createdBy: string;
  declare archivedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

WorkFolderModel.init(
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
    parentFolderId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_folder_id',
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'created_by',
    },
    archivedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'archived_at',
    },
  },
  {
    sequelize,
    tableName: 'work_folders',
    timestamps: true,
    underscored: true,
  }
);
