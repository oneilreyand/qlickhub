import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { notificationController } from './notificationController.js';
import { notificationRateLimiter } from '../../http/middleware/rateLimit.js';
import { authorize } from '../../http/middleware/authorize.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { opportunisticOutboxDispatch } from './opportunisticOutboxDispatch.js';

export const notificationRoutes = Router();

// FCM Device Token Registration
notificationRoutes.post('/notifications/fcm-token', authenticate, (req, res, next) =>
  notificationController.registerToken(req as any, res, next),
);

// FCM Device Token Unregistration
notificationRoutes.delete('/notifications/fcm-token', authenticate, (req, res, next) =>
  notificationController.unregisterToken(req as any, res, next),
);

// Manual deadline-reminder run for one Workspace (Workspace admin/owner only, rate-limited).
// The scheduled run for every Workspace is POST /v1/cron/deadline-reminders (ADR-040).
notificationRoutes.post(
  '/notifications/check-deadlines',
  authenticate,
  authorize('admin', 'owner'),
  requireWorkspaceMember(['owner', 'admin']),
  notificationRateLimiter,
  (req, res, next) => notificationController.checkDeadlines(req as any, res, next),
);

// Mark all notifications as read
notificationRoutes.post('/notifications/read-all', authenticate, (req, res, next) =>
  notificationController.markAllAsRead(req as any, res, next),
);

// List user notifications
notificationRoutes.get(
  '/notifications',
  authenticate,
  opportunisticOutboxDispatch.middleware,
  (req, res, next) => notificationController.listNotifications(req as any, res, next),
);

// Clear all notifications
notificationRoutes.delete('/notifications', authenticate, (req, res, next) =>
  notificationController.clearAll(req as any, res, next),
);

// Mark specific notification as read
notificationRoutes.patch('/notifications/:id/read', authenticate, (req, res, next) =>
  notificationController.markAsRead(req as any, res, next),
);

// Delete single notification
notificationRoutes.delete('/notifications/:id', authenticate, (req, res, next) =>
  notificationController.deleteNotification(req as any, res, next),
);
