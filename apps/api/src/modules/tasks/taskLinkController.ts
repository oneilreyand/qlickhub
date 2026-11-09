import { Response, NextFunction } from 'express';
import { WorkspaceRequest } from '../../policies/workspacePolicy.js';
import {
  CreateTaskLinkSchema,
  UpdateTaskLinkSchema,
  ReorderTaskLinksSchema,
} from '@qlick/contracts';
import { taskLinkService } from './taskLinkService.js';
import { assertCanReadTaskLinks, assertCanManageTaskLinks } from '../../policies/taskLinkPolicy.js';
import { sendProblemDetails } from '../../http/problemDetails.js';

export const taskLinkController = {
  async listTaskLinks(req: WorkspaceRequest, res: Response, _next: NextFunction) {
    try {
      const { workspaceId, taskId } = req.params;
      const role = req.workspaceMembership?.role;
      assertCanReadTaskLinks(role);

      const data = await taskLinkService.listTaskLinks(workspaceId, taskId);
      return res.status(200).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async createTaskLink(req: WorkspaceRequest, res: Response, _next: NextFunction) {
    try {
      const { workspaceId, taskId } = req.params;
      const role = req.workspaceMembership?.role;
      assertCanManageTaskLinks(role);

      const parsedInput = CreateTaskLinkSchema.parse(req.body);
      const createdBy = req.user?.userId ?? null;

      const data = await taskLinkService.createTaskLink(
        workspaceId,
        taskId,
        parsedInput,
        createdBy,
      );
      return res.status(201).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async updateTaskLink(req: WorkspaceRequest, res: Response, _next: NextFunction) {
    try {
      const { workspaceId, taskId, linkId } = req.params;
      const role = req.workspaceMembership?.role;
      assertCanManageTaskLinks(role);

      const parsedInput = UpdateTaskLinkSchema.parse(req.body);

      const data = await taskLinkService.updateTaskLink(workspaceId, taskId, linkId, parsedInput);
      return res.status(200).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async deleteTaskLink(req: WorkspaceRequest, res: Response, _next: NextFunction) {
    try {
      const { workspaceId, taskId, linkId } = req.params;
      const role = req.workspaceMembership?.role;
      assertCanManageTaskLinks(role);

      await taskLinkService.deleteTaskLink(workspaceId, taskId, linkId);
      return res.status(200).json({ success: true });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },

  async reorderTaskLinks(req: WorkspaceRequest, res: Response, _next: NextFunction) {
    try {
      const { workspaceId, taskId } = req.params;
      const role = req.workspaceMembership?.role;
      assertCanManageTaskLinks(role);

      const parsedInput = ReorderTaskLinksSchema.parse(req.body);

      const data = await taskLinkService.reorderTaskLinks(workspaceId, taskId, parsedInput.linkIds);
      return res.status(200).json({ data });
    } catch (error) {
      return sendProblemDetails(res, error);
    }
  },
};
