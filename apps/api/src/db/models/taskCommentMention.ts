import { DataTypes, Model, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';

export interface TaskCommentMentionAttributes {
  commentId: string;
  userId: string;
  workspaceId: string;
  createdAt?: Date;
}

export interface TaskCommentMentionCreationAttributes
  extends Optional<TaskCommentMentionAttributes, 'createdAt'> {}

export class TaskCommentMentionModel
  extends Model<TaskCommentMentionAttributes, TaskCommentMentionCreationAttributes>
  implements TaskCommentMentionAttributes
{
  declare commentId: string;
  declare userId: string;
  declare workspaceId: string;
  declare readonly createdAt: Date;
}

TaskCommentMentionModel.init(
  {
    commentId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'comment_id',
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'user_id',
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
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
    tableName: 'task_comment_mentions',
    timestamps: false,
    underscored: true,
  }
);
