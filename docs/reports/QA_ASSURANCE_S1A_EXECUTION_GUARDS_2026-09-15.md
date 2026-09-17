## Task

QA-ASSURANCE-S1A-PLANNER-QA-EXECUTION-GUARDS

## Outcome

Normal QA execution is now separated from Product and administrative governance. Only a QA Workspace member can start a Test Run, finalize its Result, or add Result evidence. Product Owner, Admin, and Owner can still plan a QA Subtask, but cannot change its execution status; the assigned QA member follows the existing QA lifecycle.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), and [ADR-014](../adr/ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md).
- **Policy IDs:** `AUTH-009`, `AUTH-010`, `QA-006`, `QA-007`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** No schema, migration, or API payload contract change. Existing Test Run, Result, and evidence mutation endpoints now reject Owner/Admin/PO before service execution; the QA Desk and generic task drawer mirror that rule.
- **Authorization impact:** QA membership is required for normal Test Run/Result/evidence actions. QA Subtask status changes require the assigned QA member. Planner status changes remain unchanged for non-QA subtasks and planning fields remain available for QA Subtasks.
- **Migration risk:** None. This is a restrictive authorization change; any legacy Owner/Admin operational workaround must wait for the explicit audited break-glass capability in a later slice.

## Changed files

- `apps/api/src/policies/taskPolicy.ts` — prevents planner status mutations on QA Subtasks while retaining planning authority.
- `apps/api/src/policies/testManagementPolicy.ts` — limits Test Run and Result-evidence execution policy to QA.
- `apps/api/src/modules/testManagement/testManagementRoutes.ts` — applies the QA-only route guard for Run, Result, and evidence mutations.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — hides normal execution and Bug reporting actions from PO/Owner/Admin.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` and `apps/web/src/components/ui/organisms/taskDetail/TaskDetailOverviewTab.tsx` — disable QA Subtask status edits/completion for planners and submit no status field from that edit path.
- `apps/api/src/policies/__tests__/testManagementPolicy.test.ts`, `apps/api/src/policies/__tests__/taskPolicy.test.ts`, `apps/api/src/modules/tasks/__tests__/subtaskApi.test.ts`, `apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts`, and `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — regression coverage.

## Validation

- `NODE_ENV=test node --test dist/policies/__tests__/testManagementPolicy.test.js dist/policies/__tests__/taskPolicy.test.js` — passed: 18/18 tests, 0 skipped; compiled API test output.
- `npm --prefix apps/web test -- QaTestingDesk` — passed: 15/15 tests, 0 skipped. Existing React `act(...)` warnings from `ReleaseAssurancePanel`/`QaTestingDesk` remain; no test failure.
- `npm --prefix apps/api run build` — passed.
- `npm --prefix apps/web run build` — passed.
- `NODE_ENV=test node --test dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js dist/modules/tasks/__tests__/subtaskApi.test.js` — passed against the configured disposable PostgreSQL test environment: 17/17 tests, 0 skipped. FCM delivery was intentionally skipped because no test device tokens were active.
- `git diff --check` — passed.

## Risks or follow-up

- Run execution is QA-role-only for this transitional slice, not yet QA-assignee-only; `featureTaskId`, `qaSubtaskId`, Test Cycle, and assignee binding arrive in S3.
- This slice deliberately provides no implicit Owner/Admin bypass. The break-glass model requires persisted scope, reason, expiry, and audit data.
- Test Case creation/import remains governed by the legacy intake rules until the next authorization slice separates QA draft authoring from PO activation.

## TODO update

- `QA-ASSURANCE-S1A-PLANNER-QA-EXECUTION-GUARDS` → `Done`
