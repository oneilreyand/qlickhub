# Timeline Capacity V2 Plan

**Status:** Active — implementation approved
**Task:** `TIMELINE-CAPACITY-V2`
**Policy boundaries:** `AUTH-001`, `AUTH-002`, `AUTH-011`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-001`, `DOC-003`, `DOC-004`

## Confirmed facts

- The current service queries every Workspace member, so Owner, Admin, and PO appear in the default
  Timeline even though the role filter only offers Developer and QA.
- The default Timeline does not constrain `TaskModel.status`, although the UI labels the default
  filter as active work. Terminal work can therefore affect visible counts.
- A scheduled bar is returned only when both dates overlap the selected range. There is no response
  count explaining active scheduled work outside the range.
- The existing Timeline response is intentionally a small bar projection. The modal never requests
  the existing authenticated Task detail endpoint, so it cannot show description or navigable Task
  context.
- `DateRangePicker` already exists in the Atomic Design system and must be reused.
- ADR-023 defines the approved product semantics. The local Workspace data still requires an
  authenticated read-only comparison during verification; no local data is assumed in implementation.

## V2.1 UI audit scope

The owner approved a bounded UI-quality extension on 2026-09-30 after audit found that the Timeline
used seven controls in a six-column filter grid and duplicated the visible range. The shared
`Button` small size (40px), shared `IconButton` small size (36px), and several DateRangePicker
controls were also below the canonical 44px touch target. The DateRangePicker hand-coded control
family instead of using the existing atoms, lacked ordered-range feedback, and did not restore
keyboard focus when its popover closed.

This extension will:

1. make every Button and IconButton size meet the 44px minimum without creating Timeline-only
   exceptions;
2. refactor DateRangePicker around the shared atoms, responsive popover bounds, ordered-range
   feedback, and focus return;
3. place the range control in the Timeline toolbar and retain exactly five data filters in the
   filter grid; and
4. add focused atom/molecule/Timeline regression coverage before responsive UAT.

## Work Readiness Assessment

| Dimension           |       Score | Basis                                                                                         |
| ------------------- | ----------: | --------------------------------------------------------------------------------------------- |
| Requirement clarity |           1 | Delivery-role rows, active-work default, detail, and range visibility are explicitly decided. |
| Affected layers     |           3 | Contract, Express/Sequelize service, React UI, and documentation.                             |
| Data/migration      |           0 | Existing task and membership relations are read only.                                         |
| Authorization       |           1 | Detail uses existing authenticated read; cross-workspace redaction remains backend-owned.     |
| Shared contract     |           2 | Timeline summary gains explicit outside-window counts.                                        |
| Coupling            |           2 | Member roles, task status, range categories, UI projection, and Task detail must agree.       |
| Validation          |           2 | PostgreSQL API integration, contract, UI, responsive manual recheck, and build are required.  |
| External dependency |           0 | No vendor or deployment configuration changes.                                                |
| **Total**           | **11 / 16** | **Medium-high — ready as one bounded vertical slice.**                                        |

## Acceptance criteria and objective evidence

| Acceptance criterion                                                           | Evidence                                                                                    |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Only Developer and QA memberships form default Timeline rows.                  | PostgreSQL API test seeds every role and asserts only delivery rows.                        |
| Active Developer/QA Subtasks appear once in the right category.                | PostgreSQL API test seeds in-range, unscheduled, outside-range, done, and canceled records. |
| Terminal Subtasks never inflate active counts.                                 | API assertions prove `done` and `canceled` exclusion.                                       |
| The UI exposes custom date range and explains outside-range work.              | Focused UI interaction tests.                                                               |
| Selecting a local bar loads authenticated Task detail and links to Task Hub.   | Focused UI success/loading/error tests using the existing task service seam.                |
| Protected cross-Workspace bars remain redacted and do not request task detail. | API redaction test and UI test.                                                             |
| Existing role/membership, privacy, and schedule rules remain intact.           | Existing capacity integration suite plus typecheck, build, docs, and quality checks.        |

## Change Impact Map

`Workspace membership + Subtask persistence → CapacityService canonical categorisation → timeline contract → capacity adapter → TeamCapacityTimeline → authenticated Task quick detail / Task Hub`

| Boundary                  | Intended change                                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------------------------- |
| Product policy            | ADR-023 and Feature Card define delivery capacity and terminal-work semantics.                           |
| Contract                  | Add explicit outside-window counts to the Timeline response.                                             |
| Backend                   | Restrict default rows to delivery roles, filter active subtasks, and categorise every active subtask.    |
| Frontend                  | Reuse DateRangePicker, present category counts, fetch local detail lazily, and keep privacy-safe states. |
| Persistence/authorization | No schema or permission mutation; existing authenticated Task read and `AUTH-011` apply.                 |

## Decision Snapshot

| Alternative                                      | Decision | Reason                                                                                            |
| ------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------- |
| Backend-owned delivery capacity with lazy detail | Selected | One canonical result, clear availability signal, bounded response data, and privacy preservation. |
| Hide Owner/PO only in UI                         | Rejected | API would remain misleading and other consumers could reproduce the defect.                       |
| Include every Task field in every Timeline item  | Rejected | Enlarges a high-frequency response and broadens exposure unnecessarily.                           |
| Keep terminal work in active default             | Rejected | Completed/canceled delivery is not current capacity demand.                                       |

## Likely files

1. `TODO.md`
2. `docs/adr/README.md`
3. `docs/adr/ADR-023-DELIVERY-CAPACITY-TIMELINE.md`
4. `docs/features/WORKLOAD_CONFLICT_AND_TEAM_TIMELINE.md`
5. `docs/plans/TIMELINE_CAPACITY_V2_PLAN.md`
6. `packages/contracts/src/capacity.ts`
7. `packages/contracts/src/contracts.test.ts`
8. `apps/api/src/modules/capacity/capacityService.ts`
9. `apps/api/src/modules/capacity/__tests__/capacityApiIntegration.test.ts`
10. `apps/web/src/components/ui/organisms/TeamCapacityTimeline.tsx`
11. `apps/web/src/components/ui/atoms/Button.tsx`
12. `apps/web/src/components/ui/atoms/IconButton.tsx`
13. `apps/web/src/components/ui/atoms/__tests__/Button.test.tsx`
14. `apps/web/src/components/ui/atoms/__tests__/IconButton.test.tsx`
15. `apps/web/src/components/ui/molecules/DateRangePicker.tsx`
16. `apps/web/src/components/ui/molecules/__tests__/DateRangePicker.test.tsx`
17. `apps/web/src/components/ui/organisms/__tests__/TeamCapacityTimeline.test.tsx`
18. `apps/web/src/lib/api/__tests__/capacityService.test.ts`
19. `docs/reports/TIMELINE_CAPACITY_V2_2026-09-30.md`
20. `quality/manifests/TIMELINE-CAPACITY-V2.json`

## Validation and recovery

Use a disposable PostgreSQL test database for API proof, focused contract and UI tests, typecheck,
build, `npm run docs:check`, and `npm run quality:check`. Recheck the signed-in local Timeline at
phone, tablet, and desktop widths using a Developer with two active tasks. Recovery is a single
revert; no data migration or record recovery is required.
