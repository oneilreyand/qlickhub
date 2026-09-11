## Task

PRODUCTION-RELEASE-GUARDED-MISTAKEN-REQUIREMENT-DELETION: Commit the verified guarded
Requirement deletion slice, deploy the matching frontend and API to Production, and verify the
live runtime without running a migration or mutating Production application data.

## Outcome

Planner roles can now permanently delete one or many mistakenly created Requirements from the
Production Task correction flow after typing `DELETE`, while backend dependency guards retain
delivery history and reject the entire batch when any selected Requirement is in use.

Application commit `1318d408343f6341adbfa1f49bc9aa411d8753ba` was pushed to `origin/main`.
Vercel Git integration deployed that exact SHA as Production deployment
`dpl_7iG4UzSGjZ4gkiCneSQ2NshALcNW`; it reached `READY`/`PROMOTED` and owns the canonical
`https://qlickhub.vercel.app` alias. The commit also contains the already-verified Task-based
Requirement code suggestion and Login dark-mode hero fixes because their pending UI changes
overlapped in `RequirementManager` and the same verified worktree. No database migration or
Production data mutation was executed.

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, `docs/1_ARCHITECTURE.md`,
  `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, and
  `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `AUTH-002`, `DATA-001`, `DATA-002`, `DATA-004`, `CONTRACT-001`, `UI-001`,
  `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** the existing bulk Requirement correction contract additively accepts
  `delete` with exact confirmation `DELETE`. A user-triggered successful request deletes only safe
  selected Requirement definitions, their current Task links, and definition-owned Acceptance
  Criteria in one transaction while persisting a Task Activity summary. The release process itself
  did not invoke this mutation.
- **Authorization impact:** active Workspace `owner`, `admin`, and `po` memberships may execute the
  correction; Developer and QA remain read-only and backend-enforced denial is covered by tests.
- **Migration risk:** none. No schema change or migration was added. All 50 canonical Production
  migrations were already `up` in the read-only pre-deployment audit.

## Changed files

- `packages/contracts/src/requirement.ts` — adds the guarded bulk-delete request and response
  contract.
- `apps/api/src/modules/requirements/requirementService.ts` — performs dependency checks, atomic
  deletion, and Task Activity audit creation.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx` — presents the destructive choice,
  warning, exact typed confirmation, loading/disabled state, and backend error.
- `apps/web/src/components/ui/molecules/Modal.tsx` — supports disabled and destructive primary
  actions through the shared modal.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailActivityTab.tsx` — renders the deletion
  event in human-readable form.
- Related contract, PostgreSQL integration, and frontend test files — prove input validation,
  atomicity, traceability guards, RBAC, interaction states, and Activity presentation.
- `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/POLICY_REGISTRY.md`,
  `docs/adr/ADR-012-GUARDED-MISTAKEN-REQUIREMENT-DELETION.md`, and
  `docs/features/GUARDED_MISTAKEN_REQUIREMENT_DELETION.md` — record the approved policy and feature
  boundary.
- `TODO.md` and this report — record the release lifecycle and evidence.

## Validation

- `npm ci` — passed from the lockfile; 741 packages were installed. Deprecation warnings were
  reported for `dottie`, `whatwg-encoding`, `node-domexception`, and `glob`.
- `npm --prefix packages/contracts run test` — passed 63/63 tests across 18 suites; 0 failed and 0
  skipped.
- `npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/__tests__/RequirementManager.test.tsx src/components/ui/molecules/__tests__/Modal.test.tsx`
  — passed 48/48 tests across 3 files; 0 failed and 0 skipped.
- `NODE_ENV=test node --test apps/api/dist/modules/requirements/__tests__/requirementApiIntegration.test.js`
  — passed 12/12 tests against the disposable PostgreSQL test database; 0 failed and 0 skipped.
- `npm test` — passed the complete suite: contracts 63/63, frontend 392/392 across 76 files, and
  PostgreSQL API 406/406 across 94 suites; 0 failed and 0 skipped. Existing non-failing jsdom
  navigation, React `act(...)`, and nested-button warnings remained visible in unrelated tests.
- `npm run validate` — passed documentation governance 5/5, lint with 0 errors and 23 existing
  warnings, and contracts/API/web type checks.
- `npm run env:check` — passed with 0 warnings and printed no environment values.
- `npm run build` — passed contracts, API, and web Production builds; Vite transformed 1,700
  modules.
- `npm audit --omit=dev --audit-level=moderate` — passed with 0 runtime vulnerabilities.
- `npm audit --audit-level=moderate` — reported 2 moderate findings in Vitest development tooling;
  the available remediation requires a breaking Vitest 5 upgrade and was not force-applied.
- `git diff --check` and pre-commit staged checks — passed; Prettier and ESLint completed
  successfully for the staged files.
- `../../node_modules/.bin/sequelize-cli db:migrate:status --env production` from `apps/api` —
  read-only audit passed; all 50 canonical Production migrations reported `up`. No migration command
  was run.
- `git push origin main` — pushed `d4d7f7b..1318d40`.
- Vercel deployment metadata — `dpl_7iG4UzSGjZ4gkiCneSQ2NshALcNW` targets Production, reports
  `READY`/`PROMOTED`, owns the canonical alias, and identifies Git source `main` SHA
  `1318d408343f6341adbfa1f49bc9aa411d8753ba`.
- Production smoke — `/`, `/login`, and `/v1` returned 200; `/v1/health` returned 200 and reported
  database `connected`; unauthenticated `/v1/workspaces` returned 401.
- Production CORS smoke — the canonical Production origin returned 204 with its allow-origin header;
  an unauthorized origin returned 401 without an allow-origin header.
- Production artifact inspection — the active Task Hub bundle contains `Delete mistaken
Requirements`, `Type DELETE to confirm`, `Delete permanently`, `Permanent and irreversible`, and
  `requirements_bulk_deleted`.

## Risks or follow-up

- No authenticated Production deletion journey was run because that would irreversibly mutate
  Production data. Authorization, persistence, rollback-on-conflict, and deletion behavior were
  proven against the disposable PostgreSQL integration environment; public Production runtime,
  database connectivity, auth guard, CORS, and active artifact checks passed.
- Production deployment `dpl_ERN5hQi9uo59m6nB5jXpxHACCgAw` is the immediate known-good application
  rollback target from before this feature release. Deployment
  `dpl_7iG4UzSGjZ4gkiCneSQ2NshALcNW` is the known-good code target for any later documentation-only
  deployment.
- The two moderate Vitest findings remain development-only and require a separately validated major
  upgrade.

## TODO update

- `PRODUCTION-RELEASE-GUARDED-MISTAKEN-REQUIREMENT-DELETION` → `Done`.
