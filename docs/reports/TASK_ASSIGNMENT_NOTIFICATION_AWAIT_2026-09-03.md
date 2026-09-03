## Task

TASK-ASSIGNMENT-NOTIFICATION-AWAIT: prevent persisted assignment notifications from racing Task fixture cleanup after a successful create or reassignment response.

## Outcome

Task creation and reassignment now await the internal assignment-notification workflow after the Task transaction commits. The notification row is therefore observable when the successful mutation response completes. External FCM dispatch remains best-effort and no longer delays that response.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` and `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DATA-001`, `TEST-001`.
- **Data/interface impact:** No contract or schema change. The existing persisted assignment-notification row is now completed deterministically before returning a successful Task mutation response.
- **Authorization impact:** None; Task and notification recipient authorization is unchanged.
- **Migration risk:** None; no model, schema, data migration, or canonical migration changed.

## Changed files

- `apps/api/src/modules/tasks/internal/taskLifecycle.ts` — awaits a shared best-effort assignment-notification helper for Task creation and reassignment.
- `apps/api/src/services/fcmService.ts` — completes the internal notification write before returning while dispatching external FCM without blocking the Task response.
- `apps/api/src/modules/workspaces/__tests__/workspaceDeveloperSpecialtyApiIntegration.test.ts` — asserts through PostgreSQL that the assignment notification exists when the HTTP `201` response completes.
- `TODO.md` — records task status and evidence.
- `docs/reports/TASK_ASSIGNMENT_NOTIFICATION_AWAIT_2026-09-03.md` — records diagnosis and validation evidence.

## Validation

- Original full `npm --prefix apps/api run test` — build passed and 342/342 assertions passed, but emitted a `notifications_task_id_fkey` warning because an assignment-notification insert ran after its Task fixture was deleted.
- Three-run isolated reproduction before the fix — 2 runs completed without the warning and 1 run reproduced the foreign-key warning, confirming a timing race.
- Regression assertion before the fix: `NODE_ENV=test npx tsx --test apps/api/src/modules/workspaces/__tests__/workspaceDeveloperSpecialtyApiIntegration.test.ts` — **1 passed, 1 failed, 0 skipped** because the notification row was absent immediately after HTTP `201`.
- Regression assertion after the fix, repeated three times — **6 passed, 0 failed, 0 skipped** in total; no assignment-notification foreign-key warning.
- Focused notification and Developer-specialty integration run — **18 passed, 0 failed, 0 skipped** across 8 suites; PostgreSQL test environment.
- `npm --prefix apps/api run typecheck` — passed, exit code 0.
- Targeted ESLint and Prettier — passed with no error or warning.
- Final `npm --prefix apps/api run test` — TypeScript build passed; **353 passed, 0 failed, 0 skipped** across 88 suites, PostgreSQL test environment; the original assignment-notification foreign-key warning did not recur.
- Tagged-debug cleanup search — no diagnostic instrumentation was introduced or left behind.

## Risks or follow-up

- Internal notification persistence remains best-effort: an unexpected notification failure is logged but does not retroactively fail a Task mutation whose database transaction already committed.
- External FCM delivery remains asynchronous by design and is not claimed as delivered merely because the in-app notification was persisted.

## TODO update

- `TASK-ASSIGNMENT-NOTIFICATION-AWAIT` → `Done`.
