import type { Response } from 'express';
import {
  AssignmentConflictPreviewInputSchema,
  TeamCapacityTimelineQuerySchema,
} from '@qlick/contracts';
import { capacityService } from './capacityService.js';
import type { WorkspaceRequest } from '../../policies/workspacePolicy.js';

export async function previewAssignmentConflict(
  req: WorkspaceRequest,
  res: Response,
): Promise<Response> {
  const actorId = req.user?.userId;
  const workspaceId = req.params.workspaceId;

  if (!actorId) {
    return res.status(401).json({
      type: 'https://api.qa-hub.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Authentication required.',
      code: 'UNAUTHORIZED',
    });
  }

  const parseResult = AssignmentConflictPreviewInputSchema.safeParse({
    ...req.body,
    workspaceId,
  });

  if (!parseResult.success) {
    return res.status(400).json({
      type: 'https://api.qa-hub.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: parseResult.error.errors[0]?.message || 'Invalid input data.',
      code: 'BAD_REQUEST',
      errors: parseResult.error.errors,
    });
  }

  try {
    const preview = await capacityService.previewAssignmentConflict(
      workspaceId,
      actorId,
      parseResult.data,
    );
    return res.status(200).json(preview);
  } catch (error) {
    console.error('Error previewing capacity assignment conflict:', error);
    return res.status(500).json({
      type: 'https://api.qa-hub.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while calculating workload conflict.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}

export async function getTeamTimeline(
  req: WorkspaceRequest,
  res: Response,
): Promise<Response> {
  const actorId = req.user?.userId;
  const workspaceId = req.params.workspaceId;

  if (!actorId) {
    return res.status(401).json({
      type: 'https://api.qa-hub.com/errors/unauthorized',
      title: 'Unauthorized',
      status: 401,
      detail: 'Authentication required.',
      code: 'UNAUTHORIZED',
    });
  }

  const parseResult = TeamCapacityTimelineQuerySchema.safeParse({
    ...req.query,
    workspaceId,
  });

  if (!parseResult.success) {
    return res.status(400).json({
      type: 'https://api.qa-hub.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: parseResult.error.errors[0]?.message || 'Invalid query parameters.',
      code: 'BAD_REQUEST',
      errors: parseResult.error.errors,
    });
  }

  try {
    const timeline = await capacityService.getTeamCapacityTimeline(
      workspaceId,
      actorId,
      parseResult.data,
    );
    return res.status(200).json(timeline);
  } catch (error) {
    console.error('Error retrieving team capacity timeline:', error);
    return res.status(500).json({
      type: 'https://api.qa-hub.com/errors/internal-server-error',
      title: 'Internal Server Error',
      status: 500,
      detail: 'An error occurred while retrieving team capacity timeline.',
      code: 'INTERNAL_SERVER_ERROR',
    });
  }
}
