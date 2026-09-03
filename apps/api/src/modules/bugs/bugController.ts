import type { Response } from 'express';
import { z } from 'zod';
import {
  CreateBugEvidenceLinkSchema,
  CreateBugSchema,
  ListBugsQuerySchema,
  UpdateBugSchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { bugService } from './bugService.js';
import { handleError } from '../../http/errors/handleError.js';

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
