import type { Response } from 'express';
import { CreateTaskRelationSchema } from '@qlick/contracts';
import type { WorkspaceRequest } from '../../policies/workspacePolicy.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import {
  createTaskRelation,
  deleteTaskRelation,
  listTaskRelations,
} from './internal/taskRelations.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** MY-WORK-REPORT P4 (ADR-047): task relations. */
export const taskRelationController = {
  async list(req: WorkspaceRequest, res: Response) {
    try {
      const { workspaceId, taskId } = req.params;
      if (!UUID.test(taskId)) throw new Error('NOT_FOUND: Task not found in this workspace.');
      const data = await listTaskRelations(workspaceId, taskId, req.user!.userId);
      return res.status(200).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async create(req: WorkspaceRequest, res: Response) {
    try {
      const parsed = CreateTaskRelationSchema.safeParse(req.body);
      if (!parsed.success) {
        return sendProblemDetails(res, parsed.error, { zodDetail: 'Relasi tidak valid.' });
      }
      const { workspaceId, taskId } = req.params;
      if (!UUID.test(taskId)) throw new Error('NOT_FOUND: Task not found in this workspace.');
      const data = await createTaskRelation(workspaceId, taskId, req.user!.userId, parsed.data);
      return res.status(201).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async remove(req: WorkspaceRequest, res: Response) {
    try {
      const { workspaceId, taskId, relationId } = req.params;
      if (!UUID.test(taskId) || !UUID.test(relationId)) {
        throw new Error('NOT_FOUND: Relasi tidak ditemukan.');
      }
      await deleteTaskRelation(workspaceId, taskId, relationId, req.user!.userId);
      return res.status(204).send();
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },
};
