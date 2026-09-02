import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { workspaceService } from './workspaceService.js';
import {
  CreateWorkspaceSchema,
  UpdateWorkspaceSchema,
  AddWorkspaceMemberSchema,
  UpdateMemberRoleSchema,
  GrantTaskCreationPermissionSchema,
  WorkspaceActivityQuerySchema,
} from '@qlick/contracts';
import { sendProblemDetails } from '../../http/problemDetails.js';

export const createWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parseResult = CreateWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendProblemDetails(res, parseResult.error, {
        zodDetail: 'Invalid workspace creation parameters.',
      });
    }

    const userId = req.user!.userId;
    const workspace = await workspaceService.createWorkspace(userId, parseResult.data);
    return res.status(201).json({ data: workspace });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const getUserWorkspaces = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const workspaces = await workspaceService.getUserWorkspaces(userId);
    return res.status(200).json({ data: workspaces });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const getWorkspaceById = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { workspaceId } = req.params;
    const workspace = await workspaceService.getWorkspaceById(workspaceId, userId);
    return res.status(200).json({ data: workspace });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const updateWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parseResult = UpdateWorkspaceSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendProblemDetails(res, parseResult.error, {
        zodDetail: 'Invalid workspace update parameters.',
      });
    }

    const updated = await workspaceService.updateWorkspace(workspaceId, parseResult.data);
    return res.status(200).json({ data: updated });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const archiveWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspace = await workspaceService.setWorkspaceArchived(
      req.params.workspaceId,
      req.user!.userId,
      true,
    );
    return res.status(200).json({ data: workspace });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const restoreWorkspace = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const workspace = await workspaceService.setWorkspaceArchived(
      req.params.workspaceId,
      req.user!.userId,
      false,
    );
    return res.status(200).json({ data: workspace });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const getWorkspaceMembers = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const members = await workspaceService.getWorkspaceMembers(workspaceId);
    return res.status(200).json({ data: members });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const addWorkspaceMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parseResult = AddWorkspaceMemberSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendProblemDetails(res, parseResult.error, {
        zodDetail: 'Invalid member addition parameters.',
      });
    }

    const member = await workspaceService.addWorkspaceMember(
      workspaceId,
      parseResult.data,
      req.user?.userId,
    );
    return res.status(201).json({ data: member });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const updateMemberRole = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, memberUserId } = req.params;
    const parseResult = UpdateMemberRoleSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendProblemDetails(res, parseResult.error, {
        zodDetail: 'Invalid role update parameters.',
      });
    }

    const updated = await workspaceService.updateMemberRole(
      workspaceId,
      memberUserId,
      parseResult.data,
      req.user!.userId,
    );
    return res.status(200).json({ data: updated });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const removeWorkspaceMember = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, memberUserId } = req.params;
    await workspaceService.removeWorkspaceMember(workspaceId, memberUserId, req.user!.userId);
    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const listTaskCreationPermissions = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const permissions = await workspaceService.listTaskCreationPermissions(workspaceId);
    return res.status(200).json({ data: { permissions } });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const grantTaskCreationPermission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parseResult = GrantTaskCreationPermissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return sendProblemDetails(res, parseResult.error, {
        zodDetail: 'Invalid permission grant parameters.',
      });
    }

    const permission = await workspaceService.grantTaskCreationPermission(
      workspaceId,
      req.user!.userId,
      parseResult.data,
    );
    return res.status(201).json({ data: permission });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const revokeTaskCreationPermission = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, targetUserId } = req.params;
    await workspaceService.revokeTaskCreationPermission(workspaceId, targetUserId);
    return res.status(200).json({ data: { success: true } });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};

export const getWorkspaceActivities = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const parseResult = WorkspaceActivityQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return sendProblemDetails(res, parseResult.error, {
        zodCode: 'VALIDATION_ERROR',
        zodDetail: parseResult.error.errors[0]?.message || 'Invalid query parameters',
      });
    }
    const activities = await workspaceService.listWorkspaceActivities(
      workspaceId,
      parseResult.data,
      req.user!.userId,
    );
    return res.status(200).json({ data: activities });
  } catch (error) {
    return sendProblemDetails(res, error);
  }
};
