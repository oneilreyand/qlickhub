import type { Response } from 'express';
import {
  CreateQrisSandboxTransactionSchema,
  SimulateQrisSandboxStatusSchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { qrisSandboxService } from './qrisSandboxService.js';

export async function createQrisSandboxTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateQrisSandboxTransactionSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
    });
    const transaction = await qrisSandboxService.createTransaction(req.user!.userId, input);
    return res.status(201).json({ transaction });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
}

export async function getQrisSandboxTransaction(req: AuthenticatedRequest, res: Response) {
  try {
    const transaction = await qrisSandboxService.getTransaction(
      req.params.workspaceId,
      req.params.transactionId,
      req.user!.userId,
    );
    return res.status(200).json({ transaction });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
}

export async function simulateQrisSandboxStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const input = SimulateQrisSandboxStatusSchema.parse(req.body);
    const transaction = await qrisSandboxService.simulateStatus(
      req.user!.userId,
      req.params.workspaceId,
      req.params.transactionId,
      input,
    );
    return res.status(200).json({ transaction });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
}
