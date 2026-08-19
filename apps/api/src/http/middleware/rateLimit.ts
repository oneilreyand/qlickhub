import { rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';
import type { IncomingMessage } from 'node:http';

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
  keyGenerator: (req: IncomingMessage) => {
    // Use authenticated userId for per-user rate limiting; fallback to IP
    const user = (req as any).user;
    return user?.userId || (req as any).ip || 'unknown';
  },
  message: {
    code: 'RATE_LIMITED',
    message: 'Too many requests to this endpoint. Please wait before trying again.',
  },
}) as unknown as RequestHandler;

