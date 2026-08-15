import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TaskDocumentAttributes {
  id: string;
  workspaceId: string;
  taskId: string;
  documentId: string;
  linkedBy: string;
  createdAt?: Date;
}

export interface TaskDocumentCreationAttributes
  extends Optional<TaskDocumentAttributes, 'id' | 'createdAt'> {}

export class TaskDocumentModel
  extends Model<TaskDocumentAttributes, TaskDocumentCreationAttributes>
  implements TaskDocumentAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare taskId: string;
  declare documentId: string;
  declare linkedBy: string;
  declare readonly createdAt: Date;
  declare document?: any;
}

TaskDocumentModel.init(
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
    documentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'document_id',
    },
    linkedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'linked_by',
    },
  },
  {
    sequelize,
    tableName: 'task_documents',
    timestamps: true,
    updatedAt: false,
  }
);
