# DEADLINE-REMINDER-CRON — Developer Path

**Applicable Policy IDs:** AUTH-012, TEST-001, DOC-005

## Inputs and preconditions

- Approved breakdown P1 ([breakdown.md](../breakdown.md)); disposable PostgreSQL with canonical migrations for integration tests.

## Actions and implementation evidence

- Scheduled routes live in `apps/api/src/modules/cron/` and must stay idempotent and parameter-free; new jobs need their own decision.
- Reminder rule and idempotency key: `notificationService.checkAndDispatchApproachingDeadlineNotifications` and `deadlineReminderWindow`.
- Evidence: `apps/api/src/modules/cron/__tests__/cronDeadlineRemindersIntegration.test.ts`.

## Outputs and handoff

- Build log in [phases/PHASE-01.md](../phases/PHASE-01.md); evidence in [testing.md](../testing.md).
