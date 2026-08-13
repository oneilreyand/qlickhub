import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TaskCommentAttributes {
  id: string;
  workspaceId: string;
  taskId: string;
  authorId: string;
  parentCommentId?: string | null;
  body: string;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TaskCommentCreationAttributes
  extends Optional<
    TaskCommentAttributes,
    'id' | 'parentCommentId' | 'editedAt' | 'deletedAt' | 'createdAt' | 'updatedAt'
  > {}

export class TaskCommentModel
  extends Model<TaskCommentAttributes, TaskCommentCreationAttributes>
  implements TaskCommentAttributes
{
  declare id: string;
  declare workspaceId: string;
  declare taskId: string;
  declare authorId: string;
  declare parentCommentId: string | null;
  declare body: string;
  declare editedAt: Date | null;
  declare deletedAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;
}

TaskCommentModel.init(
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
    authorId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'author_id',
    },
    parentCommentId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'parent_comment_id',
    },
    body: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    editedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'edited_at',
    },
    deletedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'deleted_at',
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
    tableName: 'task_comments',
    timestamps: true,
    underscored: true,
  }
);
