# Backlog and Lint Hygiene Plan

**Status:** Implemented — candidate ready for review
**Task:** `BACKLOG-AND-LINT-HYGIENE`
**Policy boundaries:** `DOC-003`, `DOC-004`, `AI-013`
**Baseline:** `origin/main` `12506f2` (2026-10-02)

## Goal

Close the only `Done locally` backlog item with primary evidence, and remove lint warnings that can
be fixed without changing behavior.

## Confirmed facts

- `APPROVAL-WINDOW-V1` is marked `Done locally` and says no commit, push, or PR exists. Its change
  was published by `88cb3e8` and merged through PR #11 (`28d4990`); ADR-025 is Accepted, the stop
  conditions are in Agent Guidelines §2A.A.1 and `AI-013`, and CI `verify` passes on `main`.
- `npm run lint` reports 0 errors and 38 warnings: 15 `no-useless-escape`, 4 `no-empty`,
  2 `no-useless-assignment`, 10 `react-hooks/exhaustive-deps`, and 7
  `react-refresh/only-export-components`.

## Scope and acceptance criteria

| AC                                                                                                                            | Evidence                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `APPROVAL-WINDOW-V1` is `Done` with publication evidence and moved to the archive.                                            | Diff review; Active work has no `Done` or `Done locally`.  |
| The 21 behavior-neutral warnings are removed; no new warning or error appears.                                                | `npm run lint`: 0 errors, 17 warnings.                     |
| Escapes removed only where the string or regex is identical; empty `catch` blocks keep the same control flow and explain why. | Diff review; affected parser and realtime tests.           |
| No regression in web, API, contracts, or build.                                                                               | `npm run validate`, web tests, API integration, web build. |

Deferred on purpose: `react-hooks/exhaustive-deps` (can change fetch timing or cause loops) and
`react-refresh/only-export-components` (requires moving exports between files). Each needs its own
reviewed task.

## Approval Window (ADR-025)

- **Approved by:** repository Owner in the agent conversation on 2026-10-02 ("bisa kamu selesaikan").
- **Allowed files:** `TODO.md`, `docs/archive/TODO_COMPLETED_2026-10-02.md`, this plan, the report
  `docs/reports/BACKLOG_AND_LINT_HYGIENE_2026-10-02.md`, `quality/manifests/BACKLOG-AND-LINT-HYGIENE.json`,
  and the six source files listed in the report.
- **Allowed state changes:** edit these files, run declared checks, prepare commits on the
  non-protected branch `chore/backlog-and-lint-hygiene`, and prepare a pull request into `main`.
- **Not allowed:** merge to `main`, policy/ADR changes, data, roles, dependencies, deployment.
- **Expiry:** 2026-10-09.

## Impact

UI and API behavior: unchanged (string and regex values are identical; `catch` blocks still
swallow the same errors). Data, migration, contracts, authorization, release: `N/A`.

## Recovery

`git revert` the commit.
