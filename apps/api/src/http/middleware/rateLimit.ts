import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';

const rateLimitMessage = {
  code: 'RATE_LIMITED',
  message: 'Too many requests. Please try again later.',
};

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 300 : 10000,
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: rateLimitMessage,
}) as unknown as RequestHandler;

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'production' ? 10 : 1000,
  skip: () => env.NODE_ENV !== 'production',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: rateLimitMessage,
}) as unknown as RequestHandler;

/**
 * Strict rate limiter for notification utility endpoints (/test, /check-deadlines).
 * Identifies user via `req.user.userId` (populated by `authenticate` middleware)
 * so the limit is per-user, not per-IP. Allows 5 requests per minute.
 */
export const notificationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 5,
  skip: () => env.NODE_ENV === 'test',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Use authenticated userId for per-user rate limiting; fallback to IP
    const user = (req as typeof req & { user?: { userId?: string } }).user;
    return user?.userId || ipKeyGenerator(req.ip || 'unknown');
  },
  message: {
    code: 'RATE_LIMITED',
    message: 'Too many requests to this endpoint. Please wait before trying again.',
  },
}) as unknown as RequestHandler;

export const DEFAULT_LINK_PREVIEW_RATE_LIMIT = 30;
export const DEFAULT_LINK_PREVIEW_WINDOW_MS = 60 * 1000;

export interface LinkPreviewRateLimiterOptions {
  windowMs?: number;
  limit?: number;
  skip?: (req: any, res: any) => boolean;
}

/**
 * Factory to create link preview rate limiter instances.
 * Enables behavioral testing without mutating production instances or global state.
 */
export function createLinkPreviewRateLimiter(
  options: LinkPreviewRateLimiterOptions = {},
): RequestHandler {
  return rateLimit({
    windowMs: options.windowMs ?? DEFAULT_LINK_PREVIEW_WINDOW_MS,
    limit: options.limit ?? (env.NODE_ENV === 'production' ? DEFAULT_LINK_PREVIEW_RATE_LIMIT : 500),
    skip: options.skip ?? (() => env.NODE_ENV === 'test'),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const user = (req as typeof req & { user?: { userId?: string } }).user;
      return user?.userId || ipKeyGenerator(req.ip || 'unknown');
    },
    message: {
      code: 'RATE_LIMITED',
      message: 'Too many link preview requests. Please wait before trying again.',
    },
  }) as unknown as RequestHandler;
}

/**
 * Production rate limiter for link preview and URL metadata resolution endpoint (/v1/meta/link-preview).
 * Allows 30 requests per minute per authenticated user (or IP fallback).
 */
export const linkPreviewRateLimiter = createLinkPreviewRateLimiter();
