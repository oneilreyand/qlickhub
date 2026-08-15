import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  listWorkspaceRequirements,
  createRequirement,
  listTaskRequirements,
  linkRequirementToTask,
  unlinkRequirementFromTask,
} from './requirementController.js';

export const requirementRoutes = Router({ mergeParams: true });

requirementRoutes.use(authenticate);

// Workspace level requirement management
requirementRoutes.get(
  '/workspaces/:workspaceId/requirements',
  requireWorkspaceMember(),
  listWorkspaceRequirements
);

requirementRoutes.post(
  '/workspaces/:workspaceId/requirements',
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  createRequirement
);

// Task requirement linking
requirementRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/requirements',
  requireWorkspaceMember(),
  listTaskRequirements
);

requirementRoutes.post(
  '/workspaces/:workspaceId/tasks/:taskId/requirements',
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  linkRequirementToTask
);

requirementRoutes.delete(
  '/workspaces/:workspaceId/tasks/:taskId/requirements/:requirementId',
  requireWorkspaceMember(['owner', 'admin', 'po', 'qa']),
  unlinkRequirementFromTask
);
