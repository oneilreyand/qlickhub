import { Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { RegisterFcmTokenSchema, UnregisterFcmTokenSchema } from '@qa/contracts';
import { fcmService } from '../../services/fcmService.js';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';

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

  async testNotification(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      await fcmService.sendToUser(userId, {
        title: '🔔 Test Notifikasi QA Hub',
        body: 'Koneksi Firebase Cloud Messaging aktif dan siap menerima notifikasi real-time.',
        data: {
          type: 'system',
        },
      });
      return res.status(200).json({ data: { success: true, message: 'Test notification dispatched.' } });
    } catch (err) {
      return next(err);
    }
  }
}

export const notificationController = new NotificationController();
