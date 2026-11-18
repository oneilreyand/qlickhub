import { Router, type Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import {
  cancelMemberInvitation,
  getMemberAccessOverview,
  resendMemberInvitation,
} from './internal/memberAccess.js';

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

// MEMBER-ACCESS-HUB P3 (ADR-046): invitations not activated yet, across managed Workspaces.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type InvitationAction = typeof resendMemberInvitation;
const invitationHandler =
  (action: InvitationAction) => async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!UUID.test(req.params.userId)) throw new Error('NOT_FOUND: Undangan tidak ditemukan.');
      return res.status(200).json({ data: await action(req.user!.userId, req.params.userId) });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  };

memberAccessRoutes.post(
  '/me/member-access/:userId/resend-invite',
  invitationHandler(resendMemberInvitation),
);
memberAccessRoutes.post(
  '/me/member-access/:userId/cancel-invite',
  invitationHandler(cancelMemberInvitation),
);
