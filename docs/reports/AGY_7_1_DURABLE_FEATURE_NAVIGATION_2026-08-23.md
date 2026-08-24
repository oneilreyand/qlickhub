## Task

AGY-7.1: Add durable Feature / Story navigation.

## Outcome

Task detail now has a canonical protected URL at `/projects/:projectId/tasks/:taskId`. A refresh reads the persisted Task from the existing authenticated Workspace API, restores the matching active Workspace, and renders explicit forbidden, missing-record, loading, and recoverable-error states. Task Hub rows open the canonical URL while preserving their return location, and the Work Hub sidebar remains active on deep links.

Root Tasks and subtasks now use a shared hierarchy breadcrumb. Subtasks show their persisted parent Feature / Story and expose keyboard-accessible parent-title and Back to Feature controls. My Tasks reuses the same durable parent navigation from its existing Feature context. Both controls meet the 44px mobile touch-target requirement.

No API contract, database schema, migration, or authorization policy changed. The backend remains the source of authority for Task reads.

## Changed files

- `apps/web/src/app/App.tsx` — registers the protected canonical task route.
- `apps/web/src/pages/TaskDeepLinkPage.tsx` — coordinates persisted deep-link loading, Workspace restoration, route states, parent loading, and return navigation.
- `apps/web/src/components/ui/molecules/TaskHierarchyBreadcrumb.tsx` — adds the reusable root/subtask hierarchy and Back to Feature controls.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — composes the shared hierarchy breadcrumb in task detail.
- `apps/web/src/components/ui/organisms/TaskHubDashboardTemplate.tsx` — opens Task Hub selections through the canonical URL while preserving filters.
- `apps/web/src/components/ui/organisms/myTasks/MyTaskFeatureContext.tsx` — exposes durable Back to Feature navigation.
- `apps/web/src/components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer.tsx` — passes parent navigation through the My Tasks Feature context.
- `apps/web/src/pages/MyTasksPage.tsx` — navigates from My Tasks to the persisted parent Feature route and preserves the return path.
- `apps/web/src/components/layout/Sidebar.tsx` — keeps Work Hub selected on task deep links.
- `apps/web/src/pages/__tests__/TaskDeepLinkPage.test.tsx` — covers authorized refresh, forbidden access, missing records, parent loading, and parent navigation.
- `apps/web/src/components/ui/molecules/__tests__/TaskHierarchyBreadcrumb.test.tsx` — covers root/subtask labels, both parent controls, and 44px touch-target classes.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/MyTaskFeatureContext.test.tsx` — covers Back to Feature behavior from My Tasks.
- `apps/web/src/components/layout/__tests__/Sidebar.test.tsx` — covers active Work Hub navigation on a canonical task URL.
- `apps/web/src/app/__tests__/AppRoutes.test.tsx` — records the protected canonical route inventory.
- `TODO.md` — claims and completes AGY-7.1 with validation evidence.

## Validation

- `npm --prefix apps/web test` — passed 56 files / 249 tests with 0 skipped.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/web run build` — passed; Vite transformed 1,671 modules. The existing chunk-size warning remains.
- `npm --prefix apps/api run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/modules/tasks/__tests__/taskApiIntegration.test.js` — passed 26/26 against PostgreSQL test data with 0 failed, cancelled, skipped, or todo tests; includes persisted parent/subtask direct access and forbidden executor access. The first sandboxed attempt could not reach PostgreSQL (`EPERM`); the approved local-database rerun passed.
- Browser QA with a temporary contract-valid component harness at 1280×720 and 390×844 — passed: root/subtask hierarchy rendered, both parent controls measured 44px high, document width matched viewport width, and console warnings/errors were empty. The harness was removed and the viewport override reset after validation.
- `git diff --check -- <AGY-7.1 files>` — passed with no whitespace errors.

## Risks or follow-up

- The production build retains the existing JavaScript chunk warning above 500kB.
- Neither available local browser had an authenticated Qlick Hub session, so the signed-in full-page route was not manually exercised in-browser. Route/access behavior is covered by frontend route tests and the persisted PostgreSQL Task API suite; responsive layout was checked through the temporary harness without adding a production mock path.
- No migration or deployment ordering is required for this slice.

## TODO update

- `AGY-7.1: Add durable Feature / Story navigation` → `Done`
