import type { Response } from 'express';
import { z } from 'zod';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { CreateFeaturePlanSchema, FeaturePlanLookupQuerySchema } from '@qlick/contracts';
import { featurePlanService } from './featurePlanService.js';
import { sendProblemDetails } from '../../http/problemDetails.js';

const zodDetail = 'Workspace ID, Plan ID, and the Plan fields must be valid.';

export async function createFeaturePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const workspaceId = z.string().uuid().parse(req.params.workspaceId);
    const input = CreateFeaturePlanSchema.parse(req.body);
    const result = await featurePlanService.create(workspaceId, req.user!.userId, input);
    return res.status(201).json(result);
  } catch (error) {
    return sendProblemDetails(res, error, {
      zodDetail,
      fallbackDetail: 'Unable to create the Plan.',
    });
  }
}

export async function getFeaturePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const workspaceId = z.string().uuid().parse(req.params.workspaceId);
    const planId = z.string().uuid().parse(req.params.planId);
    const result = await featurePlanService.get(workspaceId, planId, req.user!.userId);
    return res.status(200).json(result);
  } catch (error) {
    return sendProblemDetails(res, error, {
      zodDetail,
      fallbackDetail: 'Unable to load the Plan.',
    });
  }
}

export async function lookupFeaturePlan(req: AuthenticatedRequest, res: Response) {
  try {
    const workspaceId = z.string().uuid().parse(req.params.workspaceId);
    const { featureTaskId } = FeaturePlanLookupQuerySchema.parse(req.query);
    const result = await featurePlanService.getByFeature(
      workspaceId,
      featureTaskId,
      req.user!.userId,
    );
    return res.status(200).json(result);
  } catch (error) {
    return sendProblemDetails(res, error, {
      zodDetail: 'Workspace ID and featureTaskId must be valid UUIDs.',
      fallbackDetail: 'Unable to look up the Plan.',
    });
  }
}
