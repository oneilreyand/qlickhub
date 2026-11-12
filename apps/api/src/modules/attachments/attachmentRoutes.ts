import express, { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireTaskReadAccess } from '../../http/middleware/requireTaskReadAccess.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  listTaskAttachments,
  uploadAttachment,
  downloadAttachment,
  deleteAttachment,
} from './attachmentController.js';

export const attachmentRoutes = Router({ mergeParams: true });

attachmentRoutes.use(authenticate);
attachmentRoutes.use('/workspaces/:workspaceId', requireWorkspaceMember());

attachmentRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/attachments',
  requireTaskReadAccess(),
  listTaskAttachments,
);

attachmentRoutes.post(
  '/workspaces/:workspaceId/tasks/:taskId/attachments',
  express.raw({ limit: '15mb', type: '*/*' }),
  uploadAttachment,
);

attachmentRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId/download',
  requireTaskReadAccess(),
  downloadAttachment,
);

attachmentRoutes.delete(
  '/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId',
  deleteAttachment,
);
