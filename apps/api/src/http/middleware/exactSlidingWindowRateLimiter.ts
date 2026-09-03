import { randomUUID } from 'node:crypto';

import type {
  DistributedRateLimiter,
  DistributedRateLimitResult,
} from './distributedRateLimitStore.js';

export interface SlidingWindowRedis {
  eval<TResult = unknown>(
    script: string,
    keys: string[],
    args: Array<string | number>,
  ): Promise<TResult>;
  del(...keys: string[]): Promise<number>;
}

export interface ExactSlidingWindowRateLimiterOptions {
  limit: number;
  windowMs: number;
  timeoutMs: number;
  now?: () => number;
  createMember?: () => string;
  prefix?: string;
}

const EXACT_SLIDING_WINDOW_SCRIPT = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local member = ARGV[4]

redis.call('ZREMRANGEBYSCORE', key, '-inf', now - window)
local count = redis.call('ZCARD', key)
local allowed = 0

if count < limit then
  redis.call('ZADD', key, now, member)
  count = count + 1
  allowed = 1
end

redis.call('PEXPIRE', key, window)
local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
local reset = now + window
if oldest[2] then
  reset = math.floor(tonumber(oldest[2]) + window)
end

return {allowed, math.max(0, limit - count), reset}
`;

/**
 * Atomic, exact rolling-window limiter backed by an Upstash-compatible Redis script.
 * Each opaque identifier keeps at most `limit` short-lived request markers.
 */
export class ExactSlidingWindowRateLimiter implements DistributedRateLimiter {
  private readonly now: () => number;
  private readonly createMember: () => string;
  private readonly prefix: string;

  constructor(
    private readonly redis: SlidingWindowRedis,
    private readonly options: ExactSlidingWindowRateLimiterOptions,
  ) {
    this.now = options.now ?? Date.now;
    this.createMember = options.createMember ?? randomUUID;
    this.prefix = options.prefix ?? 'qlickhub:link-preview';
  }

  async limit(identifier: string): Promise<DistributedRateLimitResult> {
    const providerRequest = this.executeLimit(identifier);
    if (this.options.timeoutMs <= 0) return providerRequest;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutResult = new Promise<DistributedRateLimitResult>((resolve) => {
      timeout = setTimeout(() => {
        resolve({
          success: true,
          limit: this.options.limit,
          remaining: this.options.limit,
          reset: this.now() + this.options.windowMs,
          reason: 'timeout',
        });
      }, this.options.timeoutMs);
    });

    try {
      return await Promise.race([providerRequest, timeoutResult]);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }

  async resetUsedTokens(identifier: string): Promise<void> {
    await this.redis.del(this.redisKey(identifier));
  }

  private async executeLimit(identifier: string): Promise<DistributedRateLimitResult> {
    const now = this.now();
    const result = await this.redis.eval<unknown>(
      EXACT_SLIDING_WINDOW_SCRIPT,
      [this.redisKey(identifier)],
      [now, this.options.windowMs, this.options.limit, this.createMember()],
    );

    if (
      !Array.isArray(result) ||
      result.length !== 3 ||
      (result[0] !== 0 && result[0] !== 1) ||
      !Number.isSafeInteger(result[1]) ||
      (result[1] as number) < 0 ||
      !Number.isFinite(result[2])
    ) {
      throw new Error('Invalid distributed rate-limit response');
    }

    return {
      success: result[0] === 1,
      limit: this.options.limit,
      remaining: result[1] as number,
      reset: result[2] as number,
    };
  }

  private redisKey(identifier: string): string {
    return `${this.prefix}:${identifier}`;
  }
}
