import { Response, NextFunction } from 'express';
import { ZodError } from 'zod';
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
} from '@qa/contracts';
import { taskService } from './taskService.js';
import { taskDiscussionService } from './taskDiscussionService.js';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';

function formatProblemDetails(err: unknown, res: Response): Response {
  if (err instanceof ZodError) {
    return res.status(400).json({
      type: 'https://tools.ietf.org/html/rfc9457',
      title: 'Validation Error',
      status: 400,
      detail: 'Input validation failed',
      code: 'BAD_REQUEST',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  if (err instanceof Error) {
    if (err.message.startsWith('NOT_FOUND:')) {
      return res.status(404).json({
        type: 'https://tools.ietf.org/html/rfc9457',
        title: 'Not Found',
        status: 404,
        detail: err.message.replace('NOT_FOUND:', '').trim(),
        code: 'NOT_FOUND',
      });
    }
    if (err.message.startsWith('BAD_REQUEST:')) {
      return res.status(400).json({
        type: 'https://tools.ietf.org/html/rfc9457',
        title: 'Bad Request',
        status: 400,
        detail: err.message.replace('BAD_REQUEST:', '').trim(),
        code: 'BAD_REQUEST',
      });
    }
    if (err.message.startsWith('FORBIDDEN:')) {
      return res.status(403).json({
        type: 'https://tools.ietf.org/html/rfc9457',
        title: 'Forbidden',
        status: 403,
        detail: err.message.replace('FORBIDDEN:', '').trim(),
        code: 'FORBIDDEN',
      });
    }
  }

  return res.status(500).json({
    type: 'https://tools.ietf.org/html/rfc9457',
    title: 'Internal Server Error',
    status: 500,
    detail: err instanceof Error ? err.message : 'An unexpected error occurred',
    code: 'INTERNAL_ERROR',
  });
}

export class TaskController {
  async listTasks(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId || (req.query.workspaceId as string);
      const query = TaskListQuerySchema.parse({
        ...req.query,
        workspaceId,
      });

      const result = await taskService.listTasks(workspaceId, query);
      res.status(200).json({ data: result });
    } catch (err) {
      formatProblemDetails(err, res);
    }
  }

  async listSubtasks(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const parentTaskId = req.params.taskId;
      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 50;

      const result = await taskService.listSubtasks(workspaceId, parentTaskId, page, limit);
      res.status(200).json({ data: result });
    } catch (err) {
      formatProblemDetails(err, res);
    }
  }

  async listTaskActivity(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const query = TaskActivityQuerySchema.parse({
        ...req.query,
        workspaceId,
        taskId,
      });

      const result = await taskService.listTaskActivity(req.user!.userId, workspaceId, taskId, query);
      res.status(200).json({ data: result });
    } catch (err) {
      formatProblemDetails(err, res);
    }
  }

  async listTaskComments(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const query = TaskCommentQuerySchema.parse({
        ...req.query,
        workspaceId,
        taskId,
      });

      const result = await taskDiscussionService.listTaskComments(req.user!.userId, workspaceId, taskId, query);
      res.status(200).json({ data: result });
    } catch (err) {
      formatProblemDetails(err, res);
    }
  }

  async createTaskComment(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const input = CreateTaskCommentSchema.parse({
        ...req.body,
        workspaceId,
        taskId,
      });

      const comment = await taskDiscussionService.createTaskComment(req.user!.userId, workspaceId, taskId, input);
      res.status(201).json({ data: comment });
    } catch (err) {
      formatProblemDetails(err, res);
    }
  }

  async updateTaskComment(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const commentId = req.params.commentId;
      const input = UpdateTaskCommentSchema.parse(req.body);

      const comment = await taskDiscussionService.updateTaskComment(req.user!.userId, workspaceId, taskId, commentId, input);
      res.status(200).json({ data: comment });
    } catch (err) {
      formatProblemDetails(err, res);
    }
  }

  async deleteTaskComment(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
    try {
      const workspaceId = req.params.workspaceId;
      const taskId = req.params.taskId;
      const commentId = req.params.commentId;

      const comment = await taskDiscussionService.deleteTaskComment(req.user!.userId, workspaceId, taskId, commentId);
      res.status(200).json({ data: comment });
    } catch (err) {
      formatProblemDetails(err, res);
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
      formatProblemDetails(err, res);
    }
  }

  async createSubtask(req: AuthenticatedRequest, res: Response, _next: NextFunction): Promise<void> {
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
      formatProblemDetails(err, res);
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
      formatProblemDetails(err, res);
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
      formatProblemDetails(err, res);
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
      formatProblemDetails(err, res);
    }
  }
}

export const taskController = new TaskController();
