import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireTaskReadAccess } from '../../http/middleware/requireTaskReadAccess.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import { taskController } from './taskController.js';
import { taskLinkController } from './taskLinkController.js';
import { taskBlockerController } from './taskBlockerController.js';
import { taskRelationController } from './taskRelationController.js';

export const taskRoutes = Router({ mergeParams: true });

// All task operations require authentication. Task-scoped reads follow task-level access
// (AUTH-013): planners read every task, Developer/QA only tasks of Features they work on.
// Mutations are further constrained by role here and by task policy in TaskService.
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

taskRoutes.get(
  '/:taskId/activity',
  requireWorkspaceMember(),
  requireTaskReadAccess(),
  (req, res, next) => taskController.listTaskActivity(req, res, next),
);

// Blockers (WORK-FOUNDATION P5, ADR-045): readable and openable by anyone who may read the task.
taskRoutes.get('/:taskId/blockers', requireWorkspaceMember(), requireTaskReadAccess(), (req, res) =>
  taskBlockerController.list(req, res),
);
taskRoutes.post(
  '/:taskId/blockers',
  requireWorkspaceMember(),
  requireTaskReadAccess(),
  (req, res) => taskBlockerController.open(req, res),
);
taskRoutes.post(
  '/:taskId/blockers/:blockerId/resolve',
  requireWorkspaceMember(),
  requireTaskReadAccess(),
  (req, res) => taskBlockerController.resolve(req, res),
);
// Ping PIC (LEADER-PIPELINE-HUB P4): leaders only, at most once an hour per blocker.
taskRoutes.post(
  '/:taskId/blockers/:blockerId/ping',
  requireWorkspaceMember(['owner', 'admin']),
  (req, res) => taskBlockerController.ping(req, res),
);

// Relations between tasks (MY-WORK-REPORT P4, ADR-047, AUTH-016): read with the task; create and
// delete by Planners of this (source) Workspace, who must also be members of the target Workspace.
taskRoutes.get(
  '/:taskId/relations',
  requireWorkspaceMember(),
  requireTaskReadAccess(),
  (req, res) => taskRelationController.list(req, res),
);
taskRoutes.post(
  '/:taskId/relations',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res) => taskRelationController.create(req, res),
);
taskRoutes.delete(
  '/:taskId/relations/:relationId',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  (req, res) => taskRelationController.remove(req, res),
);

taskRoutes.get(
  '/:taskId/acceptance-checks',
  requireWorkspaceMember(),
  requireTaskReadAccess(),
  (req, res, next) => taskController.listAcceptanceChecks(req, res, next),
);
taskRoutes.put(
  '/:taskId/acceptance-checks/:criterionId',
  requireWorkspaceMember(['owner', 'admin', 'dev']),
  (req, res, next) => taskController.setAcceptanceCheck(req, res, next),
);

// Discussion stays readable by every Workspace member: any member can be mentioned and must be
// able to read the thread to reply (ADR-043 §Pengecualian).
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
taskRoutes.get(
  '/:taskId/links',
  requireWorkspaceMember(),
  requireTaskReadAccess(),
  (req, res, next) => taskLinkController.listTaskLinks(req, res, next),
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
