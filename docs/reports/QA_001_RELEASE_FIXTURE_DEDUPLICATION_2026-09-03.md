## Task

QA-001-RELEASE-FIXTURE-DEDUPLICATION: remove a duplicated Test Case publication block from Release Lifecycle integration.

## Outcome

The Release Lifecycle fixture now publishes its Test Case exactly once through `draft → in_review → active`. It no longer attempts the policy-invalid `active → in_review` transition before starting the first Test Run.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` §5 and `docs/2_WORKFLOW_AND_ROLES.md` §5.
- **Policy IDs:** `QA-001`, `TEST-001`.
- **Data/interface impact:** None; test fixture correction only.
- **Authorization impact:** None; planner publication authority and QA execution boundaries are unchanged.
- **Migration risk:** None; no runtime model, schema, data, or migration change.

## Changed files

- `apps/api/src/modules/releaseValidation/__tests__/releaseLifecycleApiIntegration.test.ts` — removes the second, duplicated Test Case publication sequence.
- `TODO.md` — records task status and evidence.
- `docs/reports/QA_001_RELEASE_FIXTURE_DEDUPLICATION_2026-09-03.md` — records diagnosis and validation evidence.

## Validation

- Full API regression before correction — TypeScript build passed; **352 passed, 1 failed, 0 skipped** across 88 suites. Release Lifecycle received HTTP 400 for the invalid duplicate `active → in_review` transition.
- `NODE_ENV=test npx tsx --test apps/api/src/modules/releaseValidation/__tests__/releaseLifecycleApiIntegration.test.ts` — **1 passed, 0 failed, 0 skipped**, 1 suite, PostgreSQL test environment.
- Final `npm --prefix apps/api run test` — TypeScript build passed; **353 passed, 0 failed, 0 skipped** across 88 suites, PostgreSQL test environment.

## Risks or follow-up

- None. The removed block duplicated the immediately preceding authenticated publication loop and did not represent a supported lifecycle path.

## TODO update

- `QA-001-RELEASE-FIXTURE-DEDUPLICATION` → `Done`.
