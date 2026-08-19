import { Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import {
  RegisterFcmTokenSchema,
  UnregisterFcmTokenSchema,
  ListNotificationsQuerySchema,
  MarkAllNotificationsReadSchema,
} from '@qlick/contracts';
import { notificationService } from './notificationService.js';
import { fcmService } from '../../services/fcmService.js';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { WorkspaceMemberModel } from '../../db/models/workspaceMember.js';

function formatProblemDetails(err: unknown, res: Response): Response {
  if (err instanceof ZodError) {
    return res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Validation Error',
      status: 400,
      detail: 'Input validation failed',
      code: 'BAD_REQUEST',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof Error) {
    if (err.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc9457',
        title: 'Not Found',
        status: 404,
        detail: err.message.replace('NOT_FOUND:', '').trim(),
        code: 'NOT_FOUND',
      });
    }
    if (err.message.startsWith('BAD_REQUEST:')) {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc9457',
        title: 'Bad Request',
        status: 400,
        detail: err.message.replace('BAD_REQUEST:', '').trim(),
        code: 'BAD_REQUEST',
      });
    }
    if (err.message.startsWith('FORBIDDEN:')) {
      return res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc9457',
        title: 'Forbidden',
        status: 403,
        detail: err.message.replace('FORBIDDEN:', '').trim(),
        code: 'FORBIDDEN',
      });
    }
  }

  return res.status(500).json({
    type: 'https://tools.ietf.org/html/rfc9457',
    title: 'Internal Server Error',
    status: 500,
    detail: err instanceof Error ? err.message : 'Unknown internal server error',
    code: 'INTERNAL_SERVER_ERROR',
  });
}

export class NotificationController {
  /**
   * GET /v1/notifications
   * List user's in-app notifications with unread count and filters.
   */
  async listNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const query = ListNotificationsQuerySchema.parse(req.query);
      const userId = req.user!.userId;

      const result = await notificationService.listUserNotifications(userId, query);
      return res.status(200).json({ data: result });
    } catch (err) {
      if (err instanceof ZodError || (err instanceof Error && err.message.includes(':'))) {
        return formatProblemDetails(err, res);
      }
      return next(err);
    }
  }

  /**
   * PATCH /v1/notifications/:id/read
   * Mark a specific notification as read.
   */
  async markAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notificationId = req.params.id;

      const result = await notificationService.markAsRead(userId, notificationId);
      return res.status(200).json({ data: result });
    } catch (err) {
      if (err instanceof ZodError || (err instanceof Error && err.message.includes(':'))) {
        return formatProblemDetails(err, res);
      }
      return next(err);
    }
  }

  /**
   * POST /v1/notifications/read-all
   * Mark all unread notifications as read (optionally scoped to workspace).
   */
  async markAllAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const parsed = MarkAllNotificationsReadSchema.parse(req.body || {});

      const result = await notificationService.markAllAsRead(userId, parsed.workspaceId);
      return res.status(200).json({ data: result });
    } catch (err) {
      if (err instanceof ZodError || (err instanceof Error && err.message.includes(':'))) {
        return formatProblemDetails(err, res);
      }
      return next(err);
    }
  }

  /**
   * DELETE /v1/notifications/:id
   * Delete a single notification.
   */
  async deleteNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notificationId = req.params.id;

      const result = await notificationService.deleteNotification(userId, notificationId);
      return res.status(200).json({ data: result });
    } catch (err) {
      if (err instanceof ZodError || (err instanceof Error && err.message.includes(':'))) {
        return formatProblemDetails(err, res);
      }
      return next(err);
    }
  }

  /**
   * DELETE /v1/notifications
   * Clear all notifications for user (optionally scoped to workspace).
   */
  async clearAll(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const workspaceId = req.query.workspaceId as string | undefined;

      const result = await notificationService.clearAll(userId, workspaceId);
      return res.status(200).json({ data: result });
    } catch (err) {
      if (err instanceof ZodError || (err instanceof Error && err.message.includes(':'))) {
        return formatProblemDetails(err, res);
      }
      return next(err);
    }
  }

  /**
   * POST /v1/notifications/fcm-token
   */
  async registerToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = RegisterFcmTokenSchema.parse(req.body);
      const userId = req.user!.userId;
      const result = await fcmService.registerToken(userId, parsed.token, parsed.deviceInfo);
      return res.status(200).json({ data: result });
    } catch (err) {
      if (err instanceof ZodError || (err instanceof Error && err.message.includes(':'))) {
        return formatProblemDetails(err, res);
      }
      return next(err);
    }
  }

  /**
   * DELETE /v1/notifications/fcm-token
   */
  async unregisterToken(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const parsed = UnregisterFcmTokenSchema.parse(req.body);
      const userId = req.user!.userId;
      const result = await fcmService.unregisterToken(userId, parsed.token);
      return res.status(200).json({ data: result });
    } catch (err) {
      if (err instanceof ZodError || (err instanceof Error && err.message.includes(':'))) {
        return formatProblemDetails(err, res);
      }
      return next(err);
    }
  }

  /**
   * POST /v1/notifications/test
   * Dispatches test notification to FCM AND persists in-app notification in DB.
   */
  async testNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;

      // Find user's first active workspace to attach notification to
      const membership = await WorkspaceMemberModel.findOne({
        where: { userId },
        order: [['createdAt', 'ASC']],
      });

      if (membership) {
        await notificationService.createNotification({
          userId,
          workspaceId: membership.workspaceId,
          type: 'system',
          title: '🔔 Test Notifikasi Qlick Hub',
          message: 'Koneksi Firebase Cloud Messaging & In-App Notification aktif dan siap menerima notifikasi real-time.',
          sendFcm: true,
        });
      } else {
        // Just send FCM directly if no workspace
        await fcmService.sendToUser(userId, {
          title: '🔔 Test Notifikasi Qlick Hub',
          body: 'Koneksi Firebase Cloud Messaging aktif dan siap menerima notifikasi real-time.',
          data: {
            type: 'system',
          },
        });
      }

      return res.status(200).json({ data: { success: true, message: 'Test notification dispatched.' } });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * POST /v1/notifications/check-deadlines
   * Scans for approaching deadlines and dispatches notifications.
   */
  async checkDeadlines(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const workspaceId = (req.query.workspaceId as string) || req.body?.workspaceId;
      const result = await notificationService.checkAndDispatchApproachingDeadlineNotifications(workspaceId);
      return res.status(200).json({ data: result });
    } catch (err) {
      return next(err);
    }
  }
}

export const notificationController = new NotificationController();
