import { Op } from 'sequelize';
import {
  InAppNotification,
  ListNotificationsQuery,
  ListNotificationsResponse,
  NotificationType,
} from '@qlick/contracts';
import { NotificationModel, UserModel, TaskModel } from '../../db/models/index.js';
import { fcmService } from '../../services/fcmService.js';

export interface CreateNotificationParams {
  userId: string;
  workspaceId: string;
  taskId?: string | null;
  actorId?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  sendFcm?: boolean;
}

function formatNotification(record: NotificationModel): InAppNotification {
  const actorName = record.actor
    ? record.actor.name || record.actor.email.split('@')[0]
    : undefined;

  return {
    id: record.id,
    userId: record.userId,
    workspaceId: record.workspaceId,
    taskId: record.taskId || undefined,
    actorId: record.actorId || undefined,
    actorName,
    type: record.type,
    title: record.title,
    message: record.message,
    isRead: record.isRead,
    readAt: record.readAt ? record.readAt.toISOString() : undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt ? record.updatedAt.toISOString() : undefined,
  };
}

export class NotificationService {
  /**
   * Creates a single in-app notification and dispatches FCM push notification.
   */
  async createNotification(params: CreateNotificationParams): Promise<InAppNotification> {
    const { userId, workspaceId, taskId, actorId, type, title, message, sendFcm = true } = params;

    const record = await NotificationModel.create({
      userId,
      workspaceId,
      taskId: taskId || null,
      actorId: actorId || null,
      type,
      title,
      message,
      isRead: false,
    });

    if (sendFcm) {
      fcmService
        .sendToUser(userId, {
          title,
          body: message,
          data: {
            type,
            taskId: taskId || '',
            workspaceId,
            notificationId: record.id,
          },
        })
        .catch((err) => {
          console.warn('⚠️ Failed to dispatch FCM push notification:', err instanceof Error ? err.message : err);
        });
    }

    const fetched = await NotificationModel.findByPk(record.id, {
      include: [{ model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] }],
    });

