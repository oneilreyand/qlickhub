## Task

DB-8.5 — Reconcile Workspace membership soft-delete schema.

## Outcome

Applied migrations 55–57 to the local `qa_management_dev` PostgreSQL database. `workspace_members.deleted_at` now exists, the membership history and specialty tables exist, and the active-assignee guard is installed. The Workspace membership policy can again execute its default Sequelize soft-delete filter.

The Test Management failure-notification lookup was also corrected: a Test Run does not own a `taskId`, so affected Tasks are now resolved through the persisted Test Case → Requirement → Task relationships. Duplicate Task notifications are removed before dispatch. An unused Workspace activity parameter was renamed to preserve the existing interface while satisfying TypeScript's unused-parameter check.

## Changed files

- `TODO.md` — claimed and completed DB-8.5.
- `apps/api/src/modules/testManagement/testManagementService.ts` — resolves failure-notification recipients through persisted traceability links.
- `apps/api/src/modules/workspaces/workspaceService.ts` — marks an intentionally unused interface parameter.
- `docs/reports/DB_8_5_WORKSPACE_MEMBER_SOFT_DELETE_SCHEMA_2026-08-24.md` — records schema and verification evidence.

## Validation

- `npm run db:migrate` — passed; applied migrations `20260824000055`, `20260824000056`, and `20260824000057` to `qa_management_dev`.
- PostgreSQL schema query — passed; confirmed `deleted_at`, migration records 55–57, `workspace_membership_activity`, `workspace_member_specialties`, and `trg_tasks_active_workspace_assignee`.
- `npx sequelize-cli db:migrate:status --env development` — passed; every migration is `up`.
- `npm run typecheck:api` — passed after correcting two TypeScript errors.
- `npm run db:verify:clean-migrations` — passed on disposable PostgreSQL database `qa_management_phase0_verify_69436`.
- `npm run db:verify:workspace-member-offboarding` — passed: 7 tests, 0 failures, 0 skipped, on disposable PostgreSQL database `qa_management_member_offboarding_69554`.
- `NODE_ENV=test node --test dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js` — passed: 7 tests, 0 failures, 0 skipped, against `qa_management_test`.
- Read-only Sequelize Workspace membership lookup — passed; executed the `deleted_at IS NULL` query pattern successfully.
- `npm run build` — passed for contracts, API, and web. Vite retained its existing non-blocking advisory for a JavaScript chunk greater than 500 kB after minification.

## Risks or follow-up

- The migrations 55–57 remain untracked files in the current shared worktree; include them in the intended commit/deployment so other environments receive the schema update.
- The repository root `.env` contains an HTTPS Supabase project URL under `DATABASE_URL`; it is not a PostgreSQL connection string. The API migration command currently uses the `apps/api` configuration and local PostgreSQL fallback. Before any remote deployment, provide a valid PostgreSQL `DATABASE_URL` through deployment environment configuration and run the canonical migrations there.

## TODO update

- DB-8.5 — Reconcile Workspace membership soft-delete schema → Done
