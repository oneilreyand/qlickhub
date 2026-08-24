import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { getRoleAwareWorkQueue } from './workQueueController.js';

export const workQueueRoutes = Router({ mergeParams: true });

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

workQueueRoutes.use(authenticate);
workQueueRoutes.get(
  '/workspaces/:workspaceId/my-work-queue',
  validateWorkspaceId,
  requireWorkspaceMember(),
  getRoleAwareWorkQueue,
);
