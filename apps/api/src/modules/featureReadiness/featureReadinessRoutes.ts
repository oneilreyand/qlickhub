import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  createFeatureReadinessBaseline,
  createFeatureReadinessReview,
  createRequirementFinding,
  addRequirementFindingClarification,
  addRequirementFindingTriagePosition,
  changeRequirementFindingStatus,
  getFeatureReadiness,
  getRequirementFindings,
  recordRequirementFindingGovernanceDecision,
} from './featureReadinessController.js';

export const featureReadinessRoutes = Router({ mergeParams: true });

featureReadinessRoutes.use(authenticate);

featureReadinessRoutes.get(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness',
  requireWorkspaceMember(),
  getFeatureReadiness,
);
featureReadinessRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness/reviews',
  requireWorkspaceMember(['dev', 'qa']),
  createFeatureReadinessReview,
);
featureReadinessRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness/baselines',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  createFeatureReadinessBaseline,
);

featureReadinessRoutes.get(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness/findings',
  requireWorkspaceMember(),
  getRequirementFindings,
);
featureReadinessRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness/findings',
  requireWorkspaceMember(),
  createRequirementFinding,
);
featureReadinessRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness/findings/:findingId/clarifications',
  requireWorkspaceMember(),
  addRequirementFindingClarification,
);
featureReadinessRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness/findings/:findingId/triage-positions',
  requireWorkspaceMember(),
  addRequirementFindingTriagePosition,
);
featureReadinessRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness/findings/:findingId/governance-decisions',
  requireWorkspaceMember(['owner', 'admin']),
  recordRequirementFindingGovernanceDecision,
);
featureReadinessRoutes.post(
  '/workspaces/:workspaceId/features/:featureTaskId/readiness/findings/:findingId/status-events',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  changeRequirementFindingStatus,
);
