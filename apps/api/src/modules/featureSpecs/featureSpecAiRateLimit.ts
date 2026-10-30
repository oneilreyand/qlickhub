import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { Request, RequestHandler } from 'express';
import { env } from '../../config/env.js';

/**
 * P5b (Owner decision 2026-10-30): AI endpoints are protected by a rate limit only, no daily quota.
 * One limiter per user and one per workspace, both per minute; skipped in tests so suites stay
 * deterministic (the limiter factory is exported so a test can still exercise it).
 */
export const FEATURE_SPEC_AI_WINDOW_MS = 60 * 1000;
export const FEATURE_SPEC_AI_USER_LIMIT = 10;
export const FEATURE_SPEC_AI_WORKSPACE_LIMIT = 30;

const message = {
  code: 'RATE_LIMITED',
  message: 'Too many AI requests. Please wait a moment before trying again.',
};

export function createFeatureSpecAiRateLimiter(options: {
  identifier: string;
  limit: number;
  key: (req: Request) => string;
  enforce?: boolean;
}): RequestHandler {
  return rateLimit({
    windowMs: FEATURE_SPEC_AI_WINDOW_MS,
    limit: options.limit,
    skip: () => !(options.enforce ?? env.NODE_ENV !== 'test'),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    identifier: options.identifier,
    keyGenerator: (req) => options.key(req as unknown as Request),
    message,
  }) as unknown as RequestHandler;
}

export const featureSpecAiUserRateLimiter = createFeatureSpecAiRateLimiter({
  identifier: 'feature-spec-ai-user',
  limit: env.NODE_ENV === 'production' ? FEATURE_SPEC_AI_USER_LIMIT : 1000,
  key: (req) => {
    const user = (req as Request & { user?: { userId?: string } }).user;
    return user?.userId ? `user:${user.userId}` : ipKeyGenerator(req.ip || 'unknown');
  },
});

export const featureSpecAiWorkspaceRateLimiter = createFeatureSpecAiRateLimiter({
  identifier: 'feature-spec-ai-workspace',
  limit: env.NODE_ENV === 'production' ? FEATURE_SPEC_AI_WORKSPACE_LIMIT : 1000,
  key: (req) => `workspace:${req.params.workspaceId ?? ipKeyGenerator(req.ip || 'unknown')}`,
});
