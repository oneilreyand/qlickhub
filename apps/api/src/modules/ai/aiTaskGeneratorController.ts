import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { aiTaskGeneratorService } from './aiTaskGeneratorService.js';
import {
  GenerateTaskDraftInputSchema,
  ApplyTaskDraftInputSchema,
  RefineTaskChatInputSchema,
  SynthesizeTaskDraftFromChatInputSchema,
} from '@qlick/contracts';
import { sendProblemDetails } from '../../http/problemDetails.js';

export const generateTaskDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;

    const parsed = GenerateTaskDraftInputSchema.parse({
      ...req.body,
      workspaceId,
    });

    const draft = await aiTaskGeneratorService.generateDraft(workspaceId, actorId, parsed);
    return res.status(200).json(draft);
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const refineTaskChat = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;

    const parsed = RefineTaskChatInputSchema.parse({
      ...req.body,
      workspaceId,
    });

    const result = await aiTaskGeneratorService.refineChat(workspaceId, actorId, parsed);
    return res.status(200).json(result);
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const synthesizeFromChat = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;

    const parsed = SynthesizeTaskDraftFromChatInputSchema.parse({
      ...req.body,
      workspaceId,
    });

    const draft = await aiTaskGeneratorService.synthesizeFromChat(workspaceId, actorId, parsed);
    return res.status(200).json(draft);
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};

export const applyTaskDraft = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;

    const parsed = ApplyTaskDraftInputSchema.parse({
      ...req.body,
      workspaceId,
    });

    const result = await aiTaskGeneratorService.applyDraft(workspaceId, actorId, parsed);
    return res.status(201).json(result);
  } catch (error) {
    return sendProblemDetails(res, error, { zodCode: 'VALIDATION_ERROR' });
  }
};
