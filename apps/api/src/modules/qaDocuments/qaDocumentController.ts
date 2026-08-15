import { Response } from 'express';
import { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { qaDocumentService } from './qaDocumentService.js';
import {
  CreateQaDocumentSchema,
  CreateQaDocumentVersionSchema,
  LinkDocumentSchema,
  UpsertProductBriefSchema,
} from '@qa/contracts';
import { ZodError } from 'zod';

function handleError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return res.status(400).json({
      type: 'https://api.qa-hub.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: error.issues.map((issue) => issue.message).join('; '),
      code: 'BAD_REQUEST',
    });
  }
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  if (message.startsWith('NOT_FOUND:')) {
    return res.status(404).json({
      type: 'https://api.qa-hub.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: message.replace('NOT_FOUND:', '').trim(),
      code: 'NOT_FOUND',
    });
  }
  if (message.startsWith('FORBIDDEN:')) {
    return res.status(403).json({
      type: 'https://api.qa-hub.com/errors/forbidden',
      title: 'Forbidden',
      status: 403,
      detail: message.replace('FORBIDDEN:', '').trim(),
      code: 'FORBIDDEN',
    });
  }
  if (message.startsWith('BAD_REQUEST:')) {
    return res.status(400).json({
      type: 'https://api.qa-hub.com/errors/bad-request',
      title: 'Bad Request',
      status: 400,
      detail: message.replace('BAD_REQUEST:', '').trim(),
      code: 'BAD_REQUEST',
    });
  }
  return res.status(500).json({
    type: 'https://api.qa-hub.com/errors/internal-error',
    title: 'Internal Server Error',
    status: 500,
    detail: message,
    code: 'INTERNAL_SERVER_ERROR',
  });
}

export const listWorkspaceDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const { folderId } = req.query;
    const actorId = req.user!.userId;
    const documents = await qaDocumentService.listWorkspaceDocuments(
      workspaceId,
      typeof folderId === 'string' ? folderId : undefined,
      actorId
    );
    return res.status(200).json({ documents });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getDocumentDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, documentId } = req.params;
    const actorId = req.user!.userId;
    const data = await qaDocumentService.getDocumentWithVersions(workspaceId, documentId, actorId);
    return res.status(200).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

export const createDocument = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId } = req.params;
    const actorId = req.user!.userId;

    const parsed = CreateQaDocumentSchema.parse({
      ...req.body,
      workspaceId,
    });

    const data = await qaDocumentService.createDocument(workspaceId, actorId, parsed);
    return res.status(201).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

export const createDocumentVersion = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, documentId } = req.params;
    const actorId = req.user!.userId;

    const parsed = CreateQaDocumentVersionSchema.parse({
      ...req.body,
      workspaceId,
      documentId,
    });

    const data = await qaDocumentService.createDocumentVersion(
      workspaceId,
      documentId,
      actorId,
      parsed
    );
    return res.status(201).json(data);
  } catch (error) {
    return handleError(res, error);
  }
};

export const getProductBrief = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;
    const brief = await qaDocumentService.getProductBrief(workspaceId, taskId, actorId);
    return res.status(200).json({ brief });
  } catch (error) {
    return handleError(res, error);
  }
};

export const upsertProductBrief = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;
    const parsed = UpsertProductBriefSchema.parse({
      ...req.body,
      workspaceId,
      taskId,
    });
    const brief = await qaDocumentService.upsertProductBrief(workspaceId, taskId, actorId, parsed);
    return res.status(200).json({ brief });
  } catch (error) {
    return handleError(res, error);
  }
};

export const listTaskDocuments = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;
    const links = await qaDocumentService.listTaskDocumentLinks(workspaceId, taskId, actorId);
    return res.status(200).json({ links });
  } catch (error) {
    return handleError(res, error);
  }
};

export const linkDocumentToTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId } = req.params;
    const actorId = req.user!.userId;

    const parsed = LinkDocumentSchema.parse({
      ...req.body,
      workspaceId,
    });

    const link = await qaDocumentService.linkDocumentToTask(
      workspaceId,
      taskId,
      actorId,
      parsed.documentId
    );
    return res.status(201).json({ link });
  } catch (error) {
    return handleError(res, error);
  }
};

export const unlinkDocumentFromTask = async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { workspaceId, taskId, documentId } = req.params;
    const actorId = req.user!.userId;

    await qaDocumentService.unlinkDocumentFromTask(
      workspaceId,
      taskId,
      actorId,
      documentId
    );
    return res.status(200).json({ success: true });
  } catch (error) {
    return handleError(res, error);
  }
};
