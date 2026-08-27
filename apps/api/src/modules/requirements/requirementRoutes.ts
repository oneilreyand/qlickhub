import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  listWorkspaceRequirements,
  getRequirementDetail,
  createRequirement,
  updateRequirement,
  listAcceptanceCriteria,
  createAcceptanceCriterion,
  updateAcceptanceCriterion,
  listTaskRequirements,
  linkRequirementToTask,
  unlinkRequirementFromTask,
  bulkCorrectTaskRequirements,
} from './requirementController.js';

export const requirementRoutes = Router({ mergeParams: true });

requirementRoutes.use(authenticate);

// Workspace level requirement management
requirementRoutes.get(
  '/workspaces/:workspaceId/requirements',
  requireWorkspaceMember(),
  listWorkspaceRequirements,
);

requirementRoutes.get(
  '/workspaces/:workspaceId/requirements/:requirementId',
  requireWorkspaceMember(),
  getRequirementDetail,
);

requirementRoutes.post(
  '/workspaces/:workspaceId/requirements',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  createRequirement,
);

requirementRoutes.patch(
  '/workspaces/:workspaceId/requirements/:requirementId',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  updateRequirement,
);

requirementRoutes.get(
  '/workspaces/:workspaceId/requirements/:requirementId/acceptance-criteria',
  requireWorkspaceMember(),
  listAcceptanceCriteria,
);

requirementRoutes.post(
  '/workspaces/:workspaceId/requirements/:requirementId/acceptance-criteria',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  createAcceptanceCriterion,
);

requirementRoutes.patch(
  '/workspaces/:workspaceId/requirements/:requirementId/acceptance-criteria/:criterionId',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  updateAcceptanceCriterion,
);

// Task requirement linking
requirementRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/requirements',
  requireWorkspaceMember(),
  listTaskRequirements,
);

requirementRoutes.post(
  '/workspaces/:workspaceId/tasks/:taskId/requirements',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  linkRequirementToTask,
);

requirementRoutes.post(
  '/workspaces/:workspaceId/tasks/:taskId/requirements/bulk-correction',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  bulkCorrectTaskRequirements,
);

requirementRoutes.delete(
  '/workspaces/:workspaceId/tasks/:taskId/requirements/:requirementId',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  unlinkRequirementFromTask,
);