    return formatNotification(fetched || record);
  }

  /**
   * Creates multiple in-app notifications in bulk and dispatches FCM multicast push.
   */
  async createBulkNotifications(
    paramsList: Array<CreateNotificationParams>,
    sendFcm = true
  ): Promise<InAppNotification[]> {
    if (paramsList.length === 0) return [];

    const createdRecords = await NotificationModel.bulkCreate(
      paramsList.map((p) => ({
        userId: p.userId,
        workspaceId: p.workspaceId,
        taskId: p.taskId || null,
        actorId: p.actorId || null,
        type: p.type,
        title: p.title,
        message: p.message,
        isRead: false,
      }))
    );

    if (sendFcm) {
      // Group by distinct title/message/type/taskId/workspaceId for multicast efficiency
      const groups = new Map<string, { userIds: string[]; title: string; body: string; data: Record<string, string> }>();

      for (const p of paramsList) {
        const key = `${p.type}:${p.taskId || ''}:${p.title}:${p.message}`;
        if (!groups.has(key)) {
          groups.set(key, {
            userIds: [p.userId],
            title: p.title,
            body: p.message,
            data: {
              type: p.type,
              taskId: p.taskId || '',
              workspaceId: p.workspaceId,
            },
          });
        } else {
          groups.get(key)!.userIds.push(p.userId);
        }
      }

      for (const group of groups.values()) {
        fcmService
          .sendToUsers(group.userIds, {
            title: group.title,
            body: group.body,
            data: group.data,
          })
          .catch((err) => {
            console.warn('⚠️ Failed to dispatch bulk FCM push notification:', err instanceof Error ? err.message : err);
          });
      }
    }

    const ids = createdRecords.map((r) => r.id);
    const fetched = await NotificationModel.findAll({
      where: { id: { [Op.in]: ids } },
      include: [{ model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
    });

    return fetched.map(formatNotification);
  }

  /**
   * Lists user notifications with optional workspace and unread filtering, plus unread count.
   */
  async listUserNotifications(
    userId: string,
    query: ListNotificationsQuery
  ): Promise<ListNotificationsResponse> {
    const where: any = { userId };

    if (query.workspaceId) {
      where.workspaceId = query.workspaceId;
    }

    if (query.unreadOnly) {
      where.isRead = false;
    }

    if (query.type) {
      where.type = query.type;
    }

    const limit = query.limit ?? 20;
    const offset = query.offset ?? 0;

    const { rows, count } = await NotificationModel.findAndCountAll({
      where,
      include: [{ model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] }],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    // Unread count specifically for the user (and workspace if filtered)
    const unreadWhere: any = { userId, isRead: false };
    if (query.workspaceId) {
      unreadWhere.workspaceId = query.workspaceId;
    }
    const unreadCount = await NotificationModel.count({ where: unreadWhere });

    return {
      notifications: rows.map(formatNotification),
      unreadCount,
      totalCount: count,
    };
  }

  /**
   * Marks a specific notification as read.
   */
  async markAsRead(userId: string, notificationId: string): Promise<InAppNotification> {
    const record = await NotificationModel.findOne({
      where: { id: notificationId, userId },
      include: [{ model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] }],
    });

    if (!record) {
      throw new Error('NOT_FOUND: Notification not found.');
    }

    if (!record.isRead) {
      record.isRead = true;
      record.readAt = new Date();
      await record.save();
    }

    return formatNotification(record);
  }

  /**
   * Marks all unread notifications as read for a user (optionally scoped to a workspace).
   */
  async markAllAsRead(userId: string, workspaceId?: string): Promise<{ success: boolean; updatedCount: number }> {
    const where: any = { userId, isRead: false };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const [updatedCount] = await NotificationModel.update(
      { isRead: true, readAt: new Date() },
      { where }
    );

    return {
      success: true,
      updatedCount,
    };
  }

  /**
   * Deletes a single notification belonging to the user.
   */
  async deleteNotification(userId: string, notificationId: string): Promise<{ success: boolean }> {
    const deletedCount = await NotificationModel.destroy({
      where: { id: notificationId, userId },
    });

    if (deletedCount === 0) {
      throw new Error('NOT_FOUND: Notification not found.');
    }

    return { success: true };
  }

  /**
   * Clears all notifications for a user (optionally scoped to a workspace).
   */
  async clearAll(userId: string, workspaceId?: string): Promise<{ success: boolean; deletedCount: number }> {
    const where: any = { userId };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const deletedCount = await NotificationModel.destroy({ where });
    return { success: true, deletedCount };
  }

  /**
   * Scans for tasks nearing their deadline (within 24-48h, not yet 'done')
   * and dispatches deadline notifications to assignees and reporters with 20h anti-spam protection.
   */
  async checkAndDispatchApproachingDeadlineNotifications(
    workspaceId?: string
  ): Promise<{ success: boolean; dispatchedCount: number; checkedTasksCount: number }> {
    const today = new Date();
    const horizon = new Date();
    horizon.setDate(today.getDate() + 1); // today + 1 day (within 24h)
    const horizonStr = horizon.toISOString().slice(0, 10);

    const where: any = {
      dueDate: {
        [Op.ne]: null,
        [Op.lte]: horizonStr,
      },
      status: {
        [Op.ne]: 'done',
      },
    };

    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const tasks = await TaskModel.findAll({
      where,
      attributes: ['id', 'workspaceId', 'title', 'dueDate', 'assigneeId', 'reporterId', 'status'],
    });

    let dispatchedCount = 0;
    const suppressionThreshold = new Date(Date.now() - 20 * 60 * 60 * 1000); // 20 hours ago

    for (const task of tasks) {
      const recipientIds: string[] = [];
      if (task.assigneeId) recipientIds.push(task.assigneeId);
      if (task.reporterId && task.reporterId !== task.assigneeId) {
        recipientIds.push(task.reporterId);
      }

      for (const recipientId of recipientIds) {
        // Anti-spam check: has a deadline notification for this task & user been sent in the last 20 hours?
        const existingNotif = await NotificationModel.findOne({
          where: {
            userId: recipientId,
            taskId: task.id,
            type: 'deadline',
            createdAt: {
              [Op.gte]: suppressionThreshold,
            },
          },
        });

        if (!existingNotif) {
          await fcmService.sendDeadlineApproachingNotification({
            recipientUserIds: [recipientId],
            taskTitle: task.title,
            taskId: task.id,
            workspaceId: task.workspaceId,
            dueDate: task.dueDate || 'Hari ini',
          });
          dispatchedCount++;
        }
      }
    }

    return {
      success: true,
      dispatchedCount,
      checkedTasksCount: tasks.length,
    };
  }
}

export const notificationService = new NotificationService();
