import { createHmac } from 'node:crypto';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { RequestHandler } from 'express';
import { env } from '../../config/env.js';
import { DistributedRateLimiter, DistributedRateLimitStore } from './distributedRateLimitStore.js';

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
  environment?: 'development' | 'production' | 'test';
  store?: 'memory' | 'upstash';
  distributedLimiter?: DistributedRateLimiter;
  identifierSecret?: string;
  onStoreFailure?: () => void;
}

const UPSTASH_TIMEOUT_MS = 750;

function createUpstashLimiter(limit: number, windowMs: number): DistributedRateLimiter {
  const redis = new Redis({
    url: env.UPSTASH_REDIS_REST_URL!,
    token: env.UPSTASH_REDIS_REST_TOKEN!,
  });
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    analytics: false,
    ephemeralCache: false,
    prefix: 'qlickhub:link-preview',
    timeout: UPSTASH_TIMEOUT_MS,
  });
}

function opaqueRateLimitKey(rawIdentifier: string, secret: string): string {
  return createHmac('sha256', secret).update(rawIdentifier).digest('hex');
}

/**
 * Factory to create link preview rate limiter instances.
 * Enables behavioral testing without mutating production instances or global state.
 */
export function createLinkPreviewRateLimiter(
  options: LinkPreviewRateLimiterOptions = {},
): RequestHandler {
  const environment = options.environment ?? env.NODE_ENV;
  const windowMs = options.windowMs ?? DEFAULT_LINK_PREVIEW_WINDOW_MS;
  const limit =
    options.limit ?? (environment === 'production' ? DEFAULT_LINK_PREVIEW_RATE_LIMIT : 500);
  const storeType = options.store ?? env.LINK_PREVIEW_RATE_LIMIT_STORE;
  const identifierSecret = options.identifierSecret ?? env.RATE_LIMIT_KEY_SECRET;
  const distributedLimiter =
    storeType === 'upstash'
      ? (options.distributedLimiter ?? createUpstashLimiter(limit, windowMs))
      : undefined;

  if (storeType === 'upstash' && !identifierSecret) {
    throw new Error('RATE_LIMIT_KEY_SECRET is required for the Upstash rate limiter.');
  }

  return rateLimit({
    windowMs,
    limit,
    skip: options.skip ?? (() => environment === 'test'),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => {
      const user = (req as typeof req & { user?: { userId?: string } }).user;
      const rawIdentifier = user?.userId
        ? `user:${user.userId}`
        : `ip:${ipKeyGenerator(req.ip || 'unknown')}`;
      return storeType === 'upstash'
        ? opaqueRateLimitKey(rawIdentifier, identifierSecret!)
        : rawIdentifier;
    },
    ...(distributedLimiter
      ? {
          store: new DistributedRateLimitStore(distributedLimiter, {
            onProviderFailure:
              options.onStoreFailure ??
              (() => {
                console.warn(
                  '[RateLimit] Distributed link-preview store unavailable; using local fallback.',
                );
              }),
          }),
        }
      : {}),
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
