import type { Response } from 'express';
import { z } from 'zod';
import {
  CancelQaSignOffInputSchema,
  CancelReleaseDecisionInputSchema,
  CreateQaSignOffSchema,
  CreateReleaseDecisionSchema,
  ListWorkspaceReleaseReadinessQuerySchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { releaseDecisionService } from './releaseDecisionService.js';
import { sendProblemDetails } from '../../http/problemDetails.js';

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
    return sendProblemDetails(res, error);
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
    return sendProblemDetails(res, error);
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
    return sendProblemDetails(res, error);
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
    return sendProblemDetails(res, error);
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
    return sendProblemDetails(res, error);
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
    return sendProblemDetails(res, error);
  }
}
