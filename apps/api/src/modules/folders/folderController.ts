import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { folderService } from './folderService.js';
import {
  CreateFolderSchema,
  UpdateFolderSchema,
  MoveFolderSchema,
  ArchiveFolderSchema,
} from '@qa/contracts';

function handleError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : 'An error occurred';

  if (message.startsWith('NOT_FOUND')) {
    return res.status(404).json({
      type: 'https://api.qa-hub.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: message.replace('NOT_FOUND: ', ''),
      code: 'NOT_FOUND',
    });
  }

  if (message.startsWith('BAD_REQUEST')) {
    return res.status(400).json({
      type: 'https://api.qa-hub.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: message.replace('BAD_REQUEST: ', ''),
      code: 'BAD_REQUEST',
    });
  }

  if (message.startsWith('FORBIDDEN')) {
    return res.status(403).json({
      type: 'https://api.qa-hub.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: message.replace('FORBIDDEN: ', ''),
      code: 'FORBIDDEN',
    });
  }

  return res.status(500).json({
    type: 'https://api.qa-hub.com/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: message,
    code: 'INTERNAL_ERROR',
  });
}

export const getFolderTree = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const includeArchived = req.query.includeArchived === 'true';

    const folders = await folderService.getFolderTree(workspaceId, includeArchived);
    return res.status(200).json({ data: { workspaceId, folders } });
  } catch (error) {
    return handleError(res, error);
  }
};

export const createFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const userId = req.user!.userId;

    const parseResult = CreateFolderSchema.safeParse({
      ...req.body,
      workspaceId,
    });

    if (!parseResult.success) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid folder creation parameters.',
        code: 'BAD_REQUEST',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        })),
      });
    }

    const folder = await folderService.createFolder(userId, parseResult.data);
    return res.status(201).json({ data: folder });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const { folderId } = req.params;

    const parseResult = UpdateFolderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid folder update parameters.',
        code: 'BAD_REQUEST',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        })),
      });
    }

    const updated = await folderService.updateFolder(workspaceId, folderId, parseResult.data);
    return res.status(200).json({ data: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

export const moveFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const { folderId } = req.params;

    const parseResult = MoveFolderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid folder move parameters.',
        code: 'BAD_REQUEST',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        })),
      });
    }

    const moved = await folderService.moveFolder(workspaceId, folderId, parseResult.data);
    return res.status(200).json({ data: moved });
  } catch (error) {
    return handleError(res, error);
  }
};

export const archiveFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const { folderId } = req.params;

    const parseResult = ArchiveFolderSchema.safeParse(req.body || {});
    const archive = parseResult.success ? parseResult.data.archive : true;

    const archived = await folderService.archiveFolder(workspaceId, folderId, archive);
    return res.status(200).json({ data: archived });
  } catch (error) {
    return handleError(res, error);
  }
};
