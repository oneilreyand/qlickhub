import { Router } from 'express';
import { notificationService } from '../notifications/notificationService.js';
import { requireCronSecret } from './cronAuth.js';

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
