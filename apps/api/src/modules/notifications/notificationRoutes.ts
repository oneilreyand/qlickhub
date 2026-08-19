import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { notificationController } from './notificationController.js';

export const notificationRoutes = Router();

// FCM Device Token Registration
notificationRoutes.post(
  '/notifications/fcm-token',
  authenticate,
  (req, res, next) => notificationController.registerToken(req as any, res, next)
);

// FCM Device Token Unregistration
notificationRoutes.delete(
  '/notifications/fcm-token',
  authenticate,
  (req, res, next) => notificationController.unregisterToken(req as any, res, next)
);

// Send test notification to caller
notificationRoutes.post(
  '/notifications/test',
  authenticate,
  (req, res, next) => notificationController.testNotification(req as any, res, next)
);
