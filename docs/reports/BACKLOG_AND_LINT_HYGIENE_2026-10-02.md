# BACKLOG-AND-LINT-HYGIENE — 2026-10-02

## Task

`BACKLOG-AND-LINT-HYGIENE` — plan: [BACKLOG_AND_LINT_HYGIENE_PLAN](../plans/BACKLOG_AND_LINT_HYGIENE_PLAN.md).

## Outcome

- `APPROVAL-WINDOW-V1` moved from `Done locally` to `Done` in the
  [archive](../archive/TODO_COMPLETED_2026-10-02.md) with publication evidence: commit `88cb3e8`,
  PR #11 (merge `28d4990`), ADR-025 Accepted, stop conditions in Agent Guidelines §2A.A.1 and
  `AI-013`, CI `verify` passing on `main`. Active work now holds 7 `In progress` and 4 `Blocked`.
- Lint warnings reduced from 38 to 17 with 0 errors. Removed: 15 `no-useless-escape`,
  4 `no-empty`, 2 `no-useless-assignment`. Deferred: 10 `react-hooks/exhaustive-deps` and 7
  `react-refresh/only-export-components`, which can change behavior or require moving exports.

## Work assurance

- **Work Readiness Assessment:** 3/16, `Ready` — behavior-neutral source edits plus backlog record.
- **User plan approval:** Approval Window recorded in the plan (Owner, 2026-10-02).
- **Agent capability and access:** fresh clone of `origin/main` `12506f2`, disposable PostgreSQL 16.
  The executor cannot push, open pull requests, or merge.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                   | Required / achieved | Primary evidence                                                  | Status   |
| ------------------------------------------------------ | ------------------- | ----------------------------------------------------------------- | -------- |
| `APPROVAL-WINDOW-V1` closed with publication evidence. | E1 / E2             | `git log` shows `88cb3e8` under merge `28d4990`; `main` CI green. | Accepted |
| 21 behavior-neutral warnings removed, none added.      | E2 / E2             | `npm run lint`: 0 errors, 17 warnings (was 38).                   | Accepted |
| Strings, regexes, and `catch` control flow unchanged.  | E1 / E3             | Diff review; API integration and web tests below.                 | Accepted |
| No regression.                                         | E2 / E3             | Commands below.                                                   | Accepted |

- **Change Impact Map:** `spreadsheetParser.ts` (XLSX/CSV import), `geminiClient.ts` (DNS option
  guard), realtime SSE test helper, `FormattedText.tsx` (table detection regex),
  `TaskStatusBadge.tsx` (initial values removed; every switch branch assigns both values),
  `TestCaseImportWizardModal.test.tsx`. Contract, data, authorization, release: `N/A`.
- **Decision Snapshot:** fix only behavior-neutral rules now; schedule hook-dependency and
  fast-refresh warnings as separate tasks.
- **Quality review:** removed escapes verified to be no-ops (`\/` in template strings, `\-` at the
  end of a character class, `\"` in template literals); empty `catch` blocks now document intent.
- **Cross-layer quality gates:** UI and AI files changed without behavior change; evidence in
  `quality/manifests/BACKLOG-AND-LINT-HYGIENE.json`.

## Source of truth and impact

- **Applicable SSoT:** [AGENTS.md](../../AGENTS.md), [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `DOC-003`, `DOC-004`, `AI-013`.
- **Data/interface impact:** None. **Authorization impact:** None. **Migration risk:** None.

## Changed files

- `TODO.md`, `docs/archive/TODO_COMPLETED_2026-10-02.md` — backlog close-out.
- `apps/api/src/modules/testManagement/spreadsheetParser.ts`, `apps/api/src/modules/ai/geminiClient.ts`,
  `apps/api/src/modules/realtime/__tests__/realtimeStream.test.ts`,
  `apps/web/src/components/ui/atoms/FormattedText.tsx`,
  `apps/web/src/components/ui/molecules/TaskStatusBadge.tsx`,
  `apps/web/src/components/ui/organisms/myTasks/__tests__/TestCaseImportWizardModal.test.tsx` — lint fixes.
- `docs/plans/BACKLOG_AND_LINT_HYGIENE_PLAN.md`, this report, and the quality manifest.

## Validation

- `npm run lint` — 0 errors, 17 warnings.
- `npm run typecheck` — passed (contracts, api, web).
- `npm --prefix apps/web test` — 108 files, 595 tests passed, 0 failed.
- `npm --prefix apps/api run db:migrate:test` then `test:integration` (PostgreSQL 16) — 477 passed,
  0 failed, 0 skipped, 0 cancelled.
- `npm --prefix apps/web run build` — passed.
- `npm run validate` and `npm run quality:check` — see PR CI.

## Risks or follow-up

- New tasks: `react-hooks/exhaustive-deps` (10) and `react-refresh/only-export-components` (7).

## Human decision summary

Candidate ready for review; merge requires the Owner.

## TODO update

- `APPROVAL-WINDOW-V1` → `Done` (archived). `BACKLOG-AND-LINT-HYGIENE` → `Done` (archived).
