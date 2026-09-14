# Agent Report — Role Timeline Calendar

## Task

ROLE-TIMELINE-CALENDAR

## Outcome

The stale visual-validation blocker is closed. The Role Timeline presents persisted Subtask schedules
on a full calendar-style Gantt grid with month and day headers, role filters, handoff health, a Today
marker, and an internally scrollable mobile layout. User-facing timeline and schedule-health labels are
now consistently Indonesian.

Authenticated read-only Production QA confirmed the calendar with one persisted, scheduled QA
Subtask at desktop and mobile widths in light and dark modes. No Production record was created,
changed, or deleted.

## Source of truth and impact

- **Applicable SSoT:** [Workflow timeline completeness](../2_WORKFLOW_AND_ROLES.md#aturan-transisi-subtask),
  [Atomic UI inventory](../3_UI_ATOMIC_DESIGN_SYSTEM.md), and
  [test-evidence rules](../4_AGENT_DEV_GUIDELINES.md#3-kebijakan-basis-data--bukti-pengujian-database--test-evidence).
- **Policy IDs:** `FLOW-004`, `DATA-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. The component reads the existing persisted Task/Subtask contract;
  no request or response shape changed.
- **Authorization impact:** None. Existing authenticated Task-detail access remains authoritative.
- **Migration risk:** None. No schema or migration changed or ran.

## Changed files

- `apps/web/src/components/ui/molecules/SubtaskRoleTimeline.tsx` — makes Role Timeline labels,
  statuses, legend, column headings, and accessible calendar name consistently Indonesian.
- `apps/web/src/lib/utils/scheduleHealth.ts` — localizes role-stage and bottleneck copy supplied to
  the timeline.
- `apps/web/src/components/ui/molecules/__tests__/SubtaskRoleTimeline.test.tsx` — updates and expands
  regression coverage for the localized calendar contract.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — scopes the Subtask-tab
  assertion to its accessible role and exact name, avoiding collisions with timeline condition copy.
- `TODO.md` — closes the stale visual-validation blocker with current evidence.
- `docs/reports/ROLE_TIMELINE_CALENDAR_2026-09-14.md` — records scope, evidence, and known limits.

## Validation

- Authenticated read-only Production visual QA at `1440 × 1200` — passed with the handoff pipeline,
  role filters, month/day headers, Today marker, and scheduled QA bar visible without clipping.
- Authenticated read-only Production visual QA at `390 × 844` — passed. The document stayed at
  `clientWidth=390` and `scrollWidth=390`; the calendar scroller contained its wider grid at
  `clientWidth=356`, `scrollWidth=976`, and reached `scrollLeft=620`.
- Production light/dark-mode inspection — passed; text and schedule states remained readable.
- Production browser console inspection after QA — passed with 0 warnings and 0 errors.
- `npm --prefix apps/web run test -- src/components/ui/molecules/__tests__/SubtaskRoleTimeline.test.tsx src/lib/utils/__tests__/scheduleHealth.test.ts src/components/ui/organisms/__tests__/SubtaskList.test.tsx src/components/ui/organisms/__tests__/TaskTimelineView.test.tsx`
  — passed 4/4 files and 20/20 tests before the copy-only localization remediation.
- Final focused run covering Role Timeline, schedule health, Subtask list integration, and Task Detail
  — passed 4/4 files and 51/51 tests after localization and the tightened tab assertion, with
  0 failed and 0 skipped.
- `npm --prefix apps/web run test -- --reporter=dot` — passed 85/85 files and 445/445 tests, with
  0 failed and 0 skipped. Existing non-failing React `act(...)` warnings remain in unrelated tests.
- `npm --prefix apps/web run build` — passed TypeScript compilation and Vite Production build;
  1,708 modules transformed.
- Targeted ESLint for the five changed frontend source/test files — passed with 0 errors and
  0 warnings.
- Static search for the replaced English runtime labels — passed with no matches.
- `npm run validate` — passed documentation checks 5/5 and contracts/API/web typechecks; repository
  lint reported 0 errors and 22 pre-existing warnings.
- `git diff --check` — passed after the final report and TODO updates.

## Risks or follow-up

- Production visual QA covered one persisted scheduled QA Subtask. The component test covers a
  denser three-Subtask calendar across Backend, Frontend, and QA, including overlap and late states.
- The localized copy is verified by component/full-suite tests and build but requires the next web
  release before it appears in Production.
- No PostgreSQL integration suite was rerun for this presentation-only change. The read-only
  Production check confirmed the UI consumes an authenticated persisted schedule, and no backend
  contract or persistence path changed.

## TODO update

- ROLE-TIMELINE-CALENDAR → Done
