# Documentation Entry and Backlog Hygiene Plan

**Status:** Implemented — candidate ready for review
**Task:** `DOC-ENTRY-AND-BACKLOG-HYGIENE`
**Policy boundaries:** `DOC-001`, `DOC-003`, `DOC-004`
**Baseline:** `origin/main` `0333a67` (2026-10-02)
**Supersedes:** PR #12 / `DOC-CONSISTENCY-REMEDIATION` (built on stale baseline `c67d532`)

## Goal

Make the repository entry documents and active backlog match the current governance without
re-doing work already on `main`.

## Confirmed facts

- `main` already renumbered the Workload Conflict ADR to ADR-024 (`88cb3e8`) and enforces ADR
  uniqueness/indexing in `docs:check` (`validateAdrIndex`). PR #12 would reintroduce a duplicate
  ADR-023 and a second checker, so neither change is repeated here.
- Root `README.md` still describes "4 core SSoT pillars" and omits the mandatory Knowledge Map
  entry point required by `AGENTS.md` (`DOC-001`).
- `apps/web/README.md` still says "Source code will live under `src/`".
- `TODO.md` states it contains only unfinished work, yet Active work holds 179 `Done` items next to
  12 open items (7 `In progress`, 4 `Blocked`, 1 `Done locally`).

## Scope and acceptance criteria

| AC                                                                                              | Evidence                                               |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Root README names the Knowledge Map as entry point and links supporting indexes without policy. | Diff review; `docs:check` link validation.             |
| `apps/web/README.md` matches `apps/web/package.json`, `vite.config.ts`, and `src/` folders.     | Diff review against those files.                       |
| Active work contains no `Done` item; `Done locally` stays until verified.                       | Status count of Active work.                           |
| 179 archived items keep their text and order; every relative link still resolves.               | Script comparison (link targets excluded) + link scan. |
| `npm run validate` passes.                                                                      | Command output in the report.                          |

## Approval Window (ADR-025)

- **Approved by:** repository Owner in the agent conversation on 2026-10-02 ("selesaikan semua").
- **Allowed files:** `README.md`, `apps/web/README.md`, `TODO.md`,
  `docs/archive/TODO_COMPLETED_2026-10-02.md`, this plan, and
  `docs/reports/DOC_ENTRY_AND_BACKLOG_HYGIENE_2026-10-02.md`.
- **Allowed state changes:** edit the files above, run declared checks, prepare one commit on the
  non-protected branch `docs/entry-and-backlog-hygiene`, and prepare a pull request into `main`.
- **Not allowed:** merge to `main`, ADR/policy/SSoT changes, application code, data, roles,
  deployment.
- **Expiry:** 2026-10-09.

## Impact

Data, migration, API contract, authorization, UI, and release: `N/A` — documentation only.

## Recovery

`git revert` the single commit. The archive is additive; reverting restores the previous
`TODO.md`.
