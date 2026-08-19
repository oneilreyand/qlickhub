import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../http/middleware/authenticate.js';
import { WorkspaceMemberModel } from '../db/models/workspaceMember.js';
import { WorkspaceRole } from '@qlick/contracts';

export interface WorkspaceRequest extends AuthenticatedRequest {
  workspaceMembership?: WorkspaceMemberModel;
}

/**
 * Checks if a workspace role matches an allowed role list.
 */
export function hasWorkspaceRole(
  userRole: WorkspaceRole,
  allowedRoles: WorkspaceRole[]
): boolean {
  return allowedRoles.includes(userRole);
}

/**
 * Helper to check if role is owner or admin.
 */
export function isWorkspaceAdminOrOwner(userRole: WorkspaceRole): boolean {
  return userRole === 'owner' || userRole === 'admin';
}

/**
 * Express middleware to enforce workspace membership and optional role checks.
 */
export const requireWorkspaceMember = (allowedRoles?: WorkspaceRole[]) => {
  return async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    const userId = req.user?.userId;
    const workspaceId =
      req.params.workspaceId ||
      req.params.projectId ||
      req.body?.workspaceId ||
      req.body?.projectId ||
      (typeof req.query?.workspaceId === 'string' ? req.query.workspaceId : undefined) ||
      (typeof req.query?.projectId === 'string' ? req.query.projectId : undefined);

    if (!userId) {
      return res.status(401).json({
        type: 'https://api.qa-hub.com/errors/unauthorized',
        title: 'Unauthorized',
        status: 401,
        detail: 'Authentication required.',
        code: 'UNAUTHORIZED',
      });
    }

    if (!workspaceId) {
      return res.status(400).json({
        type: 'https://api.qa-hub.com/errors/bad-request',
        title: 'Bad Request',
        status: 400,
        detail: 'Workspace ID is required.',
        code: 'BAD_REQUEST',
      });
    }

    try {
      const membership = await WorkspaceMemberModel.findOne({
        where: { workspaceId, userId },
      });

      if (!membership) {
        return res.status(403).json({
          type: 'https://api.qa-hub.com/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'You are not a member of this workspace.',
          code: 'FORBIDDEN',
        });
      }

      if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
        return res.status(403).json({
          type: 'https://api.qa-hub.com/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: `Role '${membership.role}' does not have permission for this action.`,
          code: 'FORBIDDEN',
        });
      }

      req.workspaceMembership = membership;
      return next();
    } catch (error) {
      return next(error);
    }
  };
};

/**
 * Express middleware to enforce permission to create new workspaces.
 * Allowed roles: 'owner', 'admin', 'po'.
 */
export const requireWorkspaceCreationPermission = () => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    const userRole = req.user?.role;
    const allowedRoles: string[] = ['owner', 'admin', 'po'];

    if (!userRole || !allowedRoles.includes(userRole)) {
      return res.status(403).json({
        type: 'https://api.qa-hub.com/errors/forbidden',
        title: 'Forbidden',
        status: 403,
        detail: 'Only workspace owners, admins, and product owners are authorized to create new workspaces.',
        code: 'FORBIDDEN',
      });
    }

    return next();
  };
};

/**
 * Middleware requiring owner or admin role in workspace.
 */
export const requireWorkspaceAdmin = requireWorkspaceMember(['owner', 'admin']);
