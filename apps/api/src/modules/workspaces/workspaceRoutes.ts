import { Router, type Response } from 'express';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { updateMemberExpiry } from './internal/memberExpiry.js';
import { authenticate } from '../../http/middleware/authenticate.js';
import {
  requireWorkspaceMember,
  requireWorkspaceCreationPermission,
} from '../../policies/workspacePolicy.js';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  archiveWorkspace,
  restoreWorkspace,
  deleteWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateMemberRole,
  removeWorkspaceMember,
  listTaskCreationPermissions,
  grantTaskCreationPermission,
  revokeTaskCreationPermission,
  getWorkspaceActivities,
  getQaAssuranceRollout,
  updateQaAssuranceRollout,
} from './workspaceController.js';
import {
  addWorkspaceHolidayHandler,
  deleteWorkspaceHolidayHandler,
  getWorkCalendarHandler,
  updateWorkCalendarHandler,
} from './workCalendarController.js';

export const workspaceRoutes = Router();

workspaceRoutes.use(authenticate);

// List workspaces for active user & create workspace (Only owner, admin, product owner)
workspaceRoutes.get('/', getUserWorkspaces);
workspaceRoutes.post('/', requireWorkspaceCreationPermission(), createWorkspace);

// Specific workspace routes (requires membership)
workspaceRoutes.get('/:workspaceId', requireWorkspaceMember(), getWorkspaceById);
workspaceRoutes.patch('/:workspaceId', requireWorkspaceMember(['owner', 'admin']), updateWorkspace);
workspaceRoutes.post('/:workspaceId/archive', requireWorkspaceMember(['owner']), archiveWorkspace);
workspaceRoutes.post('/:workspaceId/restore', requireWorkspaceMember(['owner']), restoreWorkspace);
workspaceRoutes.delete('/:workspaceId', requireWorkspaceMember(['owner']), deleteWorkspace);

// Workspace Activity Feed / Audit Trail
workspaceRoutes.get('/:workspaceId/activities', requireWorkspaceMember(), getWorkspaceActivities);
workspaceRoutes.get(
  '/:workspaceId/qa-assurance-rollout',
  requireWorkspaceMember(),
  getQaAssuranceRollout,
);
workspaceRoutes.patch(
  '/:workspaceId/qa-assurance-rollout',
  requireWorkspaceMember(['owner', 'admin']),
  updateQaAssuranceRollout,
);

// Work calendar (WORK-FOUNDATION P2, ADR-044)
workspaceRoutes.get('/:workspaceId/calendar', requireWorkspaceMember(), getWorkCalendarHandler);
workspaceRoutes.put(
  '/:workspaceId/calendar',
  requireWorkspaceMember(['owner', 'admin']),
  updateWorkCalendarHandler,
);
workspaceRoutes.post(
  '/:workspaceId/calendar/holidays',
  requireWorkspaceMember(['owner', 'admin']),
  addWorkspaceHolidayHandler,
);
workspaceRoutes.delete(
  '/:workspaceId/calendar/holidays/:holidayId',
  requireWorkspaceMember(['owner', 'admin']),
  deleteWorkspaceHolidayHandler,
);

// Member management
workspaceRoutes.get('/:workspaceId/members', requireWorkspaceMember(), getWorkspaceMembers);
workspaceRoutes.post(
  '/:workspaceId/members',
  requireWorkspaceMember(['owner', 'admin']),
  addWorkspaceMember,
);
workspaceRoutes.patch(
  '/:workspaceId/members/:memberUserId',
  requireWorkspaceMember(['owner', 'admin']),
  updateMemberRole,
);
workspaceRoutes.delete(
  '/:workspaceId/members/:memberUserId',
  requireWorkspaceMember(['owner', 'admin']),
  removeWorkspaceMember,
);
// MEMBER-ACCESS-HUB P5 (ADR-046): set, extend or remove the end date of someone's access.
workspaceRoutes.put(
  '/:workspaceId/members/:memberUserId/expiry',
  requireWorkspaceMember(['owner', 'admin']),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = await updateMemberExpiry(
        req.params.workspaceId,
        req.user!.userId,
        req.params.memberUserId,
        req.body,
      );
      return res.status(200).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },
);

// Task creation permissions ("Izin Khusus" - Only owner/admin)
workspaceRoutes.get(
  '/:workspaceId/task-creation-permissions',
  requireWorkspaceMember(['owner', 'admin']),
  listTaskCreationPermissions,
);
workspaceRoutes.post(
  '/:workspaceId/task-creation-permissions',
  requireWorkspaceMember(['owner', 'admin']),
  grantTaskCreationPermission,
);
workspaceRoutes.delete(
  '/:workspaceId/task-creation-permissions/:targetUserId',
  requireWorkspaceMember(['owner', 'admin']),
  revokeTaskCreationPermission,
);
