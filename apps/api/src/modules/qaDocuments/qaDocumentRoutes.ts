import { Router } from 'express';
import { authenticate } from '../../http/middleware/authenticate.js';
import { requireWorkspaceMember } from '../../policies/workspacePolicy.js';
import {
  listWorkspaceDocuments,
  getDocumentDetails,
  createDocument,
  createDocumentVersion,
  getProductBrief,
  upsertProductBrief,
  listTaskDocuments,
  linkDocumentToTask,
  unlinkDocumentFromTask,
} from './qaDocumentController.js';

export const qaDocumentRoutes = Router({ mergeParams: true });

qaDocumentRoutes.use(authenticate);

// Workspace level QA document management
qaDocumentRoutes.get(
  '/workspaces/:workspaceId/documents',
  requireWorkspaceMember(),
  listWorkspaceDocuments
);

qaDocumentRoutes.get(
  '/workspaces/:workspaceId/documents/:documentId',
  requireWorkspaceMember(),
  getDocumentDetails
);

qaDocumentRoutes.post(
  '/workspaces/:workspaceId/documents',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  createDocument
);

qaDocumentRoutes.post(
  '/workspaces/:workspaceId/documents/:documentId/versions',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  createDocumentVersion
);

qaDocumentRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/product-brief',
  requireWorkspaceMember(),
  getProductBrief
);

qaDocumentRoutes.put(
  '/workspaces/:workspaceId/tasks/:taskId/product-brief',
  requireWorkspaceMember(['owner', 'admin', 'po']),
  upsertProductBrief
);

// Task QA document linking
qaDocumentRoutes.get(
  '/workspaces/:workspaceId/tasks/:taskId/documents',
  requireWorkspaceMember(),
  listTaskDocuments
);

qaDocumentRoutes.post(
  '/workspaces/:workspaceId/tasks/:taskId/documents',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  linkDocumentToTask
);

qaDocumentRoutes.delete(
  '/workspaces/:workspaceId/tasks/:taskId/documents/:documentId',
  requireWorkspaceMember(['owner', 'admin', 'qa']),
  unlinkDocumentFromTask
);
