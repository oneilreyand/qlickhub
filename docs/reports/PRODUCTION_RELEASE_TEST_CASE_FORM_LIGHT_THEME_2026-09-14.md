## Task

PRODUCTION-RELEASE-TEST-CASE-FORM-LIGHT-THEME — release the verified light-theme correction for the “Buat Test Case Baru” form to Vercel Production.

## Outcome

Commit `d7acff097f8086df1b5aa0e493e460f7aecd0061` was pushed to `origin/main` and deployed from a clean detached worktree containing that exact commit. Vercel deployment `dpl_FBqQcYxEdUNhZm6QT55qTYg5cPwg` reached `READY`, targets Production, and owns the canonical `https://qlickhub.vercel.app` alias.

The authenticated Production form was opened without submitting it. On desktop and mobile light mode, the three dropdowns, Requirement selector, labels, text fields, and footer now use light surfaces; no dark-only form surface remains. No Test Case or other business record was created, updated, or deleted.

## Source of truth and impact

- **Applicable SSoT:** [Deployment runbook](../DEPLOYMENT_AND_ENVIRONMENTS.md), [Workflow](../2_WORKFLOW_AND_ROLES.md), [UI design system](../3_UI_ATOMIC_DESIGN_SYSTEM.md), and [Agent guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-001`, `DATA-001`, `QA-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** the verified frontend theme correction is now served by Production. API contracts and persisted data are unchanged.
- **Authorization impact:** none. Production still rejects protected interfaces without a session, and the Test Case lifecycle permissions are unchanged.
- **Migration risk:** none. No migration file changed, all 53 canonical Production migrations were already `up`, and no migration command ran.

## Changed files

- `TODO.md` — records release status and evidence.
- `docs/reports/PRODUCTION_RELEASE_TEST_CASE_FORM_LIGHT_THEME_2026-09-14.md` — records deployment identity, verification, and rollback target.
- Application and regression files are contained in source commit `d7acff0` and documented in [the implementation report](TEST_CASE_FORM_LIGHT_THEME_2026-09-14.md).

## Validation

- `npm ci` — installed 741 locked packages and audited 745 packages; passed with four dependency deprecation notices and two moderate audit findings. No dependency version changed.
- `npm run validate` — passed documentation governance 5/5, contracts/API/web typechecks, and lint with 0 errors and 21 existing warnings.
- `npm run env:check` — passed with 0 warnings and printed no environment values.
- `npm --prefix apps/web run test` before release — passed 461/461 tests across 88/88 files; 0 failed and 0 skipped. Existing non-failing React `act(...)` warnings remained in unrelated suites.
- `npm run build` — passed contracts, API, and web builds; local Vite transformed 1,710 modules.
- `sequelize-cli db:migrate:status --env production` from `apps/api` — read-only audit passed; all 53 canonical Production migrations reported `up`. No migration command ran.
- `git fetch origin main` — confirmed local and remote `main` had no divergence before the release commit.
- `git push origin main` — pushed `f73aa14..d7acff0`; only the theme correction, its regression, implementation report, and related TODO entries were committed. Other local work remained unstaged and was not included.
- `vercel --prod --yes` from the clean detached worktree at `d7acff0` — cloud build transformed 1,710 modules; deployment `dpl_FBqQcYxEdUNhZm6QT55qTYg5cPwg` reached `READY` and was aliased to the canonical Production URL.
- Production public smoke — `/`, `/login`, and `/v1` returned 200; `/v1/health` returned 200 with service `ok` and database `connected`; unauthenticated `/v1/workspaces` returned 401.
- Production CORS smoke — the canonical Production origin received 204 with its exact allow-origin header; an unauthorized origin received 401 without an allow-origin header.
- Authenticated read-only browser smoke — the existing QA session loaded Workspace `kerjaa`, My Tasks, the assigned QA Subtask, and the “Buat Test Case Baru” form. The form rendered correctly in light mode at desktop 1,624×969 and mobile 390×844. The modal was closed without entering or submitting data, and the browser viewport was restored.

## Risks or follow-up

- `npm ci` still reports two moderate dependency findings. They were not auto-fixed because a forced audit fix may introduce breaking changes; handle them as separate security maintenance.
- An unrelated “Sertifikasi QA gagal dimuat” validation message appeared in the existing Production QA detail view during the read-only smoke. The Test Case form loaded and passed verification; diagnosing that separate panel was outside this release scope.
- Application rollback target is the previously healthy Production deployment `dpl_39yk3stfacwj3foM5PpvdMsctohm`. Database rollback is not applicable because no schema or business-data mutation ran.

## TODO update

- `PRODUCTION-RELEASE-TEST-CASE-FORM-LIGHT-THEME` → `Done`.
