import type { Response } from 'express';
import {
  CreateFeatureSpecSchema,
  FEATURE_SPEC_INCOMPLETE_CODE,
  SaveFeatureSpecSectionSchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { FeatureSpecIncompleteError, featureSpecService } from './featureSpecService.js';

function sendError(res: Response, error: unknown): Response {
  if (error instanceof FeatureSpecIncompleteError) {
    return res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Bad Request',
      status: 400,
      detail: 'Required fields are empty.',
      code: FEATURE_SPEC_INCOMPLETE_CODE,
      missingFields: error.missingFields,
    });
  }
  return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
}

export async function createFeatureSpec(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateFeatureSpecSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
    });
    const featureSpec = await featureSpecService.create(req.user!.userId, input);
    return res.status(201).json({ featureSpec });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function listFeatureSpecs(req: AuthenticatedRequest, res: Response) {
  try {
    const featureTaskId =
      typeof req.query.featureTaskId === 'string' ? req.query.featureTaskId : undefined;
    const featureSpecs = await featureSpecService.list(req.params.workspaceId, req.user!.userId, {
      featureTaskId,
    });
    return res.status(200).json({ featureSpecs });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function getFeatureSpec(req: AuthenticatedRequest, res: Response) {
  try {
    const featureSpec = await featureSpecService.getById(
      req.params.workspaceId,
      req.params.specId,
      req.user!.userId,
    );
    return res.status(200).json({ featureSpec });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function saveFeatureSpecSection(req: AuthenticatedRequest, res: Response) {
  try {
    const input = SaveFeatureSpecSectionSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      specId: req.params.specId,
      section: req.params.section,
    });
    const featureSpec = await featureSpecService.saveSection(req.user!.userId, input);
    return res.status(200).json({ featureSpec });
  } catch (error) {
    return sendError(res, error);
  }
}
