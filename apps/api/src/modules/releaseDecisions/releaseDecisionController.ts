import type { Response } from 'express';
import { z, ZodError } from 'zod';
import {
  CancelQaSignOffInputSchema,
  CancelReleaseDecisionInputSchema,
  CreateQaSignOffSchema,
  CreateReleaseDecisionSchema,
  ListWorkspaceReleaseReadinessQuerySchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { releaseDecisionService } from './releaseDecisionService.js';

function problem(res: Response, status: number, code: string, detail: string) {
  return res.status(status).json({
    type: `https://api.qa-hub.com/errors/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code
      .split('_')
      .map((word) => word[0] + word.slice(1).toLowerCase())
      .join(' '),
    status,
    detail,
    code,
  });
}

function handleError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return problem(res, 400, 'BAD_REQUEST', error.errors.map((issue) => issue.message).join('; '));
  }
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  if (message.startsWith('NOT_FOUND:'))
    return problem(res, 404, 'NOT_FOUND', message.slice(10).trim());
  if (message.startsWith('FORBIDDEN:'))
    return problem(res, 403, 'FORBIDDEN', message.slice(10).trim());
  if (message.startsWith('BAD_REQUEST:'))
    return problem(res, 400, 'BAD_REQUEST', message.slice(12).trim());
  if (message.startsWith('CONFLICT:'))
    return problem(res, 409, 'CONFLICT', message.slice(9).trim());
  return problem(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

export async function listFeatureReleaseRecords(req: AuthenticatedRequest, res: Response) {
  try {
    const featureTaskId = z.string().uuid().parse(req.params.featureTaskId);
    const records = await releaseDecisionService.listFeatureReleaseRecords(
      req.params.workspaceId,
      featureTaskId,
      req.user!.userId,
    );
    return res.status(200).json({ records });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listWorkspaceReleaseReadiness(req: AuthenticatedRequest, res: Response) {
  try {
    const rawFeatureTaskIds =
      typeof req.query.featureTaskIds === 'string'
        ? req.query.featureTaskIds.split(',').filter(Boolean)
        : [];
    const query = ListWorkspaceReleaseReadinessQuerySchema.parse({
      workspaceId: req.params.workspaceId,
      featureTaskIds: rawFeatureTaskIds,
    });
    const readiness = await releaseDecisionService.listWorkspaceReleaseReadiness(
      query.workspaceId,
      query.featureTaskIds,
      req.user!.userId,
    );
    return res.status(200).json({ readiness });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createQaSignOff(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateQaSignOffSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      featureTaskId: req.params.featureTaskId,
    });
    const qaSignOff = await releaseDecisionService.createQaSignOff(req.user!.userId, input);
    return res.status(201).json({ qaSignOff });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createReleaseDecision(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateReleaseDecisionSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      featureTaskId: req.params.featureTaskId,
    });
    const releaseDecision = await releaseDecisionService.createReleaseDecision(
      req.user!.userId,
      input,
    );
    return res.status(201).json({ releaseDecision });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function cancelQaSignOff(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CancelQaSignOffInputSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      featureTaskId: req.params.featureTaskId,
      qaSignOffId: req.params.qaSignOffId,
    });
    const qaSignOff = await releaseDecisionService.cancelQaSignOff(req.user!.userId, input);
    return res.status(200).json({ qaSignOff });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function cancelReleaseDecision(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CancelReleaseDecisionInputSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      featureTaskId: req.params.featureTaskId,
      releaseDecisionId: req.params.releaseDecisionId,
    });
    const releaseDecision = await releaseDecisionService.cancelReleaseDecision(
      req.user!.userId,
      input,
    );
    return res.status(200).json({ releaseDecision });
  } catch (error) {
    return handleError(res, error);
  }
}
