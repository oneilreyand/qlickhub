import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  createWorkspace,
  getUserWorkspaces,
  getWorkspaceById,
  updateWorkspace,
  getWorkspaceMembers,
  addWorkspaceMember,
  updateMemberRole,
  removeWorkspaceMember,
} from './workspaceController.js';

export const workspaceRoutes = Router();

workspaceRoutes.use(authenticate);

// List workspaces for active user & create workspace
workspaceRoutes.get('/', getUserWorkspaces);
workspaceRoutes.post('/', createWorkspace);

// Specific workspace routes (requires membership)
workspaceRoutes.get('/:workspaceId', requireWorkspaceMember(), getWorkspaceById);
workspaceRoutes.patch('/:workspaceId', requireWorkspaceMember(['owner', 'admin']), updateWorkspace);

// Member management
workspaceRoutes.get('/:workspaceId/members', requireWorkspaceMember(), getWorkspaceMembers);
workspaceRoutes.post('/:workspaceId/members', requireWorkspaceMember(['owner', 'admin']), addWorkspaceMember);
workspaceRoutes.patch('/:workspaceId/members/:memberUserId', requireWorkspaceMember(['owner', 'admin']), updateMemberRole);
workspaceRoutes.delete('/:workspaceId/members/:memberUserId', requireWorkspaceMember(['owner', 'admin']), removeWorkspaceMember);
