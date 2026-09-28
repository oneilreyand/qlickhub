import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import {
  generateTaskDraft,
  applyTaskDraft,
} from './aiTaskGeneratorController.js';

export const aiTaskGeneratorRoutes = Router();

aiTaskGeneratorRoutes.post(
  '/workspaces/:workspaceId/ai/generate-task-draft',
  authenticate,
  generateTaskDraft,
);

aiTaskGeneratorRoutes.post(
  '/workspaces/:workspaceId/ai/apply-task-draft',
  authenticate,
  applyTaskDraft,
);
