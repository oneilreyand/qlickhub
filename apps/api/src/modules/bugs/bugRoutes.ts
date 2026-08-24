import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  addBugEvidenceLink,
  createBug,
  getBug,
  listBugActivity,
  listBugs,
  updateBug,
} from './bugController.js';

export const bugRoutes = Router({ mergeParams: true });

bugRoutes.use(authenticate);

bugRoutes.get('/workspaces/:workspaceId/bugs', requireWorkspaceMember(), listBugs);
bugRoutes.post(
  '/workspaces/:workspaceId/bugs',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  createBug,
);
bugRoutes.get('/workspaces/:workspaceId/bugs/:bugId', requireWorkspaceMember(), getBug);
bugRoutes.patch(
  '/workspaces/:workspaceId/bugs/:bugId',
  requireWorkspaceMember(['owner', 'admin', 'qa', 'dev']),
  updateBug,
);
bugRoutes.post(
  '/workspaces/:workspaceId/bugs/:bugId/evidence-links',
  requireWorkspaceMember(['owner', 'admin', 'qa', 'dev']),
  addBugEvidenceLink,
);
bugRoutes.get(
  '/workspaces/:workspaceId/bugs/:bugId/activity',
  requireWorkspaceMember(),
  listBugActivity,
);
