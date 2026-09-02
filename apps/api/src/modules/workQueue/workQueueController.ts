import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { workQueueService } from './workQueueService.js';
import { sendProblemDetails } from '../../http/problemDetails.js';

export async function getRoleAwareWorkQueue(req: AuthenticatedRequest, res: Response) {
  try {
    const workspaceId = z.string().uuid().parse(req.params.workspaceId);
    const queue = await workQueueService.getRoleAwareQueue(workspaceId, req.user!.userId);
    return res.status(200).json({ queue });
  } catch (error) {
    return sendProblemDetails(res, error, {
      zodDetail: 'Workspace ID must be a valid UUID.',
      fallbackDetail: 'Unable to load the work queue.',
    });
  }
}
