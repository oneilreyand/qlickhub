import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { requirementService } from './requirementService.js';
import { CreateRequirementSchema, LinkRequirementSchema } from '@qa/contracts';

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

export const listWorkspaceRequirements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;
    const requirements = await requirementService.listWorkspaceRequirements(workspaceId, actorId);
    return res.status(200).json({ requirements });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createRequirement = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;

    const parsed = CreateRequirementSchema.parse({
      ...req.body,
      workspaceId,
    });

    const requirement = await requirementService.createRequirement(workspaceId, actorId, parsed);
    return res.status(201).json({ requirement });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listTaskRequirements = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;
    const links = await requirementService.listTaskRequirementLinks(workspaceId, taskId, actorId);
    return res.status(200).json({ links });
  } catch (error) {
    return handleError(res, error);
  }
};

export const linkRequirementToTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;

    const parsed = LinkRequirementSchema.parse({
      ...req.body,
      workspaceId,
    });

    let targetRequirementId = parsed.requirementId;

    if (!targetRequirementId) {
      if (!parsed.code || !parsed.title) {
        return res.status(400).json({
          type: 'https://api.qa-hub.com/errors/bad-request',
          title: 'Bad Request',
          status: 400,
          detail: 'Either requirementId or both code and title must be provided.',
          code: 'BAD_REQUEST',
        });
      }
      const created = await requirementService.createRequirement(workspaceId, actorId, {
        code: parsed.code,
        title: parsed.title,
        url: parsed.url,
      });
      targetRequirementId = created.id;
    }

    const link = await requirementService.linkRequirementToTask(
      workspaceId,
      taskId,
      actorId,
      targetRequirementId
    );
    return res.status(201).json({ link });
  } catch (error) {
    return handleError(res, error);
  }
};

export const unlinkRequirementFromTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId, requirementId } = req.params;
    const actorId = req.user!.userId;

    await requirementService.unlinkRequirementFromTask(
      workspaceId,
      taskId,
      actorId,
      requirementId
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleError(res, error);
  }
};
