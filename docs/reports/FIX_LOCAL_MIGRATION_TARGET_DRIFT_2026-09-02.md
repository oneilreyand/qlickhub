## Task

FIX-LOCAL-MIGRATION-TARGET-DRIFT: make development Sequelize migrations use the same local
PostgreSQL target as the development API and restore Workspace archive activity compatibility.

## Outcome

Development migration commands now select `LOCAL_DATABASE_URL`, then `DATABASE_URL`, matching
the API runtime. Release-only `MIGRATION_DATABASE_URL` and its legacy Production alias remain
available only through the explicit Production migration configuration.

The three pending canonical migrations were applied transactionally to `qa_management_dev`.
The live `ck_workspace_membership_activity_action` constraint now permits
`workspace_archived` and `workspace_restored`, so the Owner archive transaction can persist its
required audit event without returning PostgreSQL `23514`.

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` local setup and release-only
  migration boundaries; `docs/1_ARCHITECTURE.md` canonical migration and transactional audit
  requirements.
- **Policy IDs:** `DATA-002`, `TEST-001`.
- **Data/interface impact:** No API or shared-contract change. Canonical migrations 61–63 were
  applied to local database `qa_management_dev`.
- **Authorization impact:** None. Owner-only archive/restore enforcement is unchanged.
- **Migration risk:** Non-destructive and preflighted. Migration 61 found zero duplicate Test
  Result or Bug evidence URL groups; migration 62 added cancellation tables and triggers;
  migration 63 replaced the activity-action allowlist constraint. No records were deleted.

## Changed files

- `apps/api/src/config/database.cjs` — aligns development migration target precedence with the
  development API while preserving Production migration selection.
- `apps/api/src/config/__tests__/databaseConfig.test.ts` — proves local and runtime fallback
  precedence and guards the Production migration URL boundary.
- `TODO.md` — records task status and evidence.
- `docs/reports/FIX_LOCAL_MIGRATION_TARGET_DRIFT_2026-09-02.md` — records diagnosis, impact,
  migration execution, and validation evidence.

## Validation

- Rollback-only pre-fix database reproduction — reproduced the reported constraint failure 2/2
  times with SQLSTATE `23514`; no rows persisted.
- `npx tsx --test src/config/__tests__/databaseConfig.test.ts` before the fix — failed 0/2 as
  expected because both cases selected `MIGRATION_DATABASE_URL`.
- Read-only local migration preflight — passed; zero duplicate evidence groups and neither
  cancellation table existed.
- `npm run db:migrate` — passed on `qa_management_dev`; migrations 61, 62, and 63 applied in
  order, with no data deletion.
- Live constraint and migration-ledger inspection — passed; migrations 61–63 are recorded and
  both Workspace archive activity actions are allowed.
- Rollback-only post-fix archive activity probes — passed 2/2; the formerly rejected insert was
  accepted and rolled back without persisting records.
- `NODE_ENV=test node --test dist/config/__tests__/databaseConfig.test.js dist/modules/workspaces/__tests__/workspaceArchiveApiIntegration.test.js`
  — passed 3/3 tests, 0 failed, 0 skipped, against the disposable PostgreSQL test database;
  includes selector tests 2/2 and Workspace archive HTTP/PostgreSQL integration 1/1.
- `npx tsx --test src/config/__tests__/databaseConfig.test.ts` — passed 2/2, 0 failed, 0
  skipped after the final Production-boundary assertion.
- `npm --prefix apps/api run build` — passed.
- `npm run validate` — passed: documentation tests 5/5 and governance check passed, lint
  reported 0 errors and 28 pre-existing warnings, and contracts/API/web typechecks passed.
- `npx eslint apps/api/src/config/__tests__/databaseConfig.test.ts` — passed with 0 errors and 0
  warnings.
- `npx prettier --check apps/api/src/config/database.cjs apps/api/src/config/__tests__/databaseConfig.test.ts`
  — passed.

## Risks or follow-up

- The local API process does not require a restart for the database constraint change. Restart
  any long-running migration shell only if it cached the old configuration module.
- Preview and Production databases were not mutated by this fix.

## TODO update

- `FIX-LOCAL-MIGRATION-TARGET-DRIFT` → `Done`.
