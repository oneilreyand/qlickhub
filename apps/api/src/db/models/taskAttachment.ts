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
  uploaderId: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskAttachmentCreationAttributes
  extends Optional<TaskAttachmentAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

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
    uploaderId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'uploader_id',
    },
  },
  {
    sequelize,
    tableName: 'task_attachments',
    timestamps: true,
  }
);
