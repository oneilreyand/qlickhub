# AGY-3.2 Legacy Requirement Test Case Migration

## Task

Migrate persisted `requirement_test_cases` into the canonical Test Case model without fabricating Test Run or Test Result history.

## Outcome

- Every legacy row becomes one canonical `test_cases` definition with the same UUID, Workspace, title, test type, creator, and timestamps.
- Every legacy Requirement relation becomes one Workspace-scoped `test_case_requirements` link.
- Canonical definition status is `active`; legacy execution statuses are not treated as definition status or fabricated Results.
- Legacy status and `execution_details` remain in the untouched source table and are snapshotted in `legacy_requirement_test_case_migrations` as migration provenance.
- The migration aborts atomically on blank titles, unsupported test types, UUID collisions, or row/link count mismatches.
- Existing canonical Test Cases are preserved.

## Data and interface impact

- Adds canonical definitions and Requirement links only. It does not change an HTTP contract or authorization policy.
- Adds the `legacy_requirement_test_case_migrations` provenance table.
- Creates no `test_runs`, `test_results`, evidence, or activity that would imply an execution occurred under the canonical workflow.
- Retains `requirement_test_cases`; its historical execution fields remain available for reconciliation and are not deleted.

## Rollback and recovery path

The migration `down` path removes only canonical definitions and links recorded by the provenance table. It preserves the source table and all pre-existing canonical Test Cases.

Rollback deliberately refuses to continue when any migrated Test Case has:

- a canonical Test Run;
- an additional Requirement link; or
- a changed canonical definition.

If a guard refuses rollback, do not delete the provenance or source rows. Export the affected canonical Test Case, Requirement links, Test Runs/Results, and its provenance row; decide whether downstream history should remain canonical or be reassigned; then reconcile those records before retrying the migration rollback. This prevents cascade deletion of post-migration history.

## Validation

- `npm run db:verify:legacy-test-case-migration` — passed on a disposable PostgreSQL database. Four legacy definitions and four links were migrated; source rows remained four; Test Runs and Results remained zero; clean rollback succeeded; rollback with a post-migration Run was refused without data loss.
- `npm run db:verify:clean-migrations` — passed from an empty disposable PostgreSQL database through migration 52.
- `npm run typecheck` — passed.
- `npm test` — passed: 179 tests, 53 suites, 0 failed, 0 skipped.
- `npm run db:status:legacy-test-case-migration` before development migration — passed: 0 legacy definitions, 0 invalid rows; canonical tables were not yet present.
- `npx sequelize-cli db:migrate --env development` — passed: migrations 50, 51, and 52 applied in order.
- `npm run db:status:legacy-test-case-migration` after development migration — passed: 0 legacy definitions, 0 canonical definitions, 0 provenance rows, 0 migrated links, 0 Test Runs, and 0 Test Results.
- `npx sequelize-cli db:migrate:status --env development` — passed: migrations 50, 51, and 52 report `up`.

## Development migration result

The local `qa_management_dev` database contained no legacy Requirement Test Cases. Applying migration 52 therefore aligned the schema and created the empty provenance structure without creating canonical Test Cases, Requirement links, Test Runs, or Test Results. No production database was accessed or mutated.
