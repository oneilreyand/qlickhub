import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface FolderActivityAttributes {
  id: string;
  workspaceId: string;
  folderId: string;
  actorId?: string | null;
  action: string;
  metadataJson?: Record<string, unknown> | null;
  createdAt?: Date;
}

export interface FolderActivityCreationAttributes extends Optional<
  FolderActivityAttributes,
  'id' | 'actorId' | 'metadataJson' | 'createdAt'
> {}

export class FolderActivityModel
  extends Model<FolderActivityAttributes, FolderActivityCreationAttributes>
  implements FolderActivityAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare folderId: string;
  declare actorId: string | null;
  declare action: string;
  declare metadataJson: Record<string, unknown> | null;
  declare readonly createdAt: Date;
}

FolderActivityModel.init(
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
    folderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'folder_id',
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'actor_id',
    },
    action: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    metadataJson: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: 'metadata_json',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: 'created_at',
    },
  },
  {
    sequelize,
    tableName: 'folder_activity',
    timestamps: false,
    underscored: true,
  },
);
