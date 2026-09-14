import type { Response } from 'express';
import {
  CreateFeatureReadinessBaselineSchema,
  CreateFeatureReadinessReviewSchema,
  CreateRequirementFindingClarificationSchema,
  CreateRequirementFindingGovernanceDecisionSchema,
  CreateRequirementFindingSchema,
  CreateRequirementFindingStatusEventSchema,
  CreateRequirementFindingTriagePositionSchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { featureReadinessService } from './featureReadinessService.js';
import { requirementFindingService } from './requirementFindingService.js';

export async function getFeatureReadiness(req: AuthenticatedRequest, res: Response) {
  try {
    const { workspaceId, featureTaskId } = req.params;
    const readiness = await featureReadinessService.getState(
      workspaceId,
      featureTaskId,
      req.user!.userId,
    );
    return res.status(200).json({ readiness });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}

export async function createFeatureReadinessReview(req: AuthenticatedRequest, res: Response) {
  try {
    const { workspaceId, featureTaskId } = req.params;
    const input = CreateFeatureReadinessReviewSchema.parse({
      ...req.body,
      workspaceId,
      featureTaskId,
    });
    const review = await featureReadinessService.createReview(req.user!.userId, input);
    return res.status(201).json({ review });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}

export async function createFeatureReadinessBaseline(req: AuthenticatedRequest, res: Response) {
  try {
    const { workspaceId, featureTaskId } = req.params;
    const input = CreateFeatureReadinessBaselineSchema.parse({
      ...req.body,
      workspaceId,
      featureTaskId,
    });
    const baseline = await featureReadinessService.createBaseline(req.user!.userId, input);
    return res.status(201).json({ baseline });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}

export async function getRequirementFindings(req: AuthenticatedRequest, res: Response) {
  try {
    const { workspaceId, featureTaskId } = req.params;
    const findingState = await requirementFindingService.getState(
      workspaceId,
      featureTaskId,
      req.user!.userId,
    );
    return res.status(200).json({ findingState });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}

export async function createRequirementFinding(req: AuthenticatedRequest, res: Response) {
  try {
    const { workspaceId, featureTaskId } = req.params;
    const input = CreateRequirementFindingSchema.parse({
      ...req.body,
      workspaceId,
      featureTaskId,
    });
    const finding = await requirementFindingService.createFinding(req.user!.userId, input);
    return res.status(201).json({ finding });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}

export async function addRequirementFindingClarification(req: AuthenticatedRequest, res: Response) {
  try {
    const { workspaceId, featureTaskId, findingId } = req.params;
    const input = CreateRequirementFindingClarificationSchema.parse({
      ...req.body,
      workspaceId,
      featureTaskId,
      findingId,
    });
    const finding = await requirementFindingService.addClarification(req.user!.userId, input);
    return res.status(201).json({ finding });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}

export async function addRequirementFindingTriagePosition(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { workspaceId, featureTaskId, findingId } = req.params;
    const input = CreateRequirementFindingTriagePositionSchema.parse({
      ...req.body,
      workspaceId,
      featureTaskId,
      findingId,
    });
    const finding = await requirementFindingService.addTriagePosition(req.user!.userId, input);
    return res.status(201).json({ finding });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}

export async function recordRequirementFindingGovernanceDecision(
  req: AuthenticatedRequest,
  res: Response,
) {
  try {
    const { workspaceId, featureTaskId, findingId } = req.params;
    const input = CreateRequirementFindingGovernanceDecisionSchema.parse({
      ...req.body,
      workspaceId,
      featureTaskId,
      findingId,
    });
    const finding = await requirementFindingService.recordGovernanceDecision(
      req.user!.userId,
      input,
    );
    return res.status(201).json({ finding });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}

export async function changeRequirementFindingStatus(req: AuthenticatedRequest, res: Response) {
  try {
    const { workspaceId, featureTaskId, findingId } = req.params;
    const input = CreateRequirementFindingStatusEventSchema.parse({
      ...req.body,
      workspaceId,
      featureTaskId,
      findingId,
    });
    const finding = await requirementFindingService.changeStatus(req.user!.userId, input);
    return res.status(201).json({ finding });
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
}
