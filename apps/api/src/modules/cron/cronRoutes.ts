import { Router } from 'express';
import { notificationService } from '../notifications/notificationService.js';
import { requireCronSecret } from './cronAuth.js';
import { recordExpiredMemberships } from '../workspaces/internal/memberExpiry.js';

/**
 * Scheduled jobs (ADR-040). Mounted before the browser-origin check because the caller is the
 * Supabase Cron job (pg_net), not a browser; `requireCronSecret` is the only access path.
 */
export const cronRoutes = Router();

// POST /v1/cron/deadline-reminders — daily deadline reminders for every active Workspace.
cronRoutes.post('/cron/deadline-reminders', requireCronSecret, async (_req, res, next) => {
  try {
    const result = await notificationService.checkAndDispatchApproachingDeadlineNotifications();
    console.info(
      JSON.stringify({
        level: 'info',
        event: 'cron.deadline_reminders',
        checkedTasksCount: result.checkedTasksCount,
        dispatchedCount: result.dispatchedCount,
        failedCount: result.failedCount,
        window: result.window,
      }),
    );
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});

// POST /v1/cron/membership-expiry — MEMBER-ACCESS-HUB P5: record `membership_expired` for
// memberships whose end date passed. Access is already denied without this job (AUTH-001).
cronRoutes.post('/cron/membership-expiry', requireCronSecret, async (_req, res, next) => {
  try {
    const result = await recordExpiredMemberships();
    console.info(JSON.stringify({ level: 'info', event: 'cron.membership_expiry', ...result }));
    res.status(200).json({ data: result });
  } catch (err) {
    next(err);
  }
});
