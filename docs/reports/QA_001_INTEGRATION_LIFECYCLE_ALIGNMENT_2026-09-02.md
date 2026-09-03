## Task

QA-001-INTEGRATION-LIFECYCLE-ALIGNMENT: align canonical Test Management and Release Lifecycle integration tests with the approved Test Case publication lifecycle and correct status-transition audit classification.

## Outcome

Canonical Test Cases used for execution now move through authenticated `draft → in_review → active` transitions in both integration suites. QA publication denial is tested at the correct boundary: QA authors a draft, submits it for review, and receives `403` when attempting to activate it. The service now snapshots the prior status before Sequelize mutates the model, so future lifecycle transitions persist `test_case_status_changed` with accurate previous/new status metadata.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` §5 and `docs/2_WORKFLOW_AND_ROLES.md` §5.
- **Policy IDs:** `QA-001`, `AUTH-002`, `DATA-001`, `TEST-001`.
- **Data/interface impact:** No API contract or schema change. Future `test_case_activity` rows classify actual status transitions using the already-supported `test_case_status_changed` action; historical rows are not rewritten.
- **Authorization impact:** No policy change. QA may author drafts and submit review but cannot publish; PO/Admin/Owner retain publication authority.
- **Migration risk:** None; the action and database constraint already exist in canonical migrations.

## Changed files

- `apps/api/src/modules/testManagement/testManagementService.ts` — snapshots the previous Test Case status before update and persists accurate audit action/metadata.
- `apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts` — publishes the execution fixture through the real lifecycle and verifies audit plus QA publication denial.
- `apps/api/src/modules/releaseValidation/__tests__/releaseLifecycleApiIntegration.test.ts` — publishes the release Test Case before starting Test Runs.
- `TODO.md` — records task status and evidence.
- `docs/reports/QA_001_INTEGRATION_LIFECYCLE_ALIGNMENT_2026-09-02.md` — records observed evidence.

## Validation

- Original isolated Test Management repro — 2 passed, 5 failed, 0 skipped; Test Run creation returned `404` for draft Test Cases.
- After lifecycle fixture alignment, before audit fix — 6 passed, 1 failed, 0 skipped; actual actions were two `test_case_updated` rows instead of `test_case_status_changed`.
- Final `NODE_ENV=test npx tsx --test apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts` — 7 passed, 0 failed, 0 skipped, 1 suite, PostgreSQL test environment.
- Original isolated Release Lifecycle repro — 0 passed, 1 failed, 0 skipped; Test Run creation returned `404` for a draft Test Case.
- Final `NODE_ENV=test npx tsx --test apps/api/src/modules/releaseValidation/__tests__/releaseLifecycleApiIntegration.test.ts` — 1 passed, 0 failed, 0 skipped, 1 suite, PostgreSQL test environment.
- First complete API regression after this focused fix — build passed; **339 passed, 1 failed, 0 skipped** across 87 suites. All Test Management, Release Lifecycle, email, and SEC-01 tests passed; the remaining Requirement bulk-correction failure was subsequently resolved as a separate task.
- Final `npm --prefix apps/api run test` after the Requirement correction — build passed; **342 passed, 0 failed, 0 skipped** across 87 suites, PostgreSQL test environment. One non-fatal asynchronous notification foreign-key warning was emitted during concurrent cleanup.

## Risks or follow-up

- The unrelated Requirement bulk-correction endpoint failure was resolved and verified separately.
- The full test runner permits asynchronous notification work to outlive a fixture Task during cleanup, producing a non-fatal warning; this requires separate lifecycle cleanup analysis if it becomes a release gate.
- No debug instrumentation or throwaway files were added.

## TODO update

- `QA-001-INTEGRATION-LIFECYCLE-ALIGNMENT` → `Done` after the complete API regression passed 342/342.
