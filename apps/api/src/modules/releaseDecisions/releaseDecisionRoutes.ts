import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  cancelQaSignOff,
  cancelReleaseDecision,
  createQaSignOff,
  createReleaseDecision,
  listFeatureReleaseRecords,
  listWorkspaceReleaseReadiness,
} from './releaseDecisionController.js';

export const releaseDecisionRoutes = Router({ mergeParams: true });

releaseDecisionRoutes.use(authenticate);

releaseDecisionRoutes.get(
  '/workspaces/:workspaceId/release-readiness',
  requireWorkspaceMember(),
  listWorkspaceReleaseReadiness,
);

releaseDecisionRoutes.get(
  '/workspaces/:workspaceId/features/:featureTaskId/release-records',
  requireWorkspaceMember(),
  listFeatureReleaseRecords,
);
releaseDecisionRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/qa-sign-offs',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  createQaSignOff,
);
releaseDecisionRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/qa-sign-offs/:qaSignOffId/cancellation',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  cancelQaSignOff,
);
releaseDecisionRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/release-decisions',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  createReleaseDecision,
);
releaseDecisionRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/release-decisions/:releaseDecisionId/cancellation',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  cancelReleaseDecision,
);
