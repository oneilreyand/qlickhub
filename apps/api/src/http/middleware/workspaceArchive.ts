import { Request, Response, NextFunction } from 'express';
import { WorkspaceModel } from '../../db/models/workspace.js';

const workspacePath = /\/(?:workspaces|projects)\/([0-9a-f-]{36})(?:\/|$)/i;

export const rejectArchivedWorkspaceMutation = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (/\/workspaces\/[0-9a-f-]{36}\/(archive|restore)$/i.test(req.path)) return next();

  const workspaceId = workspacePath.exec(req.path)?.[1] || req.body?.workspaceId;
  if (typeof workspaceId !== 'string') return next();

  try {
    const workspace = await WorkspaceModel.findByPk(workspaceId, {
      attributes: ['id', 'archivedAt'],
    });
    if (workspace?.archivedAt) {
      return res.status(409).json({
        type: 'https://api.qa-hub.com/errors/workspace-archived',
        title: 'Workspace Archived',
        status: 409,
        detail: 'This Workspace is archived and read-only. Restore it before making changes.',
        code: 'WORKSPACE_ARCHIVED',
      });
    }
    return next();
  } catch (error) {
    return next(error);
  }
};
