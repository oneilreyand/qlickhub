import { timingSafeEqual } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';
import { env } from '../../config/env.js';

/**
 * ADR-040: machine authentication for scheduled jobs. The Supabase Cron job sends
 * `Authorization: Bearer <CRON_SECRET>`; no user session or browser origin is involved.
 * The secret is read per request so it can be configured without a restart in tests.
 */
export function requireCronSecret(req: Request, res: Response, next: NextFunction): void {
  const secret = env.CRON_SECRET;
  if (!secret) {
    res.status(503).json({
      error: { code: 'CRON_NOT_CONFIGURED', message: 'Scheduled jobs are not configured.' },
    });
    return;
  }

  const header = req.get('authorization') || '';
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'A valid scheduler credential is required.' },
    });
    return;
  }
  next();
}
