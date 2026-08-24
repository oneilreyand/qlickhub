# AGY-7.2 Clean Release Validation — 2026-08-23

## Task

AGY-7.2: Run clean release validation with real persistence.

## Outcome

The complete Requirement → Development → QA → Bug/retest → QA Sign-off → Product Owner Release Decision flow is now repeatably validated through authenticated backend interfaces and PostgreSQL persistence. A dedicated verifier creates a uniquely named disposable database, applies every canonical migration through `20260822000054-create-release-decision-records.cjs`, checks the release schema, executes the tracer flow, and drops the database in a `finally` block.

The realistic flow uses distinct Owner, Product Owner, Developer, and QA actors. It persists a Feature and assigned Dev/QA subtasks, Requirement and stable Acceptance Criterion, reusable Test Case, failed rc1 Run/Result, linked High Bug, Developer resolution, QA retest with a passing rc2 Run/Result, Bug verification, approved QA Sign-off, and independent Product Owner Release Decision. It reads the records back through authenticated interfaces and verifies persisted counts and audit activity. No Test Run, Result, evidence attachment, Bug, sign-off, decision, or URL is fabricated as proof.

Critical UI paths are covered by the full frontend suite, including Requirement management, Delivery Trace, persisted QA execution, Bug/retest, release assurance, My Tasks role queues, and durable Task detail navigation. These tests use contract-valid frontend factories while the same persisted workflow is independently proven by the PostgreSQL/HTTP integration suite.

## Confirmed facts

- The canonical migration chain contains 38 migrations and completes on a clean PostgreSQL database through migration 54.
- Release validation depends on explicit Workspace-scoped tables for Acceptance Criteria, Test Management, Bugs/activity, QA Sign-offs, and Release Decisions.
- Backend authorization is exercised with separate role sessions: Product Owner plans and decides, Developer performs assigned implementation and Bug work, QA reviews/tests/retests/signs off, and Owner performs authorized reads.
- QA Sign-off and Product Owner Release Decision remain separate from Task status and `reviewNotes`; the tracer flow confirms the parent Feature remains `in_progress` with `reviewNotes = null`.
- Readiness before sign-off fails only `qa_sign_off`; after sign-off and verified retest it is ready and the Product Owner approval requires no override.

## Unresolved decisions

- None introduced by AGY-7.2. The existing owner decision in AGY-0.3 remains separate and blocked.

## Changed files

- `apps/api/src/modules/releaseValidation/__tests__/releaseLifecycleApiIntegration.test.ts` — adds the authenticated, persisted multi-role release tracer flow and read-back assertions.
- `apps/api/scripts/verifyReleaseLifecycle.cjs` — creates/drops the disposable database, applies all migrations, checks canonical release tables/migrations, and runs the tracer flow.
- `apps/api/package.json` — adds the repeatable `db:verify:release-lifecycle` command.
- `TODO.md` — records AGY-7.2 completion and its verification evidence.

## Data/interface impact

- No production schema or public contract changed.
- Test setup creates only contract-valid records and the disposable verifier removes its entire database after validation.
- The added integration test uses existing authenticated HTTP interfaces; direct model access is limited to valid actor/Workspace setup, persistence assertions, and dependency-ordered cleanup.

## Authorization impact

- No authorization policy changed.
- The validation proves the existing role boundaries across planning, assigned development work, independent QA review/execution/verification/sign-off, Product Owner release approval, and authorized Owner reads.

## Migration risk

- No migration was added or modified.
- All 38 canonical migrations ran successfully from an empty disposable PostgreSQL database. The verifier confirmed migrations 50–54 and nine critical release tables before executing the workflow.
- The disposable database was dropped after the successful run.

## Validation

- `npm --prefix apps/api run db:verify:release-lifecycle` — passed; compiled the API, created `qa_management_release_verify_11623`, applied all 38 migrations, verified migrations 50–54 and nine critical tables, passed the full tracer flow 1/1 with 0 skipped, then dropped the database.
- `npm --workspace packages/contracts test` — passed 49/49 in 15 suites; 0 failed, skipped, cancelled, or todo. The initial sandboxed attempt could not create the TypeScript runner IPC socket (`EPERM`); the authorized rerun passed.
- `npm --workspace packages/contracts run typecheck` — passed.
- `npm --workspace packages/contracts run build` — passed.
- `npm --prefix apps/api test` — passed 207/207 in 60 suites against the configured local PostgreSQL test database; 0 failed, skipped, cancelled, or todo.
- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/api run build` — passed.
- `npm --prefix apps/web test` — passed 249/249 across 56 files; 0 failed or skipped. Covered Requirement, Delivery Trace, QA execution, Bug/retest, release assurance, role queues, and durable navigation surfaces without runtime console warnings.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/web run build` — passed; Vite retained the existing advisory that the main minified chunk exceeds 500 kB.
- `git diff --check -- apps/api/src/modules/releaseValidation/__tests__/releaseLifecycleApiIntegration.test.ts apps/api/scripts/verifyReleaseLifecycle.cjs apps/api/package.json` — passed.

## Risks or follow-up

- The web production build still reports the pre-existing bundle-size advisory (`index-DMulJPCB.js`, 1,235.09 kB / 286.50 kB gzip). This is not a browser runtime warning and did not fail the build, but future code splitting remains useful.
- The full backend suite uses the configured local PostgreSQL test database; the AGY-7.2 proof command separately guarantees clean-database behavior and cleanup.
- Product/design/documentation reconciliation is intentionally left for AGY-7.3.

## TODO update

- AGY-7.2: Run clean release validation with real persistence → `Done`.
