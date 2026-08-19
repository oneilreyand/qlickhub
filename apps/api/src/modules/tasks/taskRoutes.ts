import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { taskController } from './taskController.js';

export const taskRoutes = Router({ mergeParams: true });

// All task operations require authentication. Reads are available to every
// workspace member; mutations are further constrained by role here and by
// task policy in TaskService.
taskRoutes.use(authenticate);

taskRoutes.get('/', requireWorkspaceMember(), (req, res, next) => taskController.listTasks(req, res, next));
taskRoutes.post('/', requireWorkspaceMember(['owner', 'admin', 'po', 'qa']), (req, res, next) => taskController.createTask(req, res, next));

taskRoutes.get('/:taskId', requireWorkspaceMember(['owner', 'admin', 'po', 'dev', 'qa']), (req, res, next) => taskController.getTask(req, res, next));
taskRoutes.delete('/:taskId', requireWorkspaceMember(['owner', 'admin', 'po']), (req, res, next) => taskController.deleteTask(req, res, next));

taskRoutes.get('/:taskId/subtasks', requireWorkspaceMember(), (req, res, next) => taskController.listSubtasks(req, res, next));
taskRoutes.post('/:taskId/subtasks', requireWorkspaceMember(['owner', 'admin', 'po']), (req, res, next) => taskController.createSubtask(req, res, next));

taskRoutes.get('/:taskId/activity', requireWorkspaceMember(), (req, res, next) => taskController.listTaskActivity(req, res, next));

taskRoutes.get('/:taskId/comments', requireWorkspaceMember(), (req, res, next) => taskController.listTaskComments(req, res, next));
taskRoutes.post('/:taskId/comments', requireWorkspaceMember(), (req, res, next) => taskController.createTaskComment(req, res, next));
taskRoutes.patch('/:taskId/comments/:commentId', requireWorkspaceMember(), (req, res, next) => taskController.updateTaskComment(req, res, next));
taskRoutes.delete('/:taskId/comments/:commentId', requireWorkspaceMember(), (req, res, next) => taskController.deleteTaskComment(req, res, next));

taskRoutes.patch('/:taskId', requireWorkspaceMember(['owner', 'admin', 'po', 'dev', 'qa']), (req, res, next) => taskController.updateTask(req, res, next));
taskRoutes.patch('/:taskId/status', requireWorkspaceMember(['owner', 'admin', 'po', 'dev', 'qa']), (req, res, next) => taskController.updateTaskStatus(req, res, next));
taskRoutes.put('/:taskId/move', requireWorkspaceMember(['owner', 'admin', 'po']), (req, res, next) => taskController.moveTask(req, res, next));
taskRoutes.post('/:taskId/complete', requireWorkspaceMember(['owner', 'admin', 'po', 'dev', 'qa']), (req, res, next) => taskController.completeTask(req, res, next));
