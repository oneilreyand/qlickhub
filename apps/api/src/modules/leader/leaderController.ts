import type { Response } from 'express';
import {
  LeaderTimelineQuerySchema,
  LeaderQualityQuerySchema,
  LeaderReportDigestQuerySchema,
} from '@qlick/contracts';
import type { AuthenticatedRequest } from '../../http/middleware/authenticate.js';
import { leaderService } from './leaderService.js';
import { sendProblemDetails } from '../../http/problemDetails.js';

export async function getLeaderWorkspaces(req: AuthenticatedRequest, res: Response) {
  try {
    const actorId = req.user!.userId;
    const result = await leaderService.getLeaderWorkspaces(actorId);
    return res.status(200).json(result);
  } catch (error) {
    return sendProblemDetails(res, error);
  }
}

export async function getLeaderTimeline(req: AuthenticatedRequest, res: Response) {
  try {
    const actorId = req.user!.userId;
    const query = LeaderTimelineQuerySchema.parse(req.query);
    const result = await leaderService.getLeaderTimeline(actorId, query);
    return res.status(200).json(result);
  } catch (error) {
    return sendProblemDetails(res, error);
  }
}

export async function getLeaderQuality(req: AuthenticatedRequest, res: Response) {
  try {
    const actorId = req.user!.userId;
    const query = LeaderQualityQuerySchema.parse(req.query);
    const result = await leaderService.getLeaderQualityMetrics(actorId, query);
    return res.status(200).json(result);
  } catch (error) {
    return sendProblemDetails(res, error);
  }
}

export async function getLeaderDigest(req: AuthenticatedRequest, res: Response) {
  try {
    const actorId = req.user!.userId;
    const query = LeaderReportDigestQuerySchema.parse(req.query);
    const result = await leaderService.getLeaderReportDigest(actorId, query);
    return res.status(200).json(result);
  } catch (error) {
    return sendProblemDetails(res, error);
  }
}
