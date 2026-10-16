import type { NextFunction, Request, Response } from 'express';
import { reliableNotificationOutboxService } from './reliableNotificationOutboxService.js';

// Audit F3 (Owner decision 2026-10-16): Production has no scheduler, so due and failed outbox rows are
// retried when users are active. At most one bounded batch per interval per server instance; the
// request waits at most `waitBudgetMs` and never fails because of dispatch.

export interface OpportunisticDispatchOptions {
  intervalMs?: number;
  batchSize?: number;
  waitBudgetMs?: number;
  enabled?: boolean;
  dispatchDue?: (limit: number) => Promise<void>;
  now?: () => number;
  onError?: (error: unknown) => void;
}

export function createOpportunisticOutboxDispatch(options: OpportunisticDispatchOptions = {}) {
  const intervalMs = options.intervalMs ?? 60_000;
  const batchSize = options.batchSize ?? 50;
  const waitBudgetMs = options.waitBudgetMs ?? 1_500;
  const enabled = options.enabled ?? process.env.NODE_ENV !== 'test';
  const dispatchDue =
    options.dispatchDue ??
    ((limit: number) => reliableNotificationOutboxService.dispatchDue(limit));
  const now = options.now ?? Date.now;
  const onError =
    options.onError ??
    ((error: unknown) =>
      console.warn(
        JSON.stringify({
          level: 'warn',
          event: 'outbox.opportunistic_dispatch_failed',
          message: error instanceof Error ? error.message.slice(0, 300) : String(error),
        }),
      ));
  let lastRunAt = Number.NEGATIVE_INFINITY;
  let running: Promise<void> | null = null;

  /** Starts one batch when the interval has elapsed; returns the in-flight run (or null if skipped). */
  function trigger(): Promise<void> | null {
    if (!enabled || running || now() - lastRunAt < intervalMs) return null;
    lastRunAt = now();
    running = dispatchDue(batchSize)
      .catch(onError)
      .finally(() => {
        running = null;
      });
    return running;
  }

  async function middleware(_req: Request, _res: Response, next: NextFunction): Promise<void> {
    const run = trigger();
    if (run) {
      await Promise.race([run, new Promise<void>((resolve) => setTimeout(resolve, waitBudgetMs))]);
    }
    next();
  }

  return { trigger, middleware };
}

export const opportunisticOutboxDispatch = createOpportunisticOutboxDispatch();
