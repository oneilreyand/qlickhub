import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { FeatureHandoffQuerySchema } from '@qlick/contracts';
import { workQueueService } from './workQueueService.js';
import { featureHandoffService } from './featureHandoffService.js';
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

export async function getFeatureHandoffs(req: AuthenticatedRequest, res: Response) {
  try {
    const workspaceId = z.string().uuid().parse(req.params.workspaceId);
    const featureTaskId = z.string().uuid().parse(req.params.featureTaskId);
    const query = FeatureHandoffQuerySchema.parse(req.query);
    const page = await featureHandoffService.list(
      workspaceId,
      featureTaskId,
      req.user!.userId,
      query,
    );
    return res.status(200).json(page);
  } catch (error) {
    return sendProblemDetails(res, error, {
      zodDetail: 'Workspace ID, Feature ID, and paging must be valid.',
      fallbackDetail: 'Unable to load the handoff history.',
    });
  }
}
