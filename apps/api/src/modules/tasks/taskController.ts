import { Response, NextFunction } from 'express';
import {
  TaskListQuerySchema,
  CreateTaskSchema,
  UpdateTaskSchema,
  MoveTaskSchema,
  CompleteTaskSchema,
  TaskActivityQuerySchema,
  TaskCommentQuerySchema,
  CreateTaskCommentSchema,
  UpdateTaskCommentSchema,
  UpdateTaskStatusSchema,
} from '@qlick/contracts';
import { taskService } from './taskService.js';
import { taskDiscussionService } from './taskDiscussionService.js';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { handleError } from '../../http/errors/handleError.js';

export class TaskController {
  async listTasks(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId || (req.query.workspaceId as string);
      const query = TaskListQuerySchema.parse({
        ...req.query,
        workspaceId,
      });

      const membership = (req as any).workspaceMembership;
      const result = await taskService.listTasks(
        workspaceId,
        query,
        req.user?.userId,
        membership?.role,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  }

  async listSubtasks(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const parentTaskId = req.params.taskId;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const membership = (req as any).workspaceMembership;
      const result = await taskService.listSubtasks(
        workspaceId,
        parentTaskId,
        page,
        limit,
        req.user?.userId,
        membership?.role,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  }

  async listTaskActivity(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const query = TaskActivityQuerySchema.parse({
        ...req.query,
        workspaceId,
        taskId,
      });

      const result = await taskService.listTaskActivity(
        req.user!.userId,
        workspaceId,
        taskId,
        query,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  }

  async listTaskComments(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const query = TaskCommentQuerySchema.parse({
        ...req.query,
        workspaceId,
        taskId,
      });

      const result = await taskDiscussionService.listTaskComments(
        req.user!.userId,
        workspaceId,
        taskId,
        query,
      );
      res.status(200).json({ data: result });
    } catch (err) {
      handleError(res, err);
    }
  }

  async createTaskComment(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const input = CreateTaskCommentSchema.parse({
        ...req.body,
        workspaceId,
        taskId,
      });

      const comment = await taskDiscussionService.createTaskComment(
        req.user!.userId,
        workspaceId,
        taskId,
        input,
      );
      res.status(201).json({ data: comment });
    } catch (err) {
      handleError(res, err);
    }
  }

  async updateTaskComment(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const commentId = req.params.commentId;
      const input = UpdateTaskCommentSchema.parse(req.body);

      const comment = await taskDiscussionService.updateTaskComment(
        req.user!.userId,
        workspaceId,
        taskId,
        commentId,
        input,
      );
      res.status(200).json({ data: comment });
    } catch (err) {
      handleError(res, err);
    }
  }

  async deleteTaskComment(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const commentId = req.params.commentId;

      const comment = await taskDiscussionService.deleteTaskComment(
        req.user!.userId,
        workspaceId,
        taskId,
        commentId,
      );
      res.status(200).json({ data: comment });
    } catch (err) {
      handleError(res, err);
    }
  }

  async createTask(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId || req.body.workspaceId;
      const input = CreateTaskSchema.parse({
        ...req.body,
        workspaceId,
      });

      const userId = req.user!.userId;
      const task = await taskService.createTask(userId, input);
      res.status(201).json({ data: task });
    } catch (err) {
      handleError(res, err);
    }
  }

  async createSubtask(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const parentTaskId = req.params.taskId;
      const input = CreateTaskSchema.parse({
        ...req.body,
        workspaceId,
        parentTaskId,
      });

      const userId = req.user!.userId;
      const subtask = await taskService.createTask(userId, input);
      res.status(201).json({ data: subtask });
    } catch (err) {
      handleError(res, err);
    }
  }

  async updateTask(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const input = UpdateTaskSchema.parse(req.body);

      const task = await taskService.updateTask(req.user!.userId, workspaceId, taskId, input);
      res.status(200).json({ data: task });
    } catch (err) {
      handleError(res, err);
    }
  }

  async moveTask(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const input = MoveTaskSchema.parse(req.body);

      const task = await taskService.moveTask(req.user!.userId, workspaceId, taskId, input);
      res.status(200).json({ data: task });
    } catch (err) {
      handleError(res, err);
    }
  }

  async completeTask(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const input = CompleteTaskSchema.parse(req.body);

      const task = await taskService.completeTask(req.user!.userId, workspaceId, taskId, input);
      res.status(200).json({ data: task });
    } catch (err) {
      handleError(res, err);
    }
  }

  async getTask(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const membership = (req as any).workspaceMembership;

      const task = await taskService.getTask(
        workspaceId,
        taskId,
        req.user!.userId,
        membership?.role,
      );
      res.status(200).json({ data: task });
    } catch (err) {
      handleError(res, err);
    }
  }

  async deleteTask(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;

      await taskService.deleteTask(workspaceId, taskId, req.user!.userId);
      res.status(200).json({ data: { success: true } });
    } catch (err) {
      handleError(res, err);
    }
  }

  async updateTaskStatus(
    req: AuthenticatedRequest,
    res: Response,
    _next: NextFunction,
  ): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const input = UpdateTaskStatusSchema.parse(req.body);

      const task = await taskService.updateTask(req.user!.userId, workspaceId, taskId, input);
      res.status(200).json({ data: task });
    } catch (err) {
      handleError(res, err);
    }
  }
}

export const taskController = new TaskController();
