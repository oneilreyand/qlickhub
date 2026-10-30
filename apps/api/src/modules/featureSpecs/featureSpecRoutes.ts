import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  createFeatureSpec,
  getFeatureSpec,
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
