# Agent Report — AGY-3.3 Persisted QA Execution

## Task

AGY-3.3: Replace the My Tasks local QA checklist.

## Outcome

My Tasks now loads a backend-derived, Feature-scoped Test execution workspace instead of keeping QA scenarios in browser state. The read model resolves a requested parent Task or subtask to its parent Feature, follows persisted Task → Requirement → canonical Test Case links, and returns each Test Case with newest-first Test Run history plus a backend-selected latest Run.

The QA Testing Desk now presents persisted definitions, preconditions, steps, expected results, Run history, loading, empty, error, permission-denied, archived, and read-only states. Owner, Admin, and QA can start a persisted Run and record its immutable Result; PO and Dev can inspect history but cannot see execution controls. Closing and reopening the drawer refetches the same persisted records. QA sign-off remains disabled because it belongs to Phase 5.

No database schema or migration changed. The API adds `GET /v1/workspaces/:workspaceId/tasks/:taskId/test-executions`. Workspace membership, Test Management read policy, and Task access policy are enforced in the backend before the read model is returned. Existing Run and Result mutations continue to enforce Owner/Admin/QA execution policy in the backend.

Responsive browser QA found an 11 px mobile overflow in the existing QA workflow stepper. The stepper now uses a four-column mobile layout while retaining all text labels, and the repeated check at 390×844 reported no horizontal overflow.

## Changed files

- `packages/contracts/src/testManagement.ts` — adds the task-scoped Test execution read-model contract.
- `packages/contracts/src/contracts.test.ts` — validates the new read model with contract-valid UUIDs.
- `apps/api/src/modules/testManagement/testManagementRoutes.ts` — exposes the authenticated task-scoped endpoint.
- `apps/api/src/modules/testManagement/testManagementController.ts` — validates the task id and returns the execution workspace.
- `apps/api/src/modules/testManagement/testManagementService.ts` — resolves Feature scope, enforces Task access, and groups persisted Test Cases/Runs.
- `apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts` — proves persisted Feature scoping, newest history, authorization, and Workspace isolation against PostgreSQL.
- `apps/web/src/lib/api/testManagementService.ts` — adds typed task execution, Start Run, and Record Result API calls.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — replaces the placeholder/local checklist with persisted execution UI and responsive states/actions.
- `apps/web/src/components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer.tsx` — passes the active Workspace role into the QA desk.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — covers refetch-after-reopen, persisted history, role visibility, Start Run, and Record Result.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/MyTaskDetailWorkspaceDrawer.test.tsx` — updates drawer navigation expectations and isolates the new persisted read dependency.
- `TODO.md` — records the verified AGY-3.3 completion evidence.

## Validation

- `npm run test --workspace=@qlick/contracts` — passed 41/41 tests, 0 failed, 0 skipped.
- `npm run build --workspace=@qlick/api && NODE_ENV=test node --test apps/api/dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js` — passed 7/7 PostgreSQL HTTP integration tests, 0 failed, 0 skipped.
- `npm run test --workspace=@qlick/api` — passed 180/180 tests across 53 suites against the disposable PostgreSQL test environment, 0 failed, 0 skipped; API TypeScript build passed first.
- `npm run test --workspace=@qlick/web` — passed 211/211 tests across 48 files, 0 failed.
- `npm run build --workspace=@qlick/web` — TypeScript and Vite production build passed. The existing bundle-size warning remains for a JavaScript chunk larger than 500 kB.
- Browser QA using the real `QaTestingDesk` component and a temporary, contract-valid visual fixture — desktop 1440×900 and mobile 390×844 passed; persisted Test Case/Run content, Start Run modal, Record Result modal, visible text/icon statuses, and button layout were checked. Final mobile `scrollWidth` equaled the 390 px viewport; the temporary fixture was removed after inspection.

## Risks or follow-up

- Test Case coverage remains linked to Requirements because the Acceptance Criterion linking decision is still outside this slice.
- The UI records Results without attachment evidence in this slice; the canonical API still supports persisted QA evidence attachment IDs.
- QA sign-off and readiness gates remain intentionally disabled until Phase 5 supplies separate auditable records and policies.
- The existing Vite bundle-size warning remains unchanged.

## TODO update

- AGY-3.3: Replace the My Tasks local QA checklist → `Done`
