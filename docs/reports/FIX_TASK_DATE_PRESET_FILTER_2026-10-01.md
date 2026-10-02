## Task

`FIX-TASK-DATE-PRESET-FILTER`: repair the `this_week` Task date preset so a scheduled Task that
overlaps the current week is returned reliably.

## Root cause and outcome

The existing weekly boundary calculation mutated one `Date` instance while deriving Monday and then
used a day-of-month delta from the original date to derive Sunday. This could produce a week end
that was not the Sunday of the same UTC calendar week, excluding a Task that correctly overlapped
the current week.

The query now derives Monday and Sunday from independent UTC `Date` values, matching the UTC
`YYYY-MM-DD` persistence and overlap predicate. The test names the `this_week` and `this_month`
assertions separately, so a future failure identifies the affected preset immediately.

## Work assurance

- **WRA:** 5/16, low-risk bounded backend-query repair. No schema, contract, authorization,
  migration, deployment, dependency, or production-data change.
- **Approval:** GitHub Owner record [#5923195599](https://github.com/oneilreyand/qlickhub/issues/1#issuecomment-5923195599)
  was verified against task ID, plan digest, PR base `e7c4041418edf16c0a532e6e5def0f4a7c06ed8d`,
  expiry, exact six-file scope, preserved roles, and allowed state changes.
- **Reproduction before the fix:** `NODE_ENV=test node --test dist/modules/tasks/__tests__/taskApiIntegration.test.js`
  failed locally in the same `this_week` assertion as CI: 29 leaf tests passed and 1 failed.
- **Regression evidence after the fix:** the same authenticated PostgreSQL suite passed 30/30 leaf
  tests, including `today`, `this_week`, `this_month`, `overdue`, and explicit date-range filtering.
- **Build evidence:** `npm --prefix apps/api run build` passed before the repaired integration run.
- **Final local checks:** `npm run typecheck` passed for contracts, API, and web; `npm run docs:check`
  passed 8/8; `npm run quality:check` completed with evidence coverage; and `git diff --check`
  passed.
- **Impact map:** `Task list query -> calendar preset range -> Sequelize overlap predicate ->
authenticated Task list -> Task Hub views`.
- **Quality review:** no duplicate date filter, UI-only workaround, new query, index, migration, or
  authorization path was introduced. The existing inclusive overlap predicate and API shape remain
  canonical.

## Validation pending at this record point

- CI and independent review remain external follow-up; no merge is claimed.

## TODO update

- `FIX-TASK-DATE-PRESET-FILTER` remains `In progress` until final local checks and PR CI complete.
