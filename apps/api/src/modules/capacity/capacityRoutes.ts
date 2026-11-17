import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { getTeamTimeline, previewAssignmentConflict } from './capacityController.js';
import { personalCapacityController as personal } from './personalCapacityController.js';

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

// Personal capacity and time off (WORK-FOUNDATION P4, AUTH-015): the person themselves, or an
// Owner/Admin of a Workspace the person is an active member of. Checked in the service.
capacityRoutes.get('/me/capacity', (req, res) => personal.get(req, res));
capacityRoutes.put('/me/capacity', (req, res) => personal.update(req, res));
capacityRoutes.post('/me/time-off', (req, res) => personal.addTimeOff(req, res));
capacityRoutes.delete('/me/time-off/:timeOffId', (req, res) => personal.removeTimeOff(req, res));
capacityRoutes.get('/users/:userId/capacity', (req, res) => personal.get(req, res));
capacityRoutes.put('/users/:userId/capacity', (req, res) => personal.update(req, res));
capacityRoutes.post('/users/:userId/time-off', (req, res) => personal.addTimeOff(req, res));
capacityRoutes.delete('/users/:userId/time-off/:timeOffId', (req, res) =>
  personal.removeTimeOff(req, res),
);
