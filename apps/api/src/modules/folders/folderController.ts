import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { folderService } from './folderService.js';
import {
  CreateFolderSchema,
  UpdateFolderSchema,
  MoveFolderSchema,
  ArchiveFolderSchema,
} from '@qlick/contracts';
import { sendProblemDetails } from '../../http/problemDetails.js';

export const getFolderTree = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const includeArchived = req.query.includeArchived === 'true';

    const folders = await folderService.getFolderTree(workspaceId, includeArchived);
    return res.status(200).json({ data: { workspaceId, folders } });
  } catch (error) {
    return sendProblemDetails(res, error);
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
      return sendProblemDetails(res, parseResult.error, {
        zodDetail: 'Invalid folder creation parameters.',
      });
    }

    const folder = await folderService.createFolder(userId, parseResult.data);
    return res.status(201).json({ data: folder });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const updateFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const { folderId } = req.params;

    const parseResult = UpdateFolderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendProblemDetails(res, parseResult.error, {
        zodDetail: 'Invalid folder update parameters.',
      });
    }

    const updated = await folderService.updateFolder(workspaceId, folderId, parseResult.data);
    return res.status(200).json({ data: updated });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const moveFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const { folderId } = req.params;

    const parseResult = MoveFolderSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendProblemDetails(res, parseResult.error, {
        zodDetail: 'Invalid folder move parameters.',
      });
    }

    const moved = await folderService.moveFolder(workspaceId, folderId, parseResult.data);
    return res.status(200).json({ data: moved });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const archiveFolder = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspaceId = req.params.workspaceId || req.params.projectId;
    const { folderId } = req.params;

    const parseResult = ArchiveFolderSchema.safeParse(req.body || {});
    const archive = parseResult.success ? parseResult.data.archive : true;

    const archived = await folderService.archiveFolder(
      workspaceId,
      folderId,
      archive,
      req.user!.userId,
    );
    return res.status(200).json({ data: archived });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};
