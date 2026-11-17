import { Router, type Response } from 'express';
import { LeaderPipelineQuerySchema } from '@qlick/contracts';
import { authenticate, type AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { getLeaderPipelineSummary } from './leaderPipeline.js';

/** LEADER-PIPELINE-HUB P1 (ADR-045): pipeline + health summary for leaders (Owner/Admin). */
export const leaderPipelineRoutes = Router();

leaderPipelineRoutes.use('/leader/pipeline', authenticate);

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
