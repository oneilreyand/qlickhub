## Task

`PRODUCTION-RELEASE-QA-TEST-CASE-QUICK-AUTHORING` — release automatic Test Case numbering and
the Edge Case scenario to Vercel Production.

## Outcome

Source commit `20541b7ded6f48289e83e1397bc8d684e51aac70` was pushed to `origin/main` after the
additive database migration completed. Vercel deployment `dpl_AGQbmQ8uE4tM1Bvnn6RKMhX9cq6T`
reached `READY`, targets Production, and owns the canonical `https://qlickhub.vercel.app` alias.

The authenticated Production form now displays a read-only **Nomor Test Case** value of
**Otomatis saat disimpan**, explains that the number is unique per Workspace, and offers
**Edge Case (Kondisi Batas)**. The light-theme modal is fully readable without dark-only surfaces.
The form was closed without saving, so the browser smoke test did not create or change business
records.

## Source of truth and impact

- **Applicable SSoT:** [Deployment runbook](../DEPLOYMENT_AND_ENVIRONMENTS.md),
  [Architecture](../1_ARCHITECTURE.md), [Workflow](../2_WORKFLOW_AND_ROLES.md),
  [UI design system](../3_UI_ATOMIC_DESIGN_SYSTEM.md), and
  [Agent guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-001`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `QA-001`, `UI-001`,
  `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** migration 70 adds the Workspace-scoped reference counter and insert
  trigger, and expands `scenario_kind` to `positive | negative | edge`. Existing endpoint paths are
  unchanged and a missing reference remains valid create/import input.
- **Authorization impact:** none. Existing Test Case create and lifecycle authorization remains in
  the backend; an unauthenticated Production request to `/v1/workspaces` still returns 401.
- **Migration risk:** migration 70 is additive and was applied before the application deployment.
  It does not backfill existing blank references. Rollback must not drop the schema after `edge`
  records exist; the migration guards that destructive down path.

## Changed files

- `TODO.md` — records the live Production release and updates the feature status.
- `docs/reports/QA_TEST_CASE_QUICK_AUTHORING_2026-09-14.md` — updates the implementation follow-up
  after Production migration and deployment.
- `docs/reports/PRODUCTION_RELEASE_QA_TEST_CASE_QUICK_AUTHORING_2026-09-14.md` — records deployment,
  migration, recovery, and smoke evidence.
- Runtime, schema, tests, and SSoT changes are contained in source commit `20541b7` and documented
  in the [implementation report](QA_TEST_CASE_QUICK_AUTHORING_2026-09-14.md).

## Validation

- Pre-release implementation gates — contracts 70/70, focused frontend 18/18, complete frontend
  465/465 across 88 files, focused HTTP/PostgreSQL 32/32, complete API/PostgreSQL 425/425 across 97
  suites, and all 54 clean migrations passed; 0 failed and 0 skipped. Existing React `act(...)`
  warnings and configured SMTP/FCM test-seam messages remained non-failing.
- `npm run validate` — passed documentation governance 5/5, contracts/API/web typechecks, and lint
  with 0 errors and 21 existing warnings.
- `npm run env:check` — passed with 0 warnings and printed no environment values.
- `npm run build` — passed contracts, API, and web builds; local Vite transformed 1,710 modules.
- PostgreSQL 17.11 `pg_dump --format=custom` — created the pre-migration Production backup at
  `/private/tmp/qlickhub-production-pre-test-case-auto-20260914-2310.dump`, mode 600, 485,798 bytes.
  `pg_restore --list` read it successfully and reported 841 archive entries; SHA-256 was recorded
  locally as `5b694f6dd6735b2a863cddb7a6034c563362ec0d362b39ff93bc46add16bcc50`.
- Pre-migration read-only audit — Production contained 2 Test Cases, both with blank legacy
  references and no numeric `TC-<number>` references. Migration 70 was the only migration down.
- `npm run db:migrate:prod` — migration
  `20260914000070-add-test-case-auto-reference-and-edge-scenario.cjs` completed in 1.364 seconds.
- Post-migration read-only audit — all 54 canonical migrations report `up`; the counter table,
  allocation trigger, and scenario constraint each exist, and the constraint includes `edge`.
  The 2 existing Test Cases remain unchanged; the counter has no rows until the first applicable
  insert because Production had no pre-existing numeric Test Case reference.
- `git fetch origin main` and revision comparison — remote had no new commits; local was exactly one
  commit ahead. `git push origin main` pushed `ff24700..20541b7`.
- `vercel --prod --yes --scope oneilreyands-projects` from a clean detached worktree at `20541b7` —
  cloud build transformed 1,710 modules and deployment `dpl_AGQbmQ8uE4tM1Bvnn6RKMhX9cq6T`
  reached `READY` with the canonical Production alias.
- Production public smoke — `/`, `/login`, and `/v1` returned 200; `/v1/health` returned 200 with
  service `ok` and database `connected`; unauthenticated `/v1/workspaces` returned 401.
- Production CORS smoke — the canonical Production origin returned 204 with its exact allow-origin
  header; an unauthorized origin returned 401 without an allow-origin header.
- Production bundle inspection — the live `MyTasksPage-DFUozoSQ.js` contains the automatic-number,
  Edge Case, and review-action labels.
- Authenticated read-only browser smoke — a fresh Production bundle loaded Workspace `kerjaa`, My
  Tasks, the persisted QA Subtask and its two Requirements, then opened the Test Case form. Desktop
  light mode at 1,624×969 showed no dark-only form surface, the number field was read-only, and Edge
  Case could be selected. The form was closed without saving. Pre-release component verification
  also covered light/dark desktop and 390×844 mobile layouts.

## Risks or follow-up

- The 2 historical Test Cases with blank references remain unchanged by design. Any historical
  backfill requires a separate approved data decision and audit.
- Application rollback target is the previously healthy Production deployment
  `dpl_2YE4k1jT8enrtbkM2XCPRsUgZKUT`. The old application remains compatible with migration 70, so
  rollback should first restore that deployment alias rather than undoing the additive schema.
  The verified custom-format backup is the recovery source if database restoration is explicitly
  approved.

## TODO update

- `PRODUCTION-RELEASE-QA-TEST-CASE-QUICK-AUTHORING` → `Done`.
