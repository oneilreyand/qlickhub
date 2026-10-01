## Task

`TIMELINE-CAPACITY-V2`: make the Timeline a reliable delivery-capacity view for Developer and QA.

## Outcome

The Timeline now treats capacity as active delivery work rather than a list of every Workspace
membership. Default rows are Developer and QA members, including members with no current work.
Only active Subtasks are counted. Each member now distinguishes scheduled work inside the selected
interval, active work without dates, and active scheduled work outside that interval. Selecting a
non-redacted item loads its current authenticated Task detail on demand and links to the existing
Task deep-link route. Redacted cross-Workspace work never triggers that detail request.

The approved V2.1 UI extension also corrects the Date Picker and shared button atoms: compact
actions now meet the 44px touch-target contract, the Date Picker uses shared Button/IconButton
atoms, validates ordered dates before apply, restores keyboard focus after dismissal, and bounds its
popover for narrow viewports. The Timeline places date selection in its toolbar and leaves exactly
five data filters in its filter grid.

## Work assurance

- **Work Readiness Assessment:** 12/16, `Ready as one bounded vertical slice`. Contract, API,
  React, shared UI atoms, documentation, and PostgreSQL evidence were required; no migration or
  new authorization boundary was introduced.
- **User plan approval:** the owner approved the Timeline Capacity V2 implementation approach in
  this task on 2026-09-30 (`ok kerjakan`) and the V2.1 UI extension (`setuju`). The scoped GitHub
  Owner approval is recorded as manifest version 2 at
  `https://github.com/oneilreyand/qlickhub/issues/1#issuecomment-5922390775`; it was verified
  against the task ID, plan digest, baseline, exact file list, role scope, state-change scope, and
  expiry on 2026-10-01.
- **Step approval log:** the approved plan covered the TODO claim, ADR/Feature Card/plan, contract,
  backend, React, tests, formatting, and local validation. No production data, deployment, external
  message, push, pull request, or merge was performed.
- **Agent capability and access:** the executor inspected SSoT and current code, edited the local
  branch, and ran component, contract, build, and disposable PostgreSQL integration checks. It did
  not have a signed-in local user session and did not bypass login, inspect credentials, or alter
  user data.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                                                                              | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                              | Verification status |
| ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------- | ------------------- |
| Default rows contain Developer and QA, not Owner/Admin/PO.                                                        | E3 / E3                                    | Authenticated PostgreSQL HTTP integration, Timeline capacity suite.                           | Accepted            |
| Active scheduled, unscheduled, and outside-window work are categorised once; done/canceled do not inflate counts. | E3 / E3                                    | Authenticated PostgreSQL HTTP integration with persisted records in every category.           | Accepted            |
| A custom date interval is usable in the Timeline UI.                                                              | E2 / E2                                    | Focused React tests for `TeamCapacityTimeline` and shared `DateRangePicker`.                  | Accepted            |
| Date Picker and compact actions meet the shared touch, focus, error, and layout contract.                         | E2 / E2                                    | Focused Button, IconButton, DateRangePicker, and Timeline React tests.                        | Accepted            |
| Selecting a permitted Task shows useful current detail and a Task Hub route.                                      | E2 / E2                                    | Focused React detail-loading and deep-link assertion.                                         | Accepted            |
| Cross-Workspace protected work remains redacted with no detail fetch.                                             | E3 / E3                                    | Existing authenticated capacity integration redaction coverage plus component redaction test. | Accepted            |
| Local Workspace data and responsive UI match the owner's reported scenario.                                       | E4 / E2                                    | Signed-in Owner/PO UAT at phone, tablet, and desktop remains unavailable.                     | Accepted with gap   |

- **Evidence outcomes:** contract suite passed 81/81; initial focused web suite passed 10/10; the
  V2.1 UI regression suite passed 12/12; focused
  authenticated PostgreSQL capacity suite passed 10/10; full API suite build-and-test command passed
  after rebuilding the changed contracts package. The initial API test build correctly surfaced stale
  generated contract declarations; rebuilding `@qlick/contracts` resolved that environment artifact,
  then the focused integration test passed. No test was skipped, weakened, or removed.
- **Change Impact Map:** `Workspace membership + persisted Subtasks → CapacityService → shared
Timeline contract → frontend capacity adapter → TeamCapacityTimeline → authenticated Task detail
/ Task deep link`. No persistence schema, role authority, migration, or deployment path changes.
- **Decision Snapshot:** backend-owned delivery roles and active-status filtering were selected over
  React-only filtering, preventing consumer drift. A lightweight projection plus lazy detail read was
  selected over embedding full Task records in each Timeline bar, preserving response size and the
  existing authorization boundary. A count, not out-of-range item details, was selected for work
  outside the current interval.
- **Agent handoff and independent verification:** baseline is `e7c4041418edf16c0a532e6e5def0f4a7c06ed8d`.
  Executor: Codex. Primary evidence is recorded above. The scoped Owner manifest approval is
  verified; independent GitHub review/CI remains pending and is not claimed by this report.
