import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { traceabilityService } from './traceabilityService.js';
import { CreateRequirementTestCaseSchema } from '@qlick/contracts';
import { sendProblemDetails } from '../../http/problemDetails.js';

export const getTraceabilitySummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;
    const summary = await traceabilityService.getWorkspaceTraceabilityMatrix(workspaceId, actorId);
    return res.status(200).json(summary);
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const getParentTaskDeliveryTrace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;
    const deliveryTrace = await traceabilityService.getParentTaskDeliveryTrace(
      workspaceId,
      taskId,
      actorId,
    );
    return res.status(200).json(deliveryTrace);
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const listRequirementTestCases = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, requirementId } = req.params;
    const actorId = req.user!.userId;
    const testCases = await traceabilityService.listRequirementTestCases(
      workspaceId,
      requirementId,
      actorId,
    );
    return res.status(200).json({ testCases });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const createRequirementTestCase = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, requirementId } = req.params;
    const actorId = req.user!.userId;

    const parsed = CreateRequirementTestCaseSchema.parse({
      ...req.body,
      workspaceId,
      requirementId,
    });

    const testCase = await traceabilityService.createRequirementTestCase(
      workspaceId,
      actorId,
      parsed,
    );
    return res.status(201).json({ testCase });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const updateTestCaseStatus = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, testCaseId } = req.params;
    const { status, executionDetails } = req.body;
    const actorId = req.user!.userId;

    const testCase = await traceabilityService.updateTestCaseStatus(
      workspaceId,
      testCaseId,
      actorId,
      status,
      executionDetails,
    );
    return res.status(200).json({ testCase });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};
