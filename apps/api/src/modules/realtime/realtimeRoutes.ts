import { Router, Response } from 'express';
import { authenticate, AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { WorkspaceMemberModel } from '../../db/models/workspaceMember.js';
import { realtimeEventBus } from '../../services/realtimeEventBus.js';

export const realtimeRoutes = Router();

/**
 * Server-Sent Events (SSE) stream endpoint for real-time discussions & notifications.
 * Subscribes the authenticated client to workspace-level events and personal notifications.
 */
realtimeRoutes.get(
  '/workspaces/:workspaceId/realtime-stream',
  authenticate,
  async (req: AuthenticatedRequest, res: Response) => {
    const { workspaceId } = req.params;
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      return;
    }

    try {
      // Validate workspace membership
      const membership = await WorkspaceMemberModel.findOne({
        where: { workspaceId, userId },
      });

      if (!membership) {
        res.status(403).json({
          error: {
            code: 'FORBIDDEN',
            message: 'You are not a member of this workspace.',
          },
        });
        return;
      }

      // Configure SSE HTTP response headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      });

      if (typeof (res as any).flushHeaders === 'function') {
        (res as any).flushHeaders();
      }

      const clientId = `${userId}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

      realtimeEventBus.registerClient({
        clientId,
        workspaceId,
        userId,
        res,
      });

      req.on('close', () => {
        realtimeEventBus.removeClient(clientId);
      });
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: err instanceof Error ? err.message : 'Failed to establish realtime stream',
          },
        });
      }
    }
  }
);
