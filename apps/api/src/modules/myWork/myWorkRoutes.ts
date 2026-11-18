import { Router, type Response } from 'express';
import { MyWorkReportQuerySchema } from '@qlick/contracts';
import { authenticate, type AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { getEffortBaseline } from './fairness.js';
import { getMyWorkReport, toWorkReportCsv } from './workReport.js';

/** MY-WORK-REPORT P1 (ADR-044): only the caller's own report; there is no user parameter. */
export const myWorkRoutes = Router();

myWorkRoutes.use('/me/work-report', authenticate);

myWorkRoutes.get('/me/work-report', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = MyWorkReportQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return sendProblemDetails(res, parsed.error, { zodDetail: 'Filter laporan tidak valid.' });
    }
    const report = await getMyWorkReport(req.user!.userId, parsed.data);
    if (parsed.data.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="laporan-saya-${parsed.data.from}_${parsed.data.to}.csv"`,
      );
      return res.status(200).send(toWorkReportCsv(report));
    }
    return res.status(200).json({ data: report });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
});

// MY-WORK-REPORT P3 (ADR-044 butir 5): median working days per effort in one Workspace, for the
// hint next to the effort picker. Aggregates only; readable by any active member.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
myWorkRoutes.get(
  '/workspaces/:workspaceId/effort-baseline',
  authenticate,
  (req, res, next) =>
    UUID.test(req.params.workspaceId)
      ? next()
      : sendProblemDetails(res, new Error('BAD_REQUEST: Workspace ID tidak valid.')),
  requireWorkspaceMember(),
  async (req, res: Response) => {
    try {
      return res.status(200).json({ data: await getEffortBaseline(req.params.workspaceId) });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },
);
