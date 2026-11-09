import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { taskController } from './taskController.js';
import { taskLinkController } from './taskLinkController.js';

export const taskRoutes = Router({ mergeParams: true });

// All task operations require authentication. Reads are available to every
// workspace member; mutations are further constrained by role here and by
// task policy in TaskService.
taskRoutes.use(authenticate);

taskRoutes.get('/', requireWorkspaceMember(), (req, res, next) =>
  taskController.listTasks(req, res, next),
);
taskRoutes.post('/', requireWorkspaceMember(['owner', 'admin', 'po', 'qa']), (req, res, next) =>
  taskController.createTask(req, res, next),
);

taskRoutes.get(
  '/:taskId',
  requireWorkspaceMember(['owner', 'admin', 'po', 'dev', 'qa']),
  (req, res, next) => taskController.getTask(req, res, next),
);
taskRoutes.delete('/:taskId', requireWorkspaceMember(['owner', 'admin', 'po']), (req, res, next) =>
  taskController.deleteTask(req, res, next),
);

taskRoutes.get('/:taskId/subtasks', requireWorkspaceMember(), (req, res, next) =>
  taskController.listSubtasks(req, res, next),
);
taskRoutes.post(
  '/:taskId/subtasks',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res, next) => taskController.createSubtask(req, res, next),
);

taskRoutes.get('/:taskId/activity', requireWorkspaceMember(), (req, res, next) =>
  taskController.listTaskActivity(req, res, next),
);

taskRoutes.get('/:taskId/acceptance-checks', requireWorkspaceMember(), (req, res, next) =>
  taskController.listAcceptanceChecks(req, res, next),
);
taskRoutes.put(
  '/:taskId/acceptance-checks/:criterionId',
  requireWorkspaceMember(['owner', 'admin', 'dev']),
  (req, res, next) => taskController.setAcceptanceCheck(req, res, next),
);

taskRoutes.get('/:taskId/comments', requireWorkspaceMember(), (req, res, next) =>
  taskController.listTaskComments(req, res, next),
);
taskRoutes.post('/:taskId/comments', requireWorkspaceMember(), (req, res, next) =>
  taskController.createTaskComment(req, res, next),
);
taskRoutes.patch('/:taskId/comments/:commentId', requireWorkspaceMember(), (req, res, next) =>
  taskController.updateTaskComment(req, res, next),
);
taskRoutes.delete('/:taskId/comments/:commentId', requireWorkspaceMember(), (req, res, next) =>
  taskController.deleteTaskComment(req, res, next),
);

// Task Links (F2 - FEATURE-REFERENCES-MEDIA)
taskRoutes.get('/:taskId/links', requireWorkspaceMember(), (req, res, next) =>
  taskLinkController.listTaskLinks(req, res, next),
);
taskRoutes.post(
  '/:taskId/links',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res, next) => taskLinkController.createTaskLink(req, res, next),
);
taskRoutes.put(
  '/:taskId/links/reorder',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res, next) => taskLinkController.reorderTaskLinks(req, res, next),
);
taskRoutes.patch(
  '/:taskId/links/:linkId',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res, next) => taskLinkController.updateTaskLink(req, res, next),
);
taskRoutes.delete(
  '/:taskId/links/:linkId',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res, next) => taskLinkController.deleteTaskLink(req, res, next),
);

taskRoutes.patch(
  '/:taskId',
  requireWorkspaceMember(['owner', 'admin', 'po', 'dev', 'qa']),
  (req, res, next) => taskController.updateTask(req, res, next),
);
taskRoutes.patch(
  '/:taskId/status',
  requireWorkspaceMember(['owner', 'admin', 'po', 'dev', 'qa']),
  (req, res, next) => taskController.updateTaskStatus(req, res, next),
);
taskRoutes.put(
  '/:taskId/move',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res, next) => taskController.moveTask(req, res, next),
);
taskRoutes.post(
  '/:taskId/complete',
  requireWorkspaceMember(['owner', 'admin', 'po', 'dev', 'qa']),
  (req, res, next) => taskController.completeTask(req, res, next),
);
// E2E-SDLC-FLOW P7 (AC-15): QA approve + complete in one transaction; the service checks the
// assigned QA, the QA reviewer transition, and the QA completion gate.
taskRoutes.post('/:taskId/complete-qa-review', requireWorkspaceMember(['qa']), (req, res, next) =>
  taskController.completeQaReview(req, res, next),
);

// ADR-038 (P5g-2): claim is Developer/QA only; release and reassign are Planner only.
// The route guard narrows roles; taskAssignment enforces area, specialty, and state.
taskRoutes.post('/:taskId/claim', requireWorkspaceMember(['dev', 'qa']), (req, res, next) =>
  taskController.claimTask(req, res, next),
);
taskRoutes.post(
  '/:taskId/release',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res, next) => taskController.releaseTask(req, res, next),
);
taskRoutes.post(
  '/:taskId/reassign',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res, next) => taskController.reassignTask(req, res, next),
);
