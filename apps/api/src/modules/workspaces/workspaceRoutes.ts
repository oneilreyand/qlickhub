import { Router } from 'express';
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
  getWorkspaceMembers,
  addWorkspaceMember,
  updateMemberRole,
  removeWorkspaceMember,
  listTaskCreationPermissions,
  grantTaskCreationPermission,
  revokeTaskCreationPermission,
  getWorkspaceActivities,
} from './workspaceController.js';

export const workspaceRoutes = Router();

workspaceRoutes.use(authenticate);

// List workspaces for active user & create workspace (Only owner, admin, product owner)
workspaceRoutes.get('/', getUserWorkspaces);
workspaceRoutes.post('/', requireWorkspaceCreationPermission(), createWorkspace);

// Specific workspace routes (requires membership)
workspaceRoutes.get('/:workspaceId', requireWorkspaceMember(), getWorkspaceById);
workspaceRoutes.patch('/:workspaceId', requireWorkspaceMember(['owner', 'admin']), updateWorkspace);

// Workspace Activity Feed / Audit Trail
workspaceRoutes.get('/:workspaceId/activities', requireWorkspaceMember(), getWorkspaceActivities);

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
