## Task

SOURCE-CONTROL-PRODUCTION-RECONCILIATION: Reconcile the validated Production worktree snapshot
into Git `main` so future Vercel Git deployments preserve the separated Product Brief and
Requirements tabs.

## Outcome

The application snapshot that had previously reached Production only through a dirty manual
deployment is now committed to Git. Commit `597e0d8` records that complete snapshot, and merge
commit `d261a72` combines it with the newer Task Hub metric and banner work already present on
`origin/main`.

Vercel's Git integration deployed `d261a72` as Production deployment
`dpl_6ETPqyuSYEnrvkiYBPyvPQorxZtP`. It reached `READY` and updated the canonical
`https://qlickhub.vercel.app` alias. The live Task Hub bundle contains distinct `Product Brief` and
`Requirements` labels and does not contain the legacy `Specs & Requirements` label.

No database migration command or Production data mutation was executed.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, and
  `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`.
- **Policy IDs:** `DATA-001`, `DATA-002`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. Existing application source, tests, documentation, and assets
  were reconciled into Git; no API contract, response shape, schema, or persisted row changed.
- **Authorization impact:** None. Existing backend authorization remains unchanged.
- **Migration risk:** None. This reconciliation did not add or run a migration.

## Changed files

- The previously validated dirty Production worktree — committed as `597e0d8` so the deployed
  application state is reproducible from Git.
- `TODO.md` and `apps/web/src/components/ui/organisms/OverviewBannerCarousel.tsx` — resolved the
  merge with `origin/main`, retaining both work histories and the newer approved dark-mode banner
  behavior.
- `apps/web/src/components/ui/organisms/myTasks/DevWorkingDesk.tsx` — ignores stale comment
  responses after task switches or component teardown.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/DevWorkingDesk.test.tsx` — covers the
  stale-response race found by the full release gate.
- `apps/web/src/components/ui/organisms/__tests__/OverviewBannerCarousel.test.tsx` — aligns the
  regression expectation with the newer approved banner behavior.
- `docs/reports/SOURCE_CONTROL_PRODUCTION_RECONCILIATION_2026-09-11.md` — records reconciliation
  and release evidence.

## Validation

- `npm test` on the reconciled snapshot before the frontend-only `origin/main` merge — passed
  contracts 62/62, frontend 376/376 across 74/74 files, and PostgreSQL-backed API integration
  401/401 across 94/94 suites. No tests were skipped. The disposable PostgreSQL integration
  environment used canonical migrations and persisted records.
- Focused final merge tests for Task Detail, Requirement Manager, Product Brief, Dev Working Desk,
  Task Hub metrics, and Overview banner — passed 51/51 across 6/6 files. The Task Detail suite
  emitted its existing jsdom navigation notices; they were non-failing.
- Final `npm --prefix apps/web run test` — passed 378/378 across 75/75 files with no skipped tests
  and no unhandled runner errors. Existing non-failing warnings remain in unrelated tests for
  jsdom navigation, React `act(...)`, and nested buttons.
- Final `npm run validate` — documentation governance passed 5/5; contracts, API, and web
  typechecks passed; lint completed with 0 errors and 23 existing warnings.
- Final `npm run build` — contracts, API, and web Production builds passed; Vite transformed 1,699
  modules.
- `git push origin main` — pushed `5344277..d261a72`, making the reconciled application snapshot
  part of the canonical Git history.
- Vercel deployment inspection — deployment `dpl_6ETPqyuSYEnrvkiYBPyvPQorxZtP` targets
  Production, reports `READY`, identifies Git commit `d261a725bc44aa503eebab595b9bc30a4bef6f79`,
  and owns `https://qlickhub.vercel.app`.
- `GET https://qlickhub.vercel.app/v1/health` — 200.
- Unauthenticated `GET https://qlickhub.vercel.app/v1/workspaces` — 401.
- Public Production asset inspection — the active Task Hub bundle contains `Product Brief` and
  `Requirements`; it contains zero occurrences of `Specs & Requirements`.

## Risks or follow-up

- No authenticated Production role journey was run because no Production credentials or session
  were used. Public runtime, API health, authorization guard, Git deployment metadata, and live
  artifact checks passed.
- The pre-reconciliation manual deployment
  `https://qlickhub-6i6wrbti8-oneilreyands-projects.vercel.app` remains an immediate rollback
  artifact, although the canonical Git deployment is now preferred because it is reproducible.

## TODO update

- `SOURCE-CONTROL-PRODUCTION-RECONCILIATION` → `Done`.
