import type { Response } from 'express';
import {
  AnswerFeatureSpecQuestionSchema,
  CreateFeatureSpecSchema,
  FEATURE_SPEC_AI_UNAVAILABLE_CODE,
  FEATURE_SPEC_INCOMPLETE_CODE,
  FEATURE_SPEC_QUESTIONS_UNANSWERED_CODE,
  GenerateFeatureSpecPlanSchema,
  SaveFeatureSpecSectionSchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { sendProblemDetails } from '../../http/problemDetails.js';
import { FeatureSpecAiUnavailableError } from './featureSpecAiClient.js';
import {
  FeatureSpecQuestionsUnansweredError,
  featureSpecAiService,
} from './featureSpecAiService.js';
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
  if (error instanceof FeatureSpecQuestionsUnansweredError) {
    return res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Bad Request',
      status: 400,
      detail: 'Answer the required questions before generating the Plan.',
      code: FEATURE_SPEC_QUESTIONS_UNANSWERED_CODE,
      questionIds: error.questionIds,
    });
  }
  if (error instanceof FeatureSpecAiUnavailableError) {
    return res.status(502).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Bad Gateway',
      status: 502,
      detail: error.message,
      code: FEATURE_SPEC_AI_UNAVAILABLE_CODE,
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

export async function listFeatureSpecQuestions(req: AuthenticatedRequest, res: Response) {
  try {
    const questions = await featureSpecAiService.listQuestions(
      req.params.workspaceId,
      req.params.specId,
      req.user!.userId,
    );
    return res.status(200).json({ questions });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function generateFeatureSpecQuestions(req: AuthenticatedRequest, res: Response) {
  try {
    const questions = await featureSpecAiService.generateQuestions(
      req.user!.userId,
      req.params.workspaceId,
      req.params.specId,
    );
    return res.status(201).json({ questions });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function answerFeatureSpecQuestion(req: AuthenticatedRequest, res: Response) {
  try {
    const input = AnswerFeatureSpecQuestionSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      specId: req.params.specId,
      questionId: req.params.questionId,
    });
    const question = await featureSpecAiService.answerQuestion(req.user!.userId, input);
    return res.status(200).json({ question });
  } catch (error) {
    return sendError(res, error);
  }
}

export async function generateFeatureSpecPlan(req: AuthenticatedRequest, res: Response) {
  try {
    const input = GenerateFeatureSpecPlanSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      specId: req.params.specId,
    });
    const result = await featureSpecAiService.generatePlan(req.user!.userId, input);
    return res.status(200).json(result);
  } catch (error) {
    return sendError(res, error);
  }
}
