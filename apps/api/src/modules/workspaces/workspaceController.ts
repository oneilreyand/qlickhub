import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { workspaceService } from './workspaceService.js';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  UpdateMemberRoleSchema,
  GrantTaskCreationPermissionSchema,
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

  if (message.startsWith('FORBIDDEN')) {
    return res.status(403).json({
      type: 'https://api.qa-hub.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: message.replace('FORBIDDEN: ', ''),
      code: 'FORBIDDEN',
    });
  }

  if (message.startsWith('CONFLICT')) {
    return res.status(409).json({
      type: 'https://api.qa-hub.com/errors/conflict',
      title: 'Conflict',
      status: 409,
      detail: message.replace('CONFLICT: ', ''),
      code: 'CONFLICT',
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

export const createWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = CreateWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid workspace creation parameters.',
        code: 'BAD_REQUEST',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        })),
      });
    }

    const userId = req.user!.userId;
    const workspace = await workspaceService.createWorkspace(userId, parseResult.data);
    return res.status(201).json({ data: workspace });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getUserWorkspaces = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaces = await workspaceService.getUserWorkspaces(userId);
    return res.status(200).json({ data: workspaces });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getWorkspaceById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId } = req.params;
    const workspace = await workspaceService.getWorkspaceById(workspaceId, userId);
    return res.status(200).json({ data: workspace });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parseResult = UpdateWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid workspace update parameters.',
        code: 'BAD_REQUEST',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        })),
      });
    }

    const updated = await workspaceService.updateWorkspace(workspaceId, parseResult.data);
    return res.status(200).json({ data: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getWorkspaceMembers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const members = await workspaceService.getWorkspaceMembers(workspaceId);
    return res.status(200).json({ data: members });
  } catch (error) {
    return handleError(res, error);
  }
};

export const addWorkspaceMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parseResult = AddWorkspaceMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid member addition parameters.',
        code: 'BAD_REQUEST',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        })),
      });
    }

    const member = await workspaceService.addWorkspaceMember(workspaceId, parseResult.data, req.user?.userId);
    return res.status(201).json({ data: member });
  } catch (error) {
    return handleError(res, error);
  }
};

export const updateMemberRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, memberUserId } = req.params;
    const parseResult = UpdateMemberRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid role update parameters.',
        code: 'BAD_REQUEST',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        })),
      });
    }

    const updated = await workspaceService.updateMemberRole(workspaceId, memberUserId, parseResult.data.role);
    return res.status(200).json({ data: updated });
  } catch (error) {
    return handleError(res, error);
  }
};

export const removeWorkspaceMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, memberUserId } = req.params;
    await workspaceService.removeWorkspaceMember(workspaceId, memberUserId);
    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listTaskCreationPermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const permissions = await workspaceService.listTaskCreationPermissions(workspaceId);
    return res.status(200).json({ data: { permissions } });
  } catch (error) {
    return handleError(res, error);
  }
};

export const grantTaskCreationPermission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parseResult = GrantTaskCreationPermissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Validation Error',
        status: 400,
        detail: 'Invalid permission grant parameters.',
        code: 'BAD_REQUEST',
        errors: parseResult.error.errors.map((err) => ({
          field: err.path.join('.') || 'body',
          message: err.message,
        })),
      });
    }

    const permission = await workspaceService.grantTaskCreationPermission(
      workspaceId,
      req.user!.userId,
      parseResult.data
    );
    return res.status(201).json({ data: permission });
  } catch (error) {
    return handleError(res, error);
  }
};

export const revokeTaskCreationPermission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, targetUserId } = req.params;
    await workspaceService.revokeTaskCreationPermission(workspaceId, targetUserId);
    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return handleError(res, error);
  }
};

