# Fix Task Date Preset Filter Plan

**Status:** Implemented — fix `05acfbc` on `main`; API integration test "Filters tasks by date presets" passes (see [report](../reports/FIX_TASK_DATE_PRESET_FILTER_2026-10-01.md))
**Task:** `FIX-TASK-DATE-PRESET-FILTER`
**Policy boundaries:** `CONTRACT-001`, `DATA-001`, `TEST-001`, `DOC-003`, `DOC-004`

## Confirmed facts

- PR #9 CI and the exact local disposable-PostgreSQL Task API integration suite both fail one assertion in the date-preset test: a Task whose schedule spans today is missing from the `this_week` result.
- The failure is reproducible locally: 29 tests pass and 1 test fails in `taskApiIntegration.test.js`.
- The Timeline Capacity V2 branch does not change `apps/api/src/modules/tasks`; the failure is a pre-existing Task date-filter defect exposed by the full CI suite.
- The `this_week` code mutates its `Date` value to calculate Monday, then reuses a day-of-month delta calculated for the original date to calculate Sunday. The resulting end date is not reliably the Sunday of the same calendar week.
- ADR-007 requires complete date pairs and preserves the meaning of scheduled Task intervals. This repair must retain inclusive overlap semantics: an interval is visible when `startDate <= rangeEnd` and `dueDate >= rangeStart`.
- No schema, migration, authorization, client contract, deployment, or production data change is required.

## Work Readiness Assessment

| Dimension           |      Score | Basis                                                                                        |
| ------------------- | ---------: | -------------------------------------------------------------------------------------------- |
| Requirement clarity |          1 | CI error, local reproduction, and expected interval behavior are specific.                   |
| Affected layers     |          1 | Task-query backend helper plus integration regression coverage.                              |
| Data/migration      |          0 | Existing rows are read only; no migration.                                                   |
| Authorization       |          0 | Existing list authorization is unchanged.                                                    |
| Shared contract     |          0 | Query names and response shape are unchanged.                                                |
| Coupling            |          1 | UTC date strings and local calendar boundaries require one canonical calculation.            |
| Validation          |          2 | Existing authenticated PostgreSQL integration suite is a direct deterministic feedback loop. |
| External dependency |          0 | No vendor, credential, or deployment change.                                                 |
| **Total**           | **5 / 16** | **Low - ready as one bounded repair.**                                                       |

## Acceptance criteria and objective evidence

| Acceptance criterion                                                                         | Evidence                                                                               |
| -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| A Task interval spanning the current day is returned by the `today` and `this_week` presets. | The existing authenticated PostgreSQL integration test asserts both returned IDs.      |
| The weekly boundary is Monday through Sunday without mutation-dependent date arithmetic.     | A regression assertion covers a scheduled Task spanning the tested week.               |
| `this_month`, `overdue`, and explicit range filtering keep their existing behavior.          | The same integration test and its adjacent explicit-range test pass.                   |
| No API shape, RBAC, migration, or production data behavior changes.                          | Code review, integration evidence, typecheck, build, docs check, and quality manifest. |

## Change Impact Map

`Task list query -> calendar preset range -> Sequelize overlap predicate -> authenticated Task list -> Task Hub views`

| Boundary                           | Intended change                                                                             |
| ---------------------------------- | ------------------------------------------------------------------------------------------- |
| Backend query helper               | Calculate week boundaries from independent Date values without mutating the reference date. |
| Regression evidence                | Make the current failure explicit and preserve inclusive interval behavior.                 |
| Documentation and quality evidence | Record actual command results, known gaps, and exact scoped approval.                       |
| Persistence and authorization      | No change.                                                                                  |

## Decision Snapshot

| Alternative                                                     | Decision | Reason                                                                        |
| --------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| Correct the `this_week` range calculation in the backend helper | Selected | One canonical filter path for every UI consumer; preserves existing API.      |
| Loosen or remove the spanning-Task assertion                    | Rejected | It would hide a real interval-overlap regression and weaken CI.               |
| Filter calendar dates only in React                             | Rejected | It duplicates server logic and leaves non-UI consumers incorrect.             |
| Introduce a date library                                        | Rejected | A small isolated calculation does not justify a dependency or broad refactor. |

## Likely files

1. `TODO.md`
2. `apps/api/src/modules/tasks/internal/taskQuery.ts`
3. `apps/api/src/modules/tasks/__tests__/taskApiIntegration.test.ts`
4. `docs/plans/FIX_TASK_DATE_PRESET_FILTER_PLAN.md`
5. `docs/reports/FIX_TASK_DATE_PRESET_FILTER_2026-10-01.md`
6. `quality/manifests/FIX-TASK-DATE-PRESET-FILTER.json`

## Bounded state changes

1. Record the task as in progress and add the plan, report, and evidence manifest.
2. Replace mutation-dependent weekly date arithmetic with an equivalent non-mutating Monday-through-Sunday calculation.
3. Add or sharpen regression coverage only at the existing authenticated PostgreSQL Task API integration seam.
4. Run the affected integration suite, typecheck/build where applicable, documentation check, quality check, and diff check.
5. Commit and push only after a separately approved GitHub Owner record validates this exact file list. No migration, authorization mutation, deployment, merge, or production-data operation is allowed.
