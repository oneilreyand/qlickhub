# DOC-ENTRY-AND-BACKLOG-HYGIENE — 2026-10-02

## Task

`DOC-ENTRY-AND-BACKLOG-HYGIENE` — plan:
[DOC_ENTRY_AND_BACKLOG_HYGIENE_PLAN](../plans/DOC_ENTRY_AND_BACKLOG_HYGIENE_PLAN.md).

## Outcome

- Root `README.md` now starts from the Product Knowledge Map, keeps the four SSoT documents, and
  links the Policy Registry, ADR, Feature, plan, and report indexes as non-policy navigation.
- `apps/web/README.md` documents the current stack, `src/` structure, configuration, and scripts.
- 179 `Done` items moved from `TODO.md` Active work to
  [`TODO_COMPLETED_2026-10-02`](../archive/TODO_COMPLETED_2026-10-02.md); Active work now holds 12
  items (7 `In progress`, 4 `Blocked`, 1 `Done locally`, the latter kept until verified).
- Supersedes PR #12, which was built on the stale baseline `c67d532`. Its ADR renumbering and ADR
  checker are already on `main` (ADR-024, `validateAdrIndex`) and are intentionally not repeated.

## Work assurance

- **Work Readiness Assessment:** 2/16, `Ready` — documentation only, objective evidence for each AC.
- **User plan approval:** Approval Window recorded in the plan (Owner, 2026-10-02).
- **Step approval log:** single Approval Window per ADR-025; no step outside it was taken.
- **Agent capability and access:** the executor worked in a fresh clone of `origin/main` at
  `0333a67` with a disposable PostgreSQL 16 database. It cannot push to GitHub, open or close pull
  requests, or merge; the Owner performs those steps.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                           | Required / achieved | Primary evidence and environment                                         | Verification status |
| -------------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------ | ------------------- |
| Root README uses the Knowledge Map entry point.                | E1 / E2             | Diff review; `docs:check` link validation of `README.md` passed.         | Accepted            |
| `apps/web/README.md` matches the app.                          | E1 / E1             | Compared with `apps/web/package.json`, `vite.config.ts`, `src/` listing. | Accepted            |
| No `Done` item in Active work; `Done locally` kept.            | E1 / E1             | Status count: 0 `Done`, 7 `In progress`, 4 `Blocked`, 1 `Done locally`.  | Accepted            |
| 179 archived items unchanged except link paths; links resolve. | E1 / E1             | Script comparison identical; 104 links rewritten; 0 unresolved.          | Accepted            |
| `npm run validate` passes.                                     | E2 / E2             | Clean clone, Node 22.22.0.                                               | Accepted            |

- **Change Impact Map:** documentation navigation and backlog only. Contract, data, authorization,
  UI, release, and operations: `N/A`.
- **Decision Snapshot:** redo only the parts missing from `main` instead of rebasing PR #12, because
  PR #12's ADR number collides with `main`'s ADR-023 and its checker duplicates `validateAdrIndex`.
- **Agent handoff and independent verification:** baseline `0333a67`; CI `verify` re-runs all
  checks on the pull request.
- **Quality review:** no policy text copied into READMEs; no archived item text altered; no
  duplicate checker or ADR introduced; obsolete PR #12 to be closed without merge.
- **Cross-layer quality gates:** `N/A` — no UI, data access, performance, or AI change.

## Source of truth and impact

- **Applicable SSoT:** [AGENTS.md](../../AGENTS.md), [Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md).
- **Policy IDs:** `DOC-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. **Authorization impact:** None. **Migration risk:** None.

## Changed files

- `README.md` — documentation entry section.
- `apps/web/README.md` — web application guide.
- `TODO.md` — Active work without `Done` items; archive link.
- `docs/archive/TODO_COMPLETED_2026-10-02.md` — new archive.
- `docs/plans/DOC_ENTRY_AND_BACKLOG_HYGIENE_PLAN.md` — plan and Approval Window.
- `docs/reports/DOC_ENTRY_AND_BACKLOG_HYGIENE_2026-10-02.md` — this report.

## Validation

- `npm run validate` (clean clone of `0333a67` plus this change) — passed: `docs:check` governance
  passed; lint 0 errors, 38 pre-existing warnings in untouched application code; typecheck passed.
- `npm --prefix apps/api run db:migrate:test` then `test:integration` (disposable PostgreSQL 16) —
  476 passed, 0 failed, 0 skipped, 0 cancelled.
- `npm --prefix apps/web run build` — passed.

## Risks or follow-up

- Close PR #12 without merging.
- The 38 pre-existing lint warnings can become a separate task.

## Human decision summary

Candidate ready for review. Merge into `main` requires the Owner's decision.

## TODO update

- `DOC-ENTRY-AND-BACKLOG-HYGIENE` → `Done` (archived 2026-10-02).
