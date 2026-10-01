import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import {
  getLeaderWorkspaces,
  getLeaderTimeline,
  getLeaderQuality,
  getLeaderDigest,
} from './leaderController.js';

export const leaderRoutes = Router();

leaderRoutes.use(authenticate);

leaderRoutes.get('/leader/workspaces', getLeaderWorkspaces);
leaderRoutes.get('/leader/timeline', getLeaderTimeline);
leaderRoutes.get('/leader/quality', getLeaderQuality);
leaderRoutes.get('/leader/digest', getLeaderDigest);
