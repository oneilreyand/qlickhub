# Agent Report — AGY-4.2 Bug and Retest Experiences

## Task

AGY-4.2: Add Bug and Retest experiences.

## Outcome

Task Hub and My Tasks now expose the persisted first-class Bug workflow through shared Atomic Design components.

- The Task detail drawer has a `Bugs` tab that lists Bugs linked to the root Feature / Story with Requirement, assignee, originating failed/blocked Test Result, build, environment, severity, status, reproduction details, and resolution notes.
- My Tasks gives Developers an assigned work queue for `open`, `in_progress`, and `reopened` Bugs. Developers can start work and resolve an assigned Bug with required resolution notes.
- My Tasks gives Owner, Admin, and QA a retest queue for `resolved` Bugs. They can verify or reopen the Bug. Product Owners retain the Task Hub read-only view and do not receive an actionable Bug queue in My Tasks.
- Loading, empty, generic error/retry, permission-denied, and disabled/submitting states are handled by the shared Bug panel.
- Bug status is communicated by text and icon in addition to color. Cards, actions, and resolution modal are responsive and keyboard operable.
- The backend returns the contextual read model needed by the UI and derives role-specific queues before returning records; the browser does not recreate authorization or queue rules.

No schema or migration change was required for AGY-4.2.

## Changed files

- `packages/contracts/src/bug.ts`, `packages/contracts/src/contracts.test.ts` — add the contextual Bug read model and validated `assigned_work` / `retest` queue query.
- `apps/api/src/modules/bugs/bugService.ts`, `apps/api/src/modules/bugs/__tests__/bugApiIntegration.test.ts` — load persisted Feature, Requirement, assignee, Test Result, build, and environment context; derive and authorize role-specific Bug queues; cover them through PostgreSQL HTTP integration tests.
- `apps/web/src/lib/api/bugService.ts` — add typed Bug list and update clients.
- `apps/web/src/components/ui/molecules/BugStatusBadge.tsx` — add the shared text/icon/color Bug status treatment.
- `apps/web/src/components/ui/organisms/BugExperiencePanel.tsx`, `apps/web/src/components/ui/organisms/__tests__/BugExperiencePanel.test.tsx` — add the shared feature list and role queue organism with lifecycle actions and all interaction states.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx`, `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — add the Feature-scoped Bugs tab to Task Hub.
- `apps/web/src/components/ui/organisms/MyTasksDashboard.tsx`, `apps/web/src/pages/MyTasksPage.tsx`, `apps/web/src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx` — add the authenticated role-specific queue to My Tasks.
- `TODO.md` — record completion evidence for AGY-4.2.

## Data/interface impact

- `GET /v1/workspaces/:workspaceId/bugs` accepts optional `queue=assigned_work|retest`.
- Bug list/detail/create/update responses include contextual Feature, Requirement, assignee, originating Result, Test Run build, and environment data.
- `queue=assigned_work` is server-derived for the authenticated Developer and returns only that Developer's actionable assigned Bugs.
- `queue=retest` is restricted to Owner, Admin, and QA and returns resolved Bugs awaiting verification.
- Existing Bug tables, lifecycle fields, audit records, and PATCH endpoint are reused. No database schema, migration, production fixture, or browser-only data source was added.

## Authorization impact

- Developer: may request only the assigned-work queue and may transition only assigned Bugs through the existing Developer lifecycle policy.
- Owner/Admin/QA: may request the retest queue and verify or reopen resolved Bugs through the existing server policy.
- Product Owner: can inspect permitted linked Bugs in Task Hub but cannot request an actionable My Tasks Bug queue or mutate Bug lifecycle state.
- Queue filtering supplements rather than replaces backend Bug authorization; non-members, unauthorized roles, and cross-Workspace access remain rejected.

## Validation

- `npm run test --workspace=@qlick/contracts` — passed, 44/44, 0 skipped.
- `npm run build --workspace=@qlick/contracts` — passed.
- `npm run build --workspace=@qlick/api && NODE_ENV=test node --test apps/api/dist/modules/bugs/__tests__/bugApiIntegration.test.js apps/api/dist/policies/__tests__/bugPolicy.test.js` — passed, 8/8.
- `npm test --workspace=@qlick/api` — passed, 188/188 across 55 suites, 0 skipped.
- `npm run typecheck --workspace=@qlick/api` and `npm run build --workspace=@qlick/api` — passed.
- `npm test --workspace=@qlick/web -- --run src/components/ui/organisms/__tests__/BugExperiencePanel.test.tsx src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx` — passed, 32/32 across 3 files. This includes loading, empty, error/retry, permission, contextual status, Developer start/resolve, QA verify, and keyboard activation coverage.
- `npm test --workspace=@qlick/web` — passed, 223/223 across 50 files, 0 skipped.
- `npm run typecheck --workspace=@qlick/web` — passed.
- `npm run build --workspace=@qlick/web` — passed. Vite retains the existing warning for a JavaScript bundle above 500 kB.
- Browser QA using the actual shared components and a temporary contract-valid visual fixture — passed at 1280×720 and 390×844. Task Hub cards, Developer queue, QA retest queue, full-width mobile actions, resolution modal focus/fit, status text/icons, and lifecycle refresh were verified with no horizontal overflow. The temporary fixture, local server, and QA tabs were removed afterward.
- Targeted `git diff --check` for AGY-4.2 files — passed; no visual QA harness files remain.

## Risks or follow-up

- AGY-6.1/6.2 will broaden My Tasks into a unified backend-derived attention queue; AGY-4.2 intentionally adds only Bug work and retest buckets to the existing dashboard.
- AGY-7.1 remains responsible for durable direct Feature / Story URLs and refresh-safe deep-link navigation.
- The existing production bundle-size warning remains; no new framework was introduced.

## TODO update

- AGY-4.2: Add Bug and Retest experiences → `Done`
