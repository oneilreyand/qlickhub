# ADR-040 — Scheduled jobs via Supabase Cron with a backend-only bearer secret

- **Status:** Accepted
- **Date:** 2026-11-04
- **Decision owner:** Owner, chat 2026-11-04: deadline reminders run on a schedule instead of from
  the browser; "buat plan yang tidak menggunakan vercel" (no Vercel Cron); chose option A, Supabase
  Cron + pg_net, over GitHub Actions `schedule` and a request-driven lease without a scheduler.
- **Refines:** Audit F3 (Owner decision 2026-10-16, "Production has no scheduler") for deadline
  reminders only; the notification outbox keeps its opportunistic dispatch.
- **Feature:** [DEADLINE-REMINDER-CRON](../features/DEADLINE-REMINDER-CRON/README.md)

## Context

Deadline reminders were created by `POST /v1/notifications/check-deadlines`, which every Admin/Owner
browser tab called about once a minute, sometimes without a Workspace (scan of all Workspaces). It
scanned every open task with `dueDate <= tomorrow`, including tasks overdue for months
([PROD-LATENCY](../plans/quick/PROD-LATENCY.md)). Reminders therefore depended on someone keeping the
app open, and the load grew with the number of open tabs. Qlick Hub had no scheduler in Production.

## Decision

1. **Scheduler:** a Supabase Cron (`pg_cron`) job in the Production database calls
   `POST /v1/cron/deadline-reminders` through `pg_net` once a day (default 08:05 WIB, `5 1 * * *`
   UTC). Setup is a one-time Owner action in Supabase, documented in
   [Deployment §4](../DEPLOYMENT_AND_ENVIRONMENTS.md); it is not a canonical migration because local
   and test PostgreSQL do not have `pg_cron`/`pg_net`.
2. **Machine authentication (`AUTH-012`):** routes under `/v1/cron/*` accept only
   `Authorization: Bearer <CRON_SECRET>` (constant-time comparison). `CRON_SECRET` is backend-only,
   at least 32 characters, stored in the Vercel runtime and in Supabase Vault — never in Git, a
   `VITE_*` variable, the browser, or logs. When it is unset the route returns `503` and does nothing.
   The routes are mounted before the browser-origin check because the caller has no browser origin;
   every other state-changing route keeps that check. They carry no user identity and only run the
   fixed job.
3. **Reminder rule:** open tasks (not `done` or `canceled`) in non-archived Workspaces with
   `dueDate` from 7 days ago through tomorrow (UTC date of the run). Assignee and reporter each get
   at most one reminder per task per day (`notifications.idempotency_key =
deadline:<task>:<user>:<date>`, unique) and never two within 20 hours. Duplicate or concurrent
   scheduler deliveries are therefore harmless; a missed run is caught up by the next day's run.
4. **Browser:** the web app no longer triggers the scan. The manual endpoint stays for one
   Workspace and now requires `workspaceId` and Workspace `owner`/`admin` membership in addition to
   the global `admin`/`owner` role.

## Alternatives

- **Vercel Cron:** native, but the Owner chose not to depend on Vercel for scheduling (Hobby plan
  limits cron to once a day with ±59 min precision). Rejected by the Owner.
- **GitHub Actions `schedule`:** visible in the repository, but runs at most every 5 minutes, can be
  delayed or dropped at busy times, and is disabled after 60 days without activity in a public
  repository. Rejected.
- **Request-driven lease (no scheduler):** no external setup, but needs a migration and sends no
  reminders while nobody uses the app. Kept as the fallback if Supabase Cron is unavailable.
- **SQL-only job in `pg_cron`:** would move business rules into SQL and skip push delivery. Rejected.

## Consequences

Reminders no longer depend on open browser tabs, and reminder load is one scan per day. Production
gains an operational dependency on Supabase Cron/pg_net and a second secret to rotate (update Vercel
and Vault together). `pg_net` does not retry and keeps responses for about 6 hours, so failures are
visible in `net._http_response` and in the API log event `cron.deadline_reminders`; any database role
that can log in can read the decrypted secret while a request is queued. Overdue tasks older than 7
days no longer receive automatic reminders.
