import { Op, WhereOptions } from 'sequelize';
import {
  InAppNotification,
  ListNotificationsQuery,
  ListNotificationsResponse,
  NotificationType,
} from '@qlick/contracts';
import { NotificationModel, UserModel, TaskModel, WorkspaceModel } from '../../db/models/index.js';
import { fcmService } from '../../services/fcmService.js';
import { realtimeEventBus } from '../../services/realtimeEventBus.js';

export interface CreateNotificationParams {
  userId: string;
  workspaceId: string;
  taskId?: string | null;
  bugId?: string | null;
  actorId?: string | null;
  idempotencyKey?: string | null;
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
    bugId: record.bugId || undefined,
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

/** DEADLINE-REMINDER-CRON (ADR-040): overdue tasks older than this are no longer reminded. */
export const DEADLINE_REMINDER_OVERDUE_DAYS = 7;

export interface DeadlineReminderWindow {
  /** UTC calendar date the run belongs to; the scheduler runs at 08:05 WIB, the same date. */
  today: string;
  from: string;
  to: string;
}

export interface DeadlineReminderResult {
  success: true;
  dispatchedCount: number;
  /** Pairs whose reminder could not be stored this run; they are retried by the next run. */
  failedCount: number;
  checkedTasksCount: number;
  window: DeadlineReminderWindow;
}

const toDateOnly = (date: Date): string => date.toISOString().slice(0, 10);
const addDays = (date: Date, days: number): Date =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export function deadlineReminderWindow(now: Date): DeadlineReminderWindow {
  return {
    today: toDateOnly(now),
    from: toDateOnly(addDays(now, -DEADLINE_REMINDER_OVERDUE_DAYS)),
    to: toDateOnly(addDays(now, 1)),
  };
}

export class NotificationService {
  /**
   * Persists one in-app notification without push or realtime side effects. With an idempotency
   * key, an existing row is returned with `created: false` instead of a duplicate.
   */
  async persistNotification(
    params: Omit<CreateNotificationParams, 'sendFcm'>,
  ): Promise<{ record: NotificationModel; created: boolean }> {
    const { userId, workspaceId, taskId, bugId, actorId, idempotencyKey, type, title, message } =
      params;
    const values = {
      userId,
      workspaceId,
      taskId: taskId || null,
      bugId: bugId || null,
      actorId: actorId || null,
      idempotencyKey: idempotencyKey || null,
      type,
      title,
      message,
      isRead: false,
    };
    if (!idempotencyKey) {
      return { record: await NotificationModel.create(values), created: true };
    }
    // A plain INSERT and, on a key collision, a plain read: no transaction holds the connection
    // while the second statement waits, so this is safe with the serverless pool of one
    // connection (findOrCreate re-reads outside its own transaction and would wait for the pool).
    try {
      return { record: await NotificationModel.create(values), created: true };
    } catch (error) {
      if ((error as { name?: string })?.name !== 'SequelizeUniqueConstraintError') throw error;
      const existing = await NotificationModel.findOne({ where: { idempotencyKey } });
      if (!existing) throw error;
      return { record: existing, created: false };
    }
  }

  /**
   * Creates a single in-app notification and dispatches FCM push notification.
   */
  async createNotification(params: CreateNotificationParams): Promise<InAppNotification> {
    const {
      userId,
      workspaceId,
      taskId,
      bugId,
      actorId,
      idempotencyKey,
      type,
      title,
      message,
      sendFcm = true,
    } = params;

    const { record, created } = await this.persistNotification({
      userId,
      workspaceId,
      taskId,
      bugId,
      actorId,
      idempotencyKey,
      type,
      title,
      message,
    });

    // A retried outbox row must not send a second push/realtime event.
    if (!created) {
      const existing = await NotificationModel.findByPk(record.id, {
        include: [{ model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] }],
      });
      return formatNotification(existing || record);
    }

