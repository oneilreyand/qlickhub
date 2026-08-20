import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TaskAttachmentAttributes {
  id: string;
  workspaceId: string;
  taskId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  storageRef: string;
  storageProvider: 'local' | 'google_drive';
  providerFileId?: string | null;
  category: 'product_media' | 'qa_evidence' | 'general';
  caption?: string | null;
  uploaderId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskAttachmentCreationAttributes
  extends Optional<TaskAttachmentAttributes, 'id' | 'storageProvider' | 'providerFileId' | 'category' | 'caption' | 'createdAt' | 'updatedAt'> {}

export class TaskAttachmentModel
  extends Model<TaskAttachmentAttributes, TaskAttachmentCreationAttributes>
  implements TaskAttachmentAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare taskId: string;
  declare fileName: string;
  declare fileSize: number;
  declare mimeType: string;
  declare storageRef: string;
  declare storageProvider: 'local' | 'google_drive';
  declare providerFileId: string | null;
  declare category: 'product_media' | 'qa_evidence' | 'general';
  declare caption: string | null;
  declare uploaderId: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TaskAttachmentModel.init(
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
    taskId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'task_id',
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      field: 'file_name',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'file_size',
    },
    mimeType: {
      type: DataTypes.STRING(127),
      allowNull: false,
      field: 'mime_type',
    },
    storageRef: {
      type: DataTypes.STRING(512),
      allowNull: false,
      field: 'storage_ref',
    },
    storageProvider: {
      type: DataTypes.STRING(24),
      allowNull: false,
      defaultValue: 'local',
      field: 'storage_provider',
    },
    providerFileId: {
      type: DataTypes.STRING(512),
      allowNull: true,
      field: 'provider_file_id',
    },
    category: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: 'general',
    },
    caption: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    uploaderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'uploader_id',
    },
  },
  {
    sequelize,
    tableName: 'task_attachments',
    underscored: true,
    timestamps: true,
  }
);