- **Quality review:** reuse is confirmed for `Button`, `IconButton`, `DateRangePicker`, `Modal`,
  `Alert`, `Skeleton`, `TaskStatusBadge`, the capacity adapter, and the authenticated `taskService`.
  No parallel calculation was added to React; no duplicate query, obsolete code, or unused new
  component was found. Shared atoms now enforce the canonical touch target; DateRangePicker owns
  its focus, ordered-range, and responsive popover interaction rather than each consumer recreating
  it. The detail fetch is click-triggered, so it avoids an initial-load N+1 pattern.
- **Cross-layer quality gates:** Atomic composition was strengthened: the Timeline uses the shared
  DateRangePicker in its toolbar; the picker uses shared Button/IconButton atoms. Component tests
  cover touch-target classes, responsive bounds, keyboard focus return, range errors, loading,
  error/retry, redaction, and empty data paths. Database access uses the existing two Timeline reads
  and performs interval categorisation in memory; no new relation, index, raw SQL, or N+1 list
  query was added.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, and
  `docs/features/WORKLOAD_CONFLICT_AND_TEAM_TIMELINE.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-011`, `DATA-001`, `CONTRACT-001`, `UI-001`,
  `UI-002`, `TEST-001`, `DOC-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** the Timeline response adds `outsideWindowSubtaskCount` per member and
  `totalOutsideWindowSubtasks` in the aggregate. Timeline query role/status filters now accept only
  delivery roles and active statuses. No stored schema changes.
- **Authorization impact:** read authorization is unchanged. The backend remains canonical for
  row inclusion and `AUTH-011` redaction; protected bars do not request Task details.
- **Migration risk:** none; the change is read-model and contract-only.

## Changed files

- `packages/contracts/src/capacity.ts` and `packages/contracts/src/contracts.test.ts` — express and
  prove delivery-only filters and the outside-window response counts.
- `apps/api/src/modules/capacity/capacityService.ts` and its integration test — enforce canonical
  capacity semantics over persisted Workspace members and Subtasks.
- `apps/web/src/components/ui/atoms/Button.tsx`, `IconButton.tsx`, and their tests — enforce the
  canonical 44px compact touch target for every consumer.
- `apps/web/src/components/ui/organisms/TeamCapacityTimeline.tsx` and test — present the three
  workload categories, keep date selection in the toolbar, retain five filters, and load detail
  safely on selection.
- `apps/web/src/components/ui/molecules/DateRangePicker.tsx` and test — use shared action atoms,
  label date inputs, reject reversed ranges, restore focus, and bound the mobile popover.
- `apps/web/src/lib/api/capacityService.ts` — aligns the frontend adapter type with active Timeline
  statuses; its existing response-adapter fixture now includes the additive aggregate field.
- `docs/adr/ADR-023-DELIVERY-CAPACITY-TIMELINE.md`, Feature Card, plan, TODO, and manifest — record
  the approved product semantics and evidence boundary.

## Validation

- `npm --prefix packages/contracts run test` — 81 passed, 0 failed, 0 skipped.
- `npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/TeamCapacityTimeline.test.tsx src/components/ui/molecules/__tests__/DateRangePicker.test.tsx` — 2 files, 8 passed, 0 failed, 0 skipped.
- `npm --prefix apps/web run test -- src/components/ui/atoms/__tests__/Button.test.tsx src/components/ui/atoms/__tests__/IconButton.test.tsx src/components/ui/molecules/__tests__/DateRangePicker.test.tsx src/components/ui/organisms/__tests__/TeamCapacityTimeline.test.tsx` — 4 files, 12 passed, 0 failed, 0 skipped.
- `npm --prefix packages/contracts run build` — passed.
- `npm --prefix apps/api run test` — exit 0 after API TypeScript build. The runner's complete
  aggregate was longer than the captured terminal output; the exact focused Timeline result is
  recorded separately below rather than inferred.
- `NODE_ENV=test node --test dist/modules/capacity/__tests__/capacityApiIntegration.test.js` — 10
  passed, 0 failed, 0 skipped, disposable PostgreSQL plus authenticated HTTP interfaces.
- `npm run docs:check` — 8 passed, 0 failed, 0 skipped; documentation governance passed.
- `npm run quality:check` — 21 changed files, inferred `performance` and `ui`; evidence coverage
  complete in report mode.
- `npm run typecheck` — contracts, API, and web passed with 0 TypeScript errors.
- `npm run build` — contracts and API compiled; web production build passed with 1,722 transformed
  modules.
- `git diff --check` — passed.
- Signed-in responsive UAT — pending user session.

## Risks or follow-up

- The reported local “two Developer tasks” scenario still needs an authenticated Owner/PO visual
  recheck. This is a UAT gap only; the same category logic is proven through persisted PostgreSQL
  records.
- The branch is stacked on the unmerged schedule-adapter PR. Its future PR should target that branch
  until PR #8 merges, then be retargeted to `main`; no push has occurred.

## Human decision summary

The capacity view now has a precise operational meaning: active delivery workload for Developer and
QA, rather than governance membership or completed history. The scoped GitHub approval record is
verified. The remaining human validation is an authenticated visual UAT; it is not being inferred
from this report.

## TODO update

- `TIMELINE-CAPACITY-V2` → `In progress` until final checks and independent review are complete.
