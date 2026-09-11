# Task Detail Coordinated Loading — 2026-09-09

## Task

`TASK-DETAIL-COORDINATED-LOADING`

## Outcome

Task Hub now exposes an accessible loading drawer immediately when detail data is pending. The
interactive detail content is withheld until the initial authenticated requests settle, so
temporary zero counts and empty states are not presented as persisted emptiness. The initial bundle
loads the Task detail context, parent context, members, Requirements, subtasks, activity, discussion,
Delivery Trace, Bugs, Product Brief schedule context, and release readiness in parallel. Failed
supporting requests remain explicit in their owning panel; the task slice exposes a retryable error
for a missing detail record. Request IDs prevent late responses from a previous selected Task from
overwriting the current drawer.

## Source of truth and impact

- **Applicable SSoT:** [UI Atomic Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent and Developer Guidelines](../4_AGENT_DEV_GUIDELINES.md), [Architecture](../1_ARCHITECTURE.md)
- **Policy IDs:** `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-004`
- **Data/interface impact:** Frontend orchestration only; existing authenticated endpoint shapes are reused. No contract or backend response change.
- **Authorization impact:** None. Existing backend membership and role checks remain authoritative.
- **Migration risk:** None. No database schema or migration change.

## Changed files

- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — coordinates initial detail requests, request-stale protection, loading skeleton, and retryable missing-task state.
- `apps/web/src/components/ui/organisms/TaskHubDashboardTemplate.tsx` — passes missing-task loading/error state into the drawer and retries the detail request.
- `apps/web/src/components/ui/organisms/TaskDeliveryTracePanel.tsx` — accepts preloaded trace state without refetching on tab open.
- `apps/web/src/components/ui/organisms/BugExperiencePanel.tsx` — accepts preloaded bug state without refetching on tab open.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx` — accepts preloaded requirement/link state without refetching on tab open.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailSpecsTab.tsx` — forwards preloaded Requirement state.
- `apps/web/src/pages/TaskDeepLinkPage.tsx` — uses the same loading drawer while the direct task request is pending.
- `apps/web/src/store/taskSlice.ts` — tracks detail-request pending/error state separately from list loading.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — deferred-request, retry, stale-response, and updated loading-aware interaction coverage.
- `apps/web/src/pages/__tests__/TaskDeepLinkPage.test.tsx` — direct-link pending request coverage.
- `apps/web/src/store/__tests__/taskSlice.test.ts` — pending, stale completion, rejection, and close-state reducer coverage.
- `TODO.md` — records the completed Task Detail loading item.

## Validation

- `npm --prefix apps/web run test -- --reporter=dot` — passed, 72 files / 357 tests; no skipped tests. Existing React `act(...)` and DOM nesting warnings remain in unrelated suites.
- `npm --prefix apps/web run build` — passed; TypeScript compile and Vite production bundle completed.
- `npm run validate` — passed: documentation checks 5/5, lint 0 errors / 25 existing warnings, contracts/API/web typechecks passed.
- Focused ESLint on changed loading files — passed with 0 errors and 0 warnings.
- `git diff --check` — passed.
- Database environment — no new database/API code was introduced, so no migration or new PostgreSQL integration test was required. Existing authenticated endpoints remain the persisted-data source.

## Risks or follow-up

- Manual authenticated desktop/mobile review under throttled network conditions was not available in this run. The automated deferred-response coverage proves the loading gate and stale-response behavior; visual UAT should still confirm drawer spacing and focus behavior in a real session.
- Initial detail now starts several existing read requests in parallel. If production telemetry shows excessive request volume, the next optimization can introduce a server-side detail aggregate endpoint without changing the loading contract.

## TODO update

- `TASK-DETAIL-COORDINATED-LOADING` → `Done`
