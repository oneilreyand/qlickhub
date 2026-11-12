import type { NextFunction, Response } from 'express';
import { TaskModel } from '../../db/models/index.js';
import { assertTaskAccessForActor } from '../../modules/tasks/internal/taskAccess.js';
import type { WorkspaceRequest } from '../../policies/workspacePolicy.js';
import { formatProblemDetails } from '../problemDetails.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Applies task-level read access (AUTH-013, ADR-043) to a task-scoped route.
 *
 * Mount after `requireWorkspaceMember`. A task that does not exist in the Workspace is left to
 * the route handler so its existing not-found behaviour is unchanged.
 */
export const requireTaskReadAccess = (taskParam: 'taskId' | 'featureTaskId' = 'taskId') => {
  return async (req: WorkspaceRequest, res: Response, next: NextFunction) => {
    try {
      const membership = req.workspaceMembership;
      const actorId = req.user?.userId;
      if (!membership || !actorId) {
        throw new Error('FORBIDDEN: You do not have permission to access this task.');
      }
      if (membership.role !== 'dev' && membership.role !== 'qa') return next();

      const taskId = req.params[taskParam];
      if (!taskId || !UUID_PATTERN.test(taskId)) return next();

      const task = await TaskModel.findOne({
        where: { id: taskId, workspaceId: membership.workspaceId },
        attributes: ['id', 'parentTaskId', 'assigneeId', 'reporterId'],
      });
      if (!task) return next();

      await assertTaskAccessForActor(membership.workspaceId, task, actorId, membership.role);
      return next();
    } catch (error) {
      return formatProblemDetails(error, res);
    }
  };
};
