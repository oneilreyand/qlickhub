# DEADLINE-REMINDER-CRON — Data, API, and Shared Contracts

**Status:** Disetujui

## Data and relations

- No migration. Reminders are rows in the existing `notifications` table (`type = 'deadline'`).
- `notifications.idempotency_key` (existing partial unique index `uq_notifications_idempotency_key`)
  holds `deadline:{taskId}:{userId}:{YYYY-MM-DD of the run, UTC}` for scheduled and manual runs.
- The scan reads `tasks` (`due_date`, `status`, `assignee_id`, `reporter_id`, `workspace_id`) and the
  archived flag of `workspaces`; it uses the existing `idx_notifications_task_id` and task indexes.

## API and executable contract

| Endpoint                                 | Caller                    | Auth                                                                    | Result                                                                                                                                      |
| ---------------------------------------- | ------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /v1/cron/deadline-reminders`       | Supabase Cron (`pg_net`)  | `Authorization: Bearer` + `CRON_SECRET` (`AUTH-012`)                    | `200 { data: { success, dispatchedCount, failedCount, checkedTasksCount, window: { today, from, to } } }`; `401`; `503 CRON_NOT_CONFIGURED` |
| `POST /v1/notifications/check-deadlines` | Owner/Admin (manual, API) | Session + global `admin`/`owner` + Workspace `owner`/`admin` membership | Same `data` body for one Workspace; `400` without `workspaceId`; `403` without membership                                                   |

- The request body is ignored; the scheduled run has no scope parameter.
- The manual run scans exactly the Workspace whose membership `requireWorkspaceMember` verified (`req.workspaceMembership`), even if the query and body carry different IDs.
- `failedCount` counts reminders that could not be stored (for example a Workspace deleted mid-run); the run continues and those pairs are retried by the next run.
- `window` is computed by `deadlineReminderWindow()` in
  `apps/api/src/modules/notifications/notificationService.ts`; `DEADLINE_REMINDER_OVERDUE_DAYS = 7`.
- No change to `@qlick/contracts`. The web client no longer exposes `checkApproachingDeadlines`.

## Boundary notes

- `/v1/cron/*` is mounted before `enforceTrustedOrigin` and outside the per-user API rate limiter;
  the bearer secret is its only access path (see [authorization.md](authorization.md)).
- Push (FCM) and the realtime event are sent only for newly created reminders, so a duplicate
  scheduler delivery creates no second push.
- Scheduler setup and secret rotation: [Deployment §4](../../DEPLOYMENT_AND_ENVIRONMENTS.md).
