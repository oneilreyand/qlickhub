import { Response } from 'express';
import { CreateTaskBlockerSchema, ResolveTaskBlockerSchema } from '@qlick/contracts';
import type { WorkspaceRole } from '@qlick/contracts';
import { WorkspaceRequest } from '../../policies/workspacePolicy.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { listTaskBlockers, openTaskBlocker, resolveTaskBlocker } from './internal/taskBlockers.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** WORK-FOUNDATION P5 (ADR-045): task blockers. */
export const taskBlockerController = {
  async list(req: WorkspaceRequest, res: Response) {
    try {
      const { workspaceId, taskId } = req.params;
      return res.status(200).json({ data: await listTaskBlockers(workspaceId, taskId) });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async open(req: WorkspaceRequest, res: Response) {
    try {
      const parsed = CreateTaskBlockerSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendProblemDetails(res, parsed.error, { zodDetail: 'Hambatan tidak valid.' });
      }
      const { workspaceId, taskId } = req.params;
      const data = await openTaskBlocker(workspaceId, taskId, req.user!.userId, parsed.data);
      return res.status(201).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async resolve(req: WorkspaceRequest, res: Response) {
    try {
      const parsed = ResolveTaskBlockerSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return sendProblemDetails(res, parsed.error, { zodDetail: 'Penutupan tidak valid.' });
      }
      const { workspaceId, taskId, blockerId } = req.params;
      if (!UUID.test(blockerId)) throw new Error('NOT_FOUND: Hambatan tidak ditemukan.');
      const data = await resolveTaskBlocker(
        workspaceId,
        taskId,
        blockerId,
        req.user!.userId,
        req.workspaceMembership!.role as WorkspaceRole,
        parsed.data,
      );
      return res.status(200).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },
};
