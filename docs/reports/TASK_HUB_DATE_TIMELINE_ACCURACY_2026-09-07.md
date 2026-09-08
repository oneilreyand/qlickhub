# Agent Report — Task Hub date and timeline accuracy

## Task

`TASK-HUB-DATE-TIMELINE-ACCURACY`: align date views with persisted schedule intervals and show
planned-versus-late execution in the Task Hub timeline.

## Outcome

Task Hub Today, This Week, This Month, and explicit two-sided date ranges now include scheduled Tasks
whose persisted Start/Due interval overlaps the selected window. Overdue remains limited to open Tasks
whose Due Date is before today, excluding Done and Canceled records.

Timeline now has explicit Day, Week, and Month navigation, a visible date-window label, and a legend.
Each scheduled Task/Subtask keeps its planned bar through Due Date. When an open item is past Due Date,
the bar gains a lower-opacity delay extension through today. When a Done item has a later persisted
`completedAt`, the extension reaches its completion date. Delay extensions have accessible labels and
are not rendered for on-time, unscheduled, or canceled items.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, and
  `docs/features/TASK_HUB_DATE_TIMELINE_ACCURACY.md`.
- **Policy IDs:** `FLOW-004`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`,
  `DOC-003`, `DOC-004`.
- **Data/interface impact:** No schema, migration, persisted-record, response-shape, or shared-contract
  change. The existing Task list query now applies inclusive schedule-window overlap for calendar/range
  filters; the existing Task fields drive the visual delay extension.
- **Authorization impact:** None. Existing Workspace membership, role, folder, root-task, and assignee
  scoping remain authoritative.
- **Migration risk:** None.

## Changed files

- `apps/api/src/modules/tasks/internal/taskQuery.ts` — applies schedule interval overlap for Today,
  Week, Month, and explicit ranges while preserving Overdue semantics.
- `apps/api/src/modules/tasks/__tests__/taskApiIntegration.test.ts` — adds persisted PostgreSQL
  regressions for schedules spanning Today and explicit ranges.
- `apps/web/src/components/ui/organisms/TaskTimelineView.tsx` — adds clipped planned/late segments,
  completion/today extension logic, scale navigation, range label, legend, and responsive sizing.
- `apps/web/src/components/ui/organisms/__tests__/TaskTimelineView.test.tsx` — verifies Day/Week/Month
  navigation and open/completed delay extensions, including accessible labels.
- `docs/features/TASK_HUB_DATE_TIMELINE_ACCURACY.md` — records requirements, contracts, UI states,
  authorization, and traceability.
- `TODO.md` — claims and closes the Task Hub accuracy item.

## Validation

- Production browser reproduction — the persisted Task `2026-09-07 → 2026-09-11` returned `0` items
  under Today before the fix because the API matched only `dueDate`; the same record appeared in the
  unfiltered/week timeline. No production data was changed.
- Regression before fix — PostgreSQL assertions for a schedule spanning Today and an explicit range
  failed as expected; the component delay-extension assertion failed as expected.
- `NODE_ENV=test node --test --test-name-pattern='Date Filtering' apps/api/dist/modules/tasks/__tests__/taskApiIntegration.test.js`
  after `npm run build --workspace=@qlick/api` — 2/2 passed against PostgreSQL test database.
- `npm test --workspace=@qlick/web -- src/components/ui/organisms/__tests__/TaskTimelineView.test.tsx`
  — 8/8 passed.
- `npm test --workspace=@qlick/web` — 344/345 passed across 71 files. One unrelated pre-existing
  `UserFlowGuide` simulator test timed out at its 5-second limit; all Task Timeline tests passed.
- `npm run build --workspace=@qlick/web` — passed; Vite transformed 1,697 modules.
- `npm run build` — passed for contracts, API, and web; Vite transformed 1,697 modules.
- `npm run typecheck --workspace=@qlick/web` and `npm run typecheck --workspace=@qlick/api` — passed.
- `npm run build --workspace=@qlick/contracts && node --test packages/contracts/dist/contracts.test.js`
  — 61/61 passed. The direct `tsx` wrapper was unavailable in the sandbox due an IPC `EPERM`, so the
  built contract test was used.
- `npm run docs:check` — 5/5 governance tests passed.
- `npx eslint` on changed API/UI files — passed with no errors.
- `git diff --check` — passed.
- Browser visual QA — desktop and 390×844 mobile views showed the range label, Day/Week/Month controls,
  Planned/Delay legend, horizontal Gantt canvas, and no new vertical layout break. Temporary viewport
  override was reset and the temporary API process was stopped.

## Risks or follow-up

- The Workspace model has no explicit timezone field. This change intentionally preserves the existing
  server calendar reference and addresses the reproduced interval-overlap defect. A timezone policy
  should be a separate product decision before changing the date boundary source.
- Full API integration could not be rerun after the focused pass because the environment denied another
  PostgreSQL approval request at the usage limit. The focused PostgreSQL regression and API typecheck/build
  passed.

## TODO update

- `TASK-HUB-DATE-TIMELINE-ACCURACY` → `Done`.
