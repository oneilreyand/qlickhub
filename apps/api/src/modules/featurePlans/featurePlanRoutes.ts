import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { createFeaturePlan, getFeaturePlan, lookupFeaturePlan } from './featurePlanController.js';

export const featurePlanRoutes = Router({ mergeParams: true });

function validateWorkspaceId(req: Request, res: Response, next: NextFunction) {
  if (!z.string().uuid().safeParse(req.params.workspaceId).success) {
    return res.status(400).json({
      type: 'https://api.qa-hub.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: 'Workspace ID must be a valid UUID.',
      code: 'BAD_REQUEST',
    });
  }
  return next();
}

featurePlanRoutes.use(authenticate);
// Penulisan dibatasi planner di service (featurePlanPolicy) agar 403 konsisten dengan kebijakan.
featurePlanRoutes.post(
  '/workspaces/:workspaceId/feature-plans',
  validateWorkspaceId,
  requireWorkspaceMember(),
  createFeaturePlan,
);
featurePlanRoutes.get(
  '/workspaces/:workspaceId/feature-plans',
  validateWorkspaceId,
  requireWorkspaceMember(),
  lookupFeaturePlan,
);
featurePlanRoutes.get(
  '/workspaces/:workspaceId/feature-plans/:planId',
  validateWorkspaceId,
  requireWorkspaceMember(),
  getFeaturePlan,
);
