# Agent Report — Task Hub timeline UX alignment

## Task

`TASK-HUB-TIMELINE-UX-ALIGNMENT`: clarify the distinction between the Task Hub Feature Schedule
and the Detail Role & Handoff Timeline after a UX review found the Task Hub timeline confusing.

## Outcome

The Task Hub now labels its overview as `Feature Schedule` and explains that it shows parent Features
grouped by Folder. The Detail Subtask view now labels its focused diagnostic as `Role & Handoff
Timeline` and explains that it follows handoffs from PO through development and QA.

Calendar controls now use `Calendar zoom` and `Previous/Next calendar window` wording. Scheduled
Tasks and expanded Subtasks that fall completely outside the visible calendar window show an explicit
`Outside visible window` message instead of leaving an apparently empty row.

## Source of truth and impact

- **Applicable SSoT:** `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`,
  `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, and
  `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DOMAIN-002`, `FLOW-004`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. No API request/response, shared contract, or persisted data changed.
- **Authorization impact:** None.
- **Migration risk:** None. No schema or migration changed.

## Changed files

- `apps/web/src/components/ui/organisms/taskHub/TaskHubDatePresetBar.tsx` — clarifies the date
  filter as Feature schedule scope.
- `apps/web/src/components/ui/organisms/taskHub/TaskHubControlsBar.tsx` — renames the Task Hub
  view to Feature Schedule and adds an accessible scope description.
- `apps/web/src/components/ui/organisms/TaskTimelineView.tsx` — adds Feature Schedule context,
  clarifies calendar controls, renames the hierarchy header, and marks clipped items.
- `apps/web/src/components/ui/organisms/SubtaskList.tsx` — renames the Detail view switcher to
  Role & Handoff.
- `apps/web/src/components/ui/molecules/SubtaskRoleTimeline.tsx` — adds focused view context.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailOverviewTab.tsx` — clarifies the
  bottleneck shortcut label.
- `apps/web/src/components/ui/organisms/InteractiveGuideSimulator.tsx` — aligns guide terminology.
- `apps/web/src/components/ui/organisms/__tests__/TaskTimelineView.test.tsx` and
  `apps/web/src/components/ui/molecules/__tests__/SubtaskRoleTimeline.test.tsx` — cover the new
  labels and visible-window message.
- `TODO.md` — records lifecycle and evidence.

## Validation

- `npm test --workspace=@qlick/web -- src/components/ui/organisms/__tests__/TaskTimelineView.test.tsx src/components/ui/molecules/__tests__/SubtaskRoleTimeline.test.tsx src/components/ui/organisms/__tests__/SubtaskList.test.tsx` — passed 3 files and 20/20 tests; 0 failed or skipped.
- `npm test --workspace=@qlick/web` — passed 72 files and 357/357 tests; 0 failed or skipped. Existing React `act(...)` and nested-button warnings remain in unrelated test areas.
- `npm run typecheck --workspace=@qlick/web` — passed with 0 TypeScript errors.
- `npm run build --workspace=@qlick/web` — passed; 1,697 modules transformed and the production bundle emitted successfully.
- Targeted `npx eslint` on changed UI files — passed with 0 errors and 2 pre-existing warnings in `SubtaskRoleTimeline.tsx`.
- `git diff --check` — passed.

## Risks or follow-up

- The Task Hub still has separate date-scope filters and calendar navigation because they control
  different states: which records are loaded versus which calendar window is visible. A later
  product decision may consolidate them into one date interaction model.
- No authenticated desktop/mobile visual session was available for manual review in this turn;
  responsive classes remain in place and the focused component tests/build passed.

## TODO update

- `TASK-HUB-TIMELINE-UX-ALIGNMENT` → `Done`.
