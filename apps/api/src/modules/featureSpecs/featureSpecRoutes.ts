import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  featureSpecAiUserRateLimiter,
  featureSpecAiWorkspaceRateLimiter,
} from './featureSpecAiRateLimit.js';
import {
  answerFeatureSpecQuestion,
  createFeatureSpec,
  generateFeatureSpecPlan,
  generateFeatureSpecQuestions,
  getFeatureSpec,
  listFeatureSpecQuestions,
  listFeatureSpecs,
  saveFeatureSpecSection,
} from './featureSpecController.js';

export const featureSpecRoutes = Router({ mergeParams: true });

featureSpecRoutes.use(authenticate);

featureSpecRoutes.post(
  '/workspaces/:workspaceId/feature-specs',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  createFeatureSpec,
);
featureSpecRoutes.get(
  '/workspaces/:workspaceId/feature-specs',
  requireWorkspaceMember(),
  listFeatureSpecQuestions,
  listFeatureSpecs,
);
featureSpecRoutes.get(
  '/workspaces/:workspaceId/feature-specs/:specId',
  requireWorkspaceMember(),
  getFeatureSpec,
);
featureSpecRoutes.put(
  '/workspaces/:workspaceId/feature-specs/:specId/sections/:section',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  saveFeatureSpecSection,
);

// P5b (AC-5.4): AI Plan. AI calls are rate limited per user and per workspace.
featureSpecRoutes.get(
  '/workspaces/:workspaceId/feature-specs/:specId/questions',
  requireWorkspaceMember(),
  listFeatureSpecQuestions,
);
featureSpecRoutes.post(
  '/workspaces/:workspaceId/feature-specs/:specId/questions',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  featureSpecAiUserRateLimiter,
  featureSpecAiWorkspaceRateLimiter,
  generateFeatureSpecQuestions,
);
featureSpecRoutes.patch(
  '/workspaces/:workspaceId/feature-specs/:specId/questions/:questionId',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  answerFeatureSpecQuestion,
);
featureSpecRoutes.post(
  '/workspaces/:workspaceId/feature-specs/:specId/generate/plan',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  featureSpecAiUserRateLimiter,
  featureSpecAiWorkspaceRateLimiter,
  generateFeatureSpecPlan,
);
