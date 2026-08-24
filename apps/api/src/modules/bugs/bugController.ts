import type { Response } from 'express';
import { z, ZodError } from 'zod';
import {
  CreateBugEvidenceLinkSchema,
  CreateBugSchema,
  ListBugsQuerySchema,
  UpdateBugSchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { bugService } from './bugService.js';

function problem(res: Response, status: number, code: string, detail: string) {
  return res.status(status).json({
    type: `https://api.qa-hub.com/errors/${code.toLowerCase().replaceAll('_', '-')}`,
    title: code
      .split('_')
      .map((word) => word[0] + word.slice(1).toLowerCase())
      .join(' '),
    status,
    detail,
    code,
  });
}

function handleError(res: Response, error: unknown) {
  if (error instanceof ZodError) {
    return problem(res, 400, 'BAD_REQUEST', error.errors.map((issue) => issue.message).join('; '));
  }
  const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
  if (message.startsWith('NOT_FOUND:'))
    return problem(res, 404, 'NOT_FOUND', message.slice(10).trim());
  if (message.startsWith('FORBIDDEN:'))
    return problem(res, 403, 'FORBIDDEN', message.slice(10).trim());
  if (message.startsWith('BAD_REQUEST:'))
    return problem(res, 400, 'BAD_REQUEST', message.slice(12).trim());
  if (message.startsWith('CONFLICT:'))
    return problem(res, 409, 'CONFLICT', message.slice(9).trim());
  return problem(res, 500, 'INTERNAL_SERVER_ERROR', message);
}

export async function listBugs(req: AuthenticatedRequest, res: Response) {
  try {
    const query = ListBugsQuerySchema.parse(req.query);
    const bugs = await bugService.listBugs(req.params.workspaceId, req.user!.userId, query);
    return res.status(200).json({ bugs });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function getBug(req: AuthenticatedRequest, res: Response) {
  try {
    const bugId = z.string().uuid().parse(req.params.bugId);
    const bug = await bugService.getBug(req.params.workspaceId, bugId, req.user!.userId);
    return res.status(200).json({ bug });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function createBug(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateBugSchema.parse({ ...req.body, workspaceId: req.params.workspaceId });
    const bug = await bugService.createBug(req.user!.userId, input);
    return res.status(201).json({ bug });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function updateBug(req: AuthenticatedRequest, res: Response) {
  try {
    const input = UpdateBugSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      bugId: req.params.bugId,
    });
    const bug = await bugService.updateBug(req.user!.userId, input);
    return res.status(200).json({ bug });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function addBugEvidenceLink(req: AuthenticatedRequest, res: Response) {
  try {
    const input = CreateBugEvidenceLinkSchema.parse({
      ...req.body,
      workspaceId: req.params.workspaceId,
      bugId: req.params.bugId,
    });
    const kind = req.query.kind === 'resolution' ? 'resolution' : 'triage';
    const evidenceLink = await bugService.addBugEvidenceLink(
      req.user!.userId,
      req.params.workspaceId,
      req.params.bugId,
      input,
      kind,
    );
    return res.status(201).json({ evidenceLink });
  } catch (error) {
    return handleError(res, error);
  }
}

export async function listBugActivity(req: AuthenticatedRequest, res: Response) {
  try {
    const bugId = z.string().uuid().parse(req.params.bugId);
    const activity = await bugService.listBugActivity(
      req.params.workspaceId,
      bugId,
      req.user!.userId,
    );
    return res.status(200).json({ activity });
  } catch (error) {
    return handleError(res, error);
  }
}
