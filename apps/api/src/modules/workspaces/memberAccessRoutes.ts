import { Router, type Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { getMemberAccessOverview } from './internal/memberAccess.js';

/** MEMBER-ACCESS-HUB P1 (ADR-046): access overview outside a single Workspace. */
export const memberAccessRoutes = Router();

memberAccessRoutes.use('/me/member-access', authenticate);

memberAccessRoutes.get('/me/member-access', async (req: AuthenticatedRequest, res: Response) => {
  try {
    return res.status(200).json({ data: await getMemberAccessOverview(req.user!.userId) });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
});