    if (sendFcm) {
      fcmService
        .sendToUser(userId, {
          title,
          body: message,
          data: {
            type,
            taskId: taskId || '',
            bugId: bugId || '',
            workspaceId,
            notificationId: record.id,
          },
        })
        .catch((err) => {
          console.warn(
            '⚠️ Failed to dispatch FCM push notification:',
            err instanceof Error ? err.message : err,
          );
        });
    }

    const fetched = await NotificationModel.findByPk(record.id, {
      include: [{ model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] }],
    });

    const formatted = formatNotification(fetched || record);

    // Realtime SSE event dispatch to targeted user
    try {
      realtimeEventBus.emitToUser(workspaceId, userId, 'notification:new', formatted);
    } catch (err) {
      console.warn('⚠️ Failed to dispatch realtime notification event:', err);
    }

    return formatted;
  }

  /**
   * Creates multiple in-app notifications in bulk and dispatches FCM multicast push.
   */
  async createBulkNotifications(
    paramsList: Array<CreateNotificationParams>,
    sendFcm = true,
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
      })),
    );

    if (sendFcm) {
      // Group by distinct title/message/type/taskId/workspaceId for multicast efficiency
      const groups = new Map<
        string,
        { userIds: string[]; title: string; body: string; data: Record<string, string> }
      >();

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
            console.warn(
              '⚠️ Failed to dispatch bulk FCM push notification:',
              err instanceof Error ? err.message : err,
            );
          });
      }
    }

    const ids = createdRecords.map((r) => r.id);
    const fetched = await NotificationModel.findAll({
      where: { id: { [Op.in]: ids } },
      include: [{ model: UserModel, as: 'actor', attributes: ['id', 'name', 'email'] }],
    });

    const formattedList = fetched.map(formatNotification);

    // Realtime SSE event dispatch to targeted users
    try {
      for (const notif of formattedList) {
        realtimeEventBus.emitToUser(notif.workspaceId, notif.userId, 'notification:new', notif);
      }
    } catch (err) {
      console.warn('⚠️ Failed to dispatch bulk realtime notification events:', err);
    }

    return formattedList;
  }

  /**

   * Lists user notifications with optional workspace and unread filtering, plus unread count.
   */
  async listUserNotifications(
    userId: string,
    query: ListNotificationsQuery,
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
  async markAllAsRead(
    userId: string,
    workspaceId?: string,
  ): Promise<{ success: boolean; updatedCount: number }> {
    const where: any = { userId, isRead: false };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const [updatedCount] = await NotificationModel.update(
      { isRead: true, readAt: new Date() },
      { where },
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
  async clearAll(
    userId: string,
    workspaceId?: string,
  ): Promise<{ success: boolean; deletedCount: number }> {
    const where: any = { userId };
    if (workspaceId) {
      where.workspaceId = workspaceId;
    }

    const deletedCount = await NotificationModel.destroy({ where });
    return { success: true, deletedCount };
  }

  /**
   * DEADLINE-REMINDER-CRON (ADR-040): reminds assignees and reporters of open tasks due between
   * `DEADLINE_REMINDER_OVERDUE_DAYS` days ago and tomorrow. Closed tasks (`done`, `canceled`) and
   * archived Workspaces are skipped. A (task, user) pair is reminded at most once per UTC day
   * (idempotency key) and never twice within 20 hours, so duplicate or overlapping scheduler runs
   * are harmless.
   */
  async checkAndDispatchApproachingDeadlineNotifications(
    workspaceId?: string,
    now: Date = new Date(),
  ): Promise<DeadlineReminderResult> {
    const window = deadlineReminderWindow(now);

    const archivedWorkspaces = await WorkspaceModel.findAll({
      where: { archivedAt: { [Op.ne]: null } },
      attributes: ['id'],
    });
    const archivedIds = archivedWorkspaces.map((workspace) => workspace.id);

    const where: WhereOptions = {
      dueDate: { [Op.between]: [window.from, window.to] },
      status: { [Op.notIn]: ['done', 'canceled'] },
    };
    if (workspaceId) {
      Object.assign(where, { workspaceId });
    } else if (archivedIds.length > 0) {
      Object.assign(where, { workspaceId: { [Op.notIn]: archivedIds } });
    }
    if (workspaceId && archivedIds.includes(workspaceId)) {
      return { success: true, dispatchedCount: 0, failedCount: 0, checkedTasksCount: 0, window };
    }

    const tasks = await TaskModel.findAll({
      where,
      attributes: ['id', 'workspaceId', 'title', 'dueDate', 'assigneeId', 'reporterId', 'status'],
    });

    let dispatchedCount = 0;
    let failedCount = 0;
    const suppressionThreshold = new Date(now.getTime() - 20 * 60 * 60 * 1000); // 20 hours ago

    // Anti-spam check, batched: which (task, user) pairs already got a deadline notification in
    // the last 20 hours? One query for all scanned tasks instead of one per task and recipient.
    const recentlyNotified = new Set<string>();
    if (tasks.length > 0) {
      const recent = await NotificationModel.findAll({
        where: {
          taskId: { [Op.in]: tasks.map((task) => task.id) },
          type: 'deadline',
          createdAt: {
            [Op.gte]: suppressionThreshold,
          },
        },
        attributes: ['userId', 'taskId'],
      });
      for (const notif of recent) recentlyNotified.add(`${notif.taskId}:${notif.userId}`);
    }

    for (const task of tasks) {
      const recipientIds: string[] = [];
      if (task.assigneeId) recipientIds.push(task.assigneeId);
      if (task.reporterId && task.reporterId !== task.assigneeId) {
        recipientIds.push(task.reporterId);
      }

      for (const recipientId of recipientIds) {
        if (recentlyNotified.has(`${task.id}:${recipientId}`)) continue;
        try {
          const dueDate = task.dueDate || window.today;
          const title = '⏰ Batas Waktu Mendekati';
          const message =
            dueDate < window.today
              ? `Tugas "${task.title}" melewati batas waktu ${dueDate}. Segera selesaikan atau perbarui jadwalnya.`
              : `Tugas "${task.title}" jatuh tempo pada ${dueDate}. Segera selesaikan sebelum terlambat!`;
          const { record, created } = await this.persistNotification({
            userId: recipientId,
            workspaceId: task.workspaceId,
            taskId: task.id,
            actorId: null,
            idempotencyKey: `deadline:${task.id}:${recipientId}:${window.today}`,
            type: 'deadline',
            title,
            message,
          });
          if (!created) continue; // another run already reminded this pair today

          try {
            realtimeEventBus.emitToUser(
              task.workspaceId,
              recipientId,
              'notification:new',
              formatNotification(record),
            );
          } catch (err) {
            console.warn('⚠️ Failed to dispatch realtime deadline reminder:', err);
          }

          await fcmService
            .sendToUser(recipientId, {
              title,
              body: message,
              data: { type: 'deadline', taskId: task.id, workspaceId: task.workspaceId },
            })
            .catch((err) => {
              console.warn(
                '⚠️ Failed to dispatch FCM deadline reminder:',
                err instanceof Error ? err.message : err,
              );
            });
          dispatchedCount++;
        } catch (error) {
          // One bad row (for example a Workspace deleted mid-run) must not stop the daily run;
          // the pair is retried by the next run because no reminder row was stored.
          failedCount++;
          console.warn(
            JSON.stringify({
              level: 'warn',
              event: 'deadline_reminder.failed',
              taskId: task.id,
              message: error instanceof Error ? error.message.slice(0, 300) : String(error),
            }),
          );
        }
      }
    }

    return {
      success: true,
      dispatchedCount,
      failedCount,
      checkedTasksCount: tasks.length,
      window,
    };
  }
}

export const notificationService = new NotificationService();
