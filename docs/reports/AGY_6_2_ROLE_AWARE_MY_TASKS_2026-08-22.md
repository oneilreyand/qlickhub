## Task

AGY-6.2: Replace generic My Tasks metrics and filters.

## Outcome

My Tasks now starts with the authenticated, backend-derived attention queue from AGY-6.1 instead of recalculating generic Total/In Progress/Ready/Completed metrics in the browser.

- Owner, Admin, and PO members see Requirement, Release Decision, and timeline priorities.
- Dev members see assigned work, requested-review changes, and assigned Bug fixes.
- QA members see test/review work, Bug retests, and QA Sign-off work.
- Each item presents the persisted reason, status, priority, due date, and explicit next action returned by the backend.
- The three role-specific buckets are the primary navigation. Search and priority filtering remain available against the returned items.
- Task/Feature actions load the authorised persisted task detail before opening the existing My Tasks drawer. Bug actions move focus to the existing authorised Bug work/retest panel rather than duplicating Bug mutations.
- Queue loading, empty, filtered-empty, error, retry, and permission-denied states use shared UI primitives.
- Creating a planner Task refreshes the attention queue immediately, and queue mutations performed inside existing work surfaces refresh it as well.
- Closing a drawer opened from the queue restores keyboard focus to its originating action button.

No schema, migration, backend policy, browser-side business calculation, or production fixture was added in this frontend slice.

## Changed files

- `apps/web/src/lib/api/workQueueService.ts` — reads and runtime-validates the authenticated queue response through the shared contract.
- `apps/web/src/lib/hooks/useRoleAwareWorkQueue.ts` — manages page-local queue loading, refresh, stale-request protection, error, and permission states.
- `apps/web/src/components/ui/organisms/myTasks/RoleAwareWorkQueuePanel.tsx` — renders role bucket navigation, backend reasons/actions, filters, and all data states.
- `apps/web/src/components/ui/organisms/MyTasksDashboard.tsx` — replaces generic metrics/task tabs with the role queue and connects Bug items to the existing Bug action workspace.
- `apps/web/src/pages/MyTasksPage.tsx` — orchestrates queue loading, persisted task-detail loading, drawer opening, refreshes, and focus restoration.
- `apps/web/src/store/taskSlice.ts` — adds an authorised single-task thunk and safely upserts detail records needed by queue items outside `myTasksOnly`.
- `apps/web/src/components/ui/organisms/CreateTaskModal.tsx` — exposes an optional success callback so a newly created planner Task refreshes the queue.
- `apps/web/src/components/ui/molecules/Tabs.tsx` — keeps pill-tab touch targets at the required 44 px minimum.
- `apps/web/src/test/workQueueFixture.ts` — provides contract-valid planner, Developer, and QA frontend fixtures.
- `apps/web/src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx` — covers backend-derived content, task/Bug actions, search, priority, loading, error, retry, and permission states.
- `apps/web/src/lib/api/__tests__/workQueueService.test.ts` — verifies the endpoint call and rejects invalid queue contracts.
- `TODO.md` — records AGY-6.2 completion and validation evidence.

## Validation

- `npm --workspace apps/web test -- --run src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx src/lib/api/__tests__/workQueueService.test.ts` — passed: 7 focused tests in 2 files, no warnings.
- `npm --workspace apps/web run typecheck` — passed.
- `npm --workspace apps/web test` — passed: 241 tests across 54 files, 0 skipped.
- `npm --workspace apps/web run build` — passed; retained the existing Vite warning for a JavaScript chunk larger than 500 kB.
- `npm --workspace apps/api run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/modules/workQueue/__tests__/workQueueApiIntegration.test.js` — passed: 4 authenticated HTTP/PostgreSQL tests covering all 9 role buckets, membership enforcement, and Workspace isolation.
- Browser QA at 1280×720 using persisted development PostgreSQL records — planner queue showed 2 backend actions after creating `AGY 6.2 Checkout Attention Queue` through the authenticated UI; bucket navigation, search, priority filtering, task-detail loading, drawer controls, and application-header retention passed with no horizontal overflow or console warnings/errors.
- Browser QA at 390×844 — no horizontal overflow; Refresh, bucket, Open work, restore, and close controls measured 44 px high; drawer fit the viewport and closing it restored focus to the originating Open work button; no console warnings/errors.
- Scoped `git diff --check` — passed.

## Risks or follow-up

- The pre-existing production bundle remains larger than Vite's 500 kB warning threshold and should be handled as a separate code-splitting task.
- Each backend bucket returns at most 100 items while retaining the complete total; larger Workspaces may later need cursor pagination.
- Browser validation created the local development Workspace `AGY 6.2 Role Queue QA` and Task `AGY 6.2 Checkout Attention Queue` through authenticated product interfaces. They remain as reproducible persisted QA evidence and were not silently deleted.
- Bug queue items intentionally direct users to the existing Bug action panel, where mutations remain separately authorised and audited.

## TODO update

- AGY-6.2: Replace generic My Tasks metrics and filters → Done
