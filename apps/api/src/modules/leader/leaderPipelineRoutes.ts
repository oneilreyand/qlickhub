import { Router, type Response } from 'express';
import { LeaderFlowQuerySchema, LeaderPipelineQuerySchema } from '@qlick/contracts';
import { authenticate, type AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { getLeaderPipelineSummary } from './leaderPipeline.js';
import { getLeaderFlowMetrics } from './flowMetrics.js';
import { ledWorkspaceIds, openLeaderStream, registerLeaderLiveHooks } from './leaderLiveUpdates.js';

/** LEADER-PIPELINE-HUB P1 (ADR-045): pipeline + health summary for leaders (Owner/Admin). */
export const leaderPipelineRoutes = Router();

leaderPipelineRoutes.use('/leader/pipeline', authenticate);
leaderPipelineRoutes.use('/leader/stream', authenticate);
leaderPipelineRoutes.use('/leader/flow', authenticate);
registerLeaderLiveHooks();

leaderPipelineRoutes.get('/leader/pipeline', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = LeaderPipelineQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendProblemDetails(res, parsed.error, { zodDetail: 'Filter Workspace tidak valid.' });
    }
    const data = await getLeaderPipelineSummary(req.user!.userId, parsed.data.workspaceIds);
    return res.status(200).json({ data });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
});

// LEADER-PIPELINE-HUB P5: one SSE stream for every Workspace the user leads. Events say only
// which Workspace changed; the client reloads `/leader/pipeline`.
leaderPipelineRoutes.get('/leader/stream', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceIds = await ledWorkspaceIds(req.user!.userId);
    if (workspaceIds.length === 0) {
      throw new Error('FORBIDDEN: Leader Hub hanya untuk Owner atau Admin sebuah Workspace.');
    }
    const close = openLeaderStream(req.user!.userId, workspaceIds, res);
    req.on('close', close);
  } catch (error) {
    if (!res.headersSent) sendProblemDetails(res, error);
  }
});

// LEADER-PIPELINE-HUB P6: lead/cycle time, stage time, throughput and on-time rate.
leaderPipelineRoutes.get('/leader/flow', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = LeaderFlowQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendProblemDetails(res, parsed.error, {
        zodDetail: 'Filter metrik alur tidak valid.',
      });
    }
    const led = await ledWorkspaceIds(req.user!.userId);
    if (led.length === 0) {
      throw new Error('FORBIDDEN: Leader Hub hanya untuk Owner atau Admin sebuah Workspace.');
    }
    const requested = parsed.data.workspaceIds;
    const workspaceIds = requested.length ? requested.filter((id) => led.includes(id)) : led;
    const data = await getLeaderFlowMetrics(workspaceIds, parsed.data.timeframe);
    return res.status(200).json({ data });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
});
