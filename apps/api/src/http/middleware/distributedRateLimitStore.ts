import { MemoryStore } from 'express-rate-limit';
import type { ClientRateLimitInfo, Options, Store } from 'express-rate-limit';

export interface DistributedRateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  reason?: string;
}

export interface DistributedRateLimiter {
  limit(identifier: string): Promise<DistributedRateLimitResult>;
  resetUsedTokens?(identifier: string): Promise<void>;
}

export interface DistributedRateLimitStoreOptions {
  onProviderFailure?: () => void;
  warningIntervalMs?: number;
  now?: () => number;
}

const DEFAULT_WARNING_INTERVAL_MS = 60_000;

/**
 * express-rate-limit store backed by an external aggregate limiter.
 * Provider failures degrade to a process-local MemoryStore without exposing
 * the provider error, identifier, or credentials in logs.
 */
export class DistributedRateLimitStore implements Store {
  readonly localKeys = false;
  readonly prefix = 'qlickhub:link-preview:';

  private readonly fallback = new MemoryStore();
  private readonly onProviderFailure: () => void;
  private readonly warningIntervalMs: number;
  private readonly now: () => number;
  private lastWarningAt: number | null = null;

  constructor(
    private readonly limiter: DistributedRateLimiter,
    options: DistributedRateLimitStoreOptions = {},
  ) {
    this.onProviderFailure = options.onProviderFailure ?? (() => undefined);
    this.warningIntervalMs = options.warningIntervalMs ?? DEFAULT_WARNING_INTERVAL_MS;
    this.now = options.now ?? Date.now;
  }

  init(options: Options): void {
    this.fallback.init(options);
  }

  async increment(key: string): Promise<ClientRateLimitInfo> {
    try {
      const result = await this.limiter.limit(key);
      if (result.reason === 'timeout') return this.incrementFallback(key);
      if (
        !Number.isSafeInteger(result.limit) ||
        result.limit < 1 ||
        !Number.isSafeInteger(result.remaining) ||
        result.remaining < 0 ||
        !Number.isFinite(result.reset)
      ) {
        return this.incrementFallback(key);
      }

      return {
        totalHits: result.success ? Math.max(1, result.limit - result.remaining) : result.limit + 1,
        resetTime: new Date(result.reset),
      };
    } catch {
      return this.incrementFallback(key);
    }
  }

  async decrement(key: string): Promise<void> {
    await this.fallback.decrement(key);
  }

  async resetKey(key: string): Promise<void> {
    await this.fallback.resetKey(key);
    if (!this.limiter.resetUsedTokens) return;

    try {
      await this.limiter.resetUsedTokens(key);
    } catch {
      this.warnProviderFailure();
    }
  }

  async shutdown(): Promise<void> {
    await this.fallback.shutdown();
  }

  private async incrementFallback(key: string): Promise<ClientRateLimitInfo> {
    this.warnProviderFailure();
    return this.fallback.increment(key);
  }

  private warnProviderFailure(): void {
    const now = this.now();
    if (this.lastWarningAt !== null && now - this.lastWarningAt < this.warningIntervalMs) return;

    this.lastWarningAt = now;
    this.onProviderFailure();
  }
}
