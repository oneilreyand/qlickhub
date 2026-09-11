## Task

PRODUCTION-RELEASE-REQUIREMENT-GUIDED-SUBTASK-PLANNING: Commit and push the complete validated worktree, deploy it through the linked Vercel Production project, verify the live runtime, and identify Git commits not yet served by Production.

## Outcome

The complete worktree snapshot was committed as `b913523` and pushed to `origin/main`. Vercel Git integration deployed that exact commit as Production deployment `dpl_9Aq8MkzL8hoouQdnWjZUsJ3z1cAT`; it reached `READY`, was promoted, and owns `https://qlickhub.vercel.app`.

The release includes Requirement-guided Subtask planning, its additive backend contract and persisted audit behavior, the current Task Detail Overview two-column layout update, and the minimal Nodemailer runtime security update from 9.0.5 to 9.1.1. No database migration or Production data mutation was executed.

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, and `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DATA-001`, `DATA-002`, `DOMAIN-002`, `DOMAIN-004`, `AUTH-002`, `FLOW-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** additive optional `requirementIds` input on Subtask creation. Valid selections persist canonical `task_requirements` rows and Activity entries through the existing transaction. Existing clients and Subtasks remain compatible.
- **Authorization impact:** no expansion. Requirement mutation and Subtask planning remain restricted to active `owner`, `admin`, and `po` Workspace memberships and enforced by the backend.
- **Migration risk:** none. All 50 canonical Production migrations were already `up`; the release adds no migration file or schema change.

## Changed files

- Commit `b913523` — complete application, contract, tests, Feature Card, implementation report, Task Detail Overview layout, dependency lock, and TODO snapshot released to Production.
- `apps/api/package.json` and `package-lock.json` — move Nodemailer to fixed runtime version 9.1.1 after the release audit identified the newly published advisory affecting 9.0.5.
- `docs/reports/PRODUCTION_RELEASE_REQUIREMENT_GUIDED_SUBTASK_PLANNING_2026-09-11.md` — records this release evidence.
- `TODO.md` — records the Production release as completed.

## Validation

- Initial sandboxed `npm ci` — failed only because the restricted runner could not resolve `registry.npmjs.org`; the approved network retry completed successfully.
- Final `npm ci` — passed: 741 packages installed from the lockfile. It initially reported two moderate and one high advisory before remediation; after upgrading Nodemailer it reported only the two dev-only moderate Vitest findings.
- `npm audit --omit=dev --json` — passed with 0 Production vulnerabilities: 0 critical, 0 high, 0 moderate, and 0 low.
- `npm audit --json` — recorded 2 moderate dev-only findings in Vitest 3.2.6/`@vitest/mocker`; npm's available fix is the major Vitest 5.0.0 update. There are no remaining high or critical findings.
- `npm run env:check` — passed with 0 warnings and no values printed.
- `npm run validate` — passed: documentation governance 5/5, documentation compliance, contracts/API/web typechecks, and lint with 0 errors and 23 existing warnings.
- `npm run build` — contracts, API, and web Production builds passed; Vite transformed 1,699 modules.
- `npm test` — passed after one sandbox-only `tsx` IPC retry: contracts 63/63 across 18 suites, frontend 382/382 across 75 files, and PostgreSQL API integration 403/403 across 94 suites. No tests failed or were skipped. Existing non-failing jsdom navigation, React `act(...)`, and nested-button warnings remain.
- `../../node_modules/.bin/sequelize-cli db:migrate:status --env production` from `apps/api` — read-only audit passed through the configured Production migration connection; all 50 canonical migrations reported `up`. No migration command was run.
- `git push origin main` — pushed `7477237..b913523`.
- Vercel deployment metadata — deployment `dpl_9Aq8MkzL8hoouQdnWjZUsJ3z1cAT` targets Production, reports `READY`/`PROMOTED`, owns the canonical alias, and identifies Git source `main` SHA `b91352357eba9e69c9ab4c2287a9d851c199c0c2`.
- Production smoke — `/`, `/login`, and `/v1` returned 200; `/v1/health` returned 200 with database `connected`; unauthenticated `/v1/workspaces` returned 401.
- Production CORS smoke — the canonical Production origin received 204 with the exact allow-origin header; an unauthorized origin received 401 without an allow-origin header.
- Production artifact inspection — all 48 referenced JavaScript chunks were read; the active Task Hub chunks contain `Create & Plan Subtask`, the linked-Requirement selector states, and the `requirementIds` payload.

## Risks or follow-up

- No authenticated Production role journey was run because no Production credentials or session were used. Public runtime, database connectivity, authorization guard, CORS, deployment metadata, and artifact checks passed.
- Vitest 3.2.6 retains two moderate development-only audit findings. Remediation requires a separately validated major upgrade to Vitest 5.0.0; Production dependencies have zero audit findings.
- Production deployment `dpl_6ETPqyuSYEnrvkiYBPyvPQorxZtP` remains the last documented known-good Git deployment rollback target from before this release.

## TODO update

- `PRODUCTION-RELEASE-REQUIREMENT-GUIDED-SUBTASK-PLANNING` → `Done`.
