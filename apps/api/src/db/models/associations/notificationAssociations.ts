import { UserModel } from '../user.js';
import { WorkspaceModel } from '../workspace.js';
import { TaskModel } from '../task.js';
import { NotificationModel } from '../notification.js';

export function setupNotificationAssociations() {
  UserModel.hasMany(NotificationModel, {
    foreignKey: 'userId',
    as: 'notifications',
    onDelete: 'CASCADE',
  });
  NotificationModel.belongsTo(UserModel, { foreignKey: 'userId', as: 'user', onDelete: 'CASCADE' });

  UserModel.hasMany(NotificationModel, {
    foreignKey: 'actorId',
    as: 'actedNotifications',
    onDelete: 'SET NULL',
  });
  NotificationModel.belongsTo(UserModel, {
    foreignKey: 'actorId',
    as: 'actor',
    onDelete: 'SET NULL',
  });

  WorkspaceModel.hasMany(NotificationModel, {
    foreignKey: 'workspaceId',
    as: 'notifications',
    onDelete: 'CASCADE',
  });
  NotificationModel.belongsTo(WorkspaceModel, {
    foreignKey: 'workspaceId',
    as: 'workspace',
    onDelete: 'CASCADE',
  });

  TaskModel.hasMany(NotificationModel, {
    foreignKey: 'taskId',
    as: 'notifications',
    onDelete: 'SET NULL',
  });
  NotificationModel.belongsTo(TaskModel, {
    foreignKey: 'taskId',
    as: 'task',
    onDelete: 'SET NULL',
  });
}
