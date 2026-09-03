## Task

REQUIREMENT-BULK-CORRECTION-500: diagnose and fix the authenticated Product Owner bulk Requirement deprecation endpoint returning HTTP 500.

## Outcome

Bulk Requirement correction now locks the selected Task–Requirement links and their Requirements in separate PostgreSQL queries inside the same transaction. This removes the invalid `FOR UPDATE` outer join while preserving Workspace validation, deprecation or unlink behavior, and append-only Task activity.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` and `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DOMAIN-003`, `AUTH-002`, `DATA-001`, `TEST-001`.
- **Data/interface impact:** No API contract or schema change. The existing transaction still updates the selected persisted Requirements or links and writes Task activity atomically.
- **Authorization impact:** None; the existing authenticated Workspace and planner authorization boundaries are unchanged.
- **Migration risk:** None; no model, schema, data migration, or canonical migration file changed.

## Changed files

- `apps/api/src/modules/requirements/requirementService.ts` — replaces the locked outer join with separately locked link and Requirement queries, then validates and maps the selected Workspace-owned records.
- `TODO.md` — records task status and evidence.
- `docs/reports/REQUIREMENT_BULK_CORRECTION_500_2026-09-02.md` — records diagnosis and validation evidence.

## Validation

- Before fix: `NODE_ENV=test npx tsx --test apps/api/src/modules/requirements/__tests__/requirementApiIntegration.test.ts` — **8 passed, 1 failed, 0 skipped**; bulk deprecation returned HTTP 500 instead of 200.
- Temporary tagged diagnostic run identified PostgreSQL error `FOR UPDATE cannot be applied to the nullable side of an outer join`; the diagnostic instrumentation was removed immediately afterward.
- After fix: `NODE_ENV=test npx tsx --test apps/api/src/modules/requirements/__tests__/requirementApiIntegration.test.ts` — **9 passed, 0 failed, 0 skipped**, 1 suite, PostgreSQL test environment.
- `npm --prefix apps/api run typecheck` — passed, exit code 0.
- Targeted ESLint and Prettier checks for the corrected email, Test Management, Release Lifecycle, and Requirement files — passed.
- `npm --prefix apps/api run test` — TypeScript build passed; **342 passed, 0 failed, 0 skipped** across 87 suites, PostgreSQL test environment. A non-fatal asynchronous notification foreign-key warning occurred during concurrent fixture cleanup and remains a separately documented reliability follow-up.
- Tagged-debug cleanup search — passed; no temporary diagnostic marker remains.

## Risks or follow-up

- No known functional gap remains in bulk Requirement correction.
- The full test runner can emit a non-fatal notification insert warning when asynchronous work outlives Task fixture cleanup. It did not affect the 342 passing assertions but should be corrected separately.

## TODO update

- `REQUIREMENT-BULK-CORRECTION-500` → `Done`.
