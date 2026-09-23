import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  createQrisSandboxTransaction,
  getQrisSandboxTransaction,
  simulateQrisSandboxStatus,
} from './qrisSandboxController.js';

export const qrisSandboxRoutes = Router({ mergeParams: true });

qrisSandboxRoutes.use(authenticate);
qrisSandboxRoutes.post(
  '/workspaces/:workspaceId/qa-sandbox/qris/transactions',
  requireWorkspaceMember(['qa']),
  createQrisSandboxTransaction,
);
qrisSandboxRoutes.get(
  '/workspaces/:workspaceId/qa-sandbox/qris/transactions/:transactionId',
  requireWorkspaceMember(),
  getQrisSandboxTransaction,
);
qrisSandboxRoutes.post(
  '/workspaces/:workspaceId/qa-sandbox/qris/transactions/:transactionId/simulate-status',
  requireWorkspaceMember(['qa']),
  simulateQrisSandboxStatus,
);
