import { DataTypes, Model, NonAttribute, Optional } from 'sequelize';
import { sequelize } from '../sequelize.js';
import type { NotificationType } from '@qlick/contracts';
import type { UserModel } from './user.js';
import type { WorkspaceModel } from './workspace.js';
import type { TaskModel } from './task.js';

export interface NotificationAttributes {
  id: string;
  userId: string;
  workspaceId: string;
  taskId?: string | null;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface NotificationCreationAttributes
  extends Optional<NotificationAttributes, 'id' | 'taskId' | 'actorId' | 'isRead' | 'readAt' | 'createdAt' | 'updatedAt'> {}

export class NotificationModel
  extends Model<NotificationAttributes, NotificationCreationAttributes>
  implements NotificationAttributes
{
  declare id: string;
  declare userId: string;
  declare workspaceId: string;
  declare taskId: string | null;
  declare actorId: string | null;
  declare type: NotificationType;
  declare title: string;
  declare message: string;
  declare isRead: boolean;
  declare readAt: Date | null;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  declare user?: NonAttribute<UserModel>;
  declare actor?: NonAttribute<UserModel>;
  declare workspace?: NonAttribute<WorkspaceModel>;
  declare task?: NonAttribute<TaskModel>;
}

NotificationModel.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
    },
    workspaceId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'workspace_id',
    },
    taskId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'task_id',
    },
    actorId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'actor_id',
    },
    type: {
      type: DataTypes.STRING(32),
      allowNull: false,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: 'is_read',
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'read_at',
    },
  },
  {
    sequelize,
    tableName: 'notifications',
    timestamps: true,
    underscored: true,
    indexes: [
      { name: 'idx_notifications_user_is_read_created', fields: ['user_id', 'is_read', 'created_at'] },
      { name: 'idx_notifications_workspace_id', fields: ['workspace_id'] },
      { name: 'idx_notifications_task_id', fields: ['task_id'] },
    ],
  }
);
