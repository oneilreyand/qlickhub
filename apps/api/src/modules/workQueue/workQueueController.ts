import type { Response } from 'express';
import { z, ZodError } from 'zod';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { workQueueService } from './workQueueService.js';

export async function getRoleAwareWorkQueue(req: AuthenticatedRequest, res: Response) {
  try {
    const workspaceId = z.string().uuid().parse(req.params.workspaceId);
    const queue = await workQueueService.getRoleAwareQueue(workspaceId, req.user!.userId);
    return res.status(200).json({ queue });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'Workspace ID must be a valid UUID.',
        code: 'BAD_REQUEST',
      });
    }
    const message = error instanceof Error ? error.message : 'Unable to load the work queue.';
    if (message.startsWith('FORBIDDEN:')) {
      return res.status(403).json({
        type: 'https://api.qa-hub.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: message.slice(10).trim(),
        code: 'FORBIDDEN',
      });
    }
    return res.status(500).json({
      type: 'https://api.qa-hub.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: message,
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
