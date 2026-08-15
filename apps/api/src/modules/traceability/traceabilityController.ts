import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { traceabilityService } from './traceabilityService.js';
import { CreateRequirementTestCaseSchema } from '@qa/contracts';

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  if (message.startsWith('NOT_FOUND:')) {
    return res.status(404).json({
      type: 'https://api.qa-hub.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: message.replace('NOT_FOUND:', '').trim(),
      code: 'NOT_FOUND',
    });
  }
  if (message.startsWith('FORBIDDEN:')) {
    return res.status(403).json({
      type: 'https://api.qa-hub.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: message.replace('FORBIDDEN:', '').trim(),
      code: 'FORBIDDEN',
    });
  }
  if (message.startsWith('BAD_REQUEST:')) {
    return res.status(400).json({
      type: 'https://api.qa-hub.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: message.replace('BAD_REQUEST:', '').trim(),
      code: 'BAD_REQUEST',
    });
  }
  return res.status(500).json({
    type: 'https://api.qa-hub.com/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: message,
    code: 'INTERNAL_SERVER_ERROR',
  });
}

export const getTraceabilitySummary = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;
    const summary = await traceabilityService.getWorkspaceTraceabilityMatrix(workspaceId, actorId);
    return res.status(200).json(summary);
  } catch (error) {
    return handleError(res, error);
  }
};

export const listRequirementTestCases = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, requirementId } = req.params;
    const actorId = req.user!.userId;
    const testCases = await traceabilityService.listRequirementTestCases(
      workspaceId,
      requirementId,
      actorId
    );
    return res.status(200).json({ testCases });
  } catch (error) {
    return handleError(res, error);
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
      parsed
    );
    return res.status(201).json({ testCase });
  } catch (error) {
    return handleError(res, error);
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
      executionDetails
    );
    return res.status(200).json({ testCase });
  } catch (error) {
    return handleError(res, error);
  }
};
