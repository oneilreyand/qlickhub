## Task

AGY-2.4: Allow planners to delete Task Hub tasks.

## Outcome

Owner, Admin, and PO members now see a destructive Delete Task action in the Task Hub detail drawer. The action opens an accessible confirmation that explains persisted soft deletion and warns when direct subtasks will also leave active views. A successful API response closes the drawer and refreshes persisted Task Hub data; an API failure leaves the confirmation open and reports the error through the shared snackbar flow.

The existing backend DELETE route remains the authorization source. PostgreSQL HTTP integration proves Owner/Admin/PO access, Dev/QA/non-member/unauthenticated rejection, cross-Workspace task isolation, atomic parent/direct-subtask soft deletion, and persisted audit activity.

## Changed files

- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — adds the role-aware destructive action, confirmation, loading state, error handling, close, and refresh flow.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — covers Owner/Admin/PO visibility, Dev/QA visibility restrictions, confirmation copy, successful refresh, and failed deletion.
- `apps/api/src/modules/tasks/__tests__/taskDeletionApiIntegration.test.ts` — proves authenticated role policy, Workspace boundaries, soft deletion, subtask atomicity, and activity persistence against PostgreSQL.
- `TODO.md` — claims and completes AGY-2.4 with validation evidence.

## Validation

- `npm --prefix apps/web test -- src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — passed: 1 file, 21 tests, 0 skipped.
- `npm --prefix apps/api run build` — passed.
- `NODE_ENV=test node --test dist/modules/tasks/__tests__/taskDeletionApiIntegration.test.js` from `apps/api` — passed against the configured disposable PostgreSQL test database: 1 suite, 3 tests, 0 failed, 0 skipped. The first sandboxed attempt could not reach PostgreSQL; the authorized local-database rerun passed.
- `npm --prefix apps/web test` — passed: 48 files, 208 tests, 0 skipped.
- `npm run typecheck:web` — passed.
- `npm run build:web` — passed; Vite reported the existing JavaScript chunk-size warning (>500 kB after minification).
- Browser QA with the real drawer component and a temporary in-memory fixture — desktop and 390×844 passed: confirmation stayed inside the viewport, no horizontal overflow, no console errors, full-width mobile actions, and Escape dismissal. The temporary preview files were removed after validation and no persisted task was deleted.

## Risks or follow-up

- Soft-deleted tasks and direct subtasks remain persisted with `deleted_at`; no restore UI is included in this slice.
- Existing task-linked records remain retained for traceability/audit and are no longer reachable through active Task Hub task reads after deletion.
- The production build still emits the pre-existing >500 kB chunk warning.

## TODO update

- AGY-2.4: Allow planners to delete Task Hub tasks → Done
