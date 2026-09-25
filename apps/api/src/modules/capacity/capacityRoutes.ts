import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { getTeamTimeline, previewAssignmentConflict } from './capacityController.js';

export const capacityRoutes = Router({ mergeParams: true });

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

capacityRoutes.use(authenticate);

// Planning endpoint: preview assignment conflict (restricted to planners: owner, admin, po)
capacityRoutes.post(
  '/workspaces/:workspaceId/capacity/assignment-preview',
  validateWorkspaceId,
  requireWorkspaceMember(['owner', 'admin', 'po']),
  previewAssignmentConflict,
);

// Read-only endpoint: team capacity timeline (accessible to all active workspace members)
capacityRoutes.get(
  '/workspaces/:workspaceId/capacity/timeline',
  validateWorkspaceId,
  requireWorkspaceMember(),
  getTeamTimeline,
);
