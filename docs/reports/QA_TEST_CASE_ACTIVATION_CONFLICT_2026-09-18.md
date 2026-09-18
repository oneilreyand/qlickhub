# Agent Report: Resolve QA Test Case Direct Activation Conflict

## Task

`AGY-QA-TEST-CASE-ACTIVATION-CONFLICT: Pulihkan aktivasi langsung Test Case Draft oleh QA assignee pada scope QA Subtask agar transisi draft → active tidak gagal dengan konflik data pada siklus QA yang memiliki baseline aktif.`

## Outcome

The root cause for the `409 Conflict` error during "Aktifkan & Jalankan" has been diagnosed and resolved. Draft Test Cases imported via CSV/spreadsheet lacked `TestCaseVersionModel` records, which caused `testManagementService.updateTestCase` to throw `CONFLICT: Test Case revision history is missing. Run the version backfill first.`. Under policy `DATA-005`, `testManagementService.updateTestCase` now atomically heals missing revisions into revision 1 (`origin: 'legacy_backfill'`) inside the update transaction before applying status updates. `testCaseImportService.ts` now creates canonical revision 1 (`origin: 'native_revision'`) upon import. In `QaTestingDesk.tsx`, the UI now validates the persisted active status and awaits `loadExecutions()` reload before claiming success. Active requirement coverage updates immediately upon activation.

## Source of truth and impact

- **Applicable SSoT:** [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md), [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [`docs/4_AGENT_DEV_GUIDELINES.md`](../4_AGENT_DEV_GUIDELINES.md)
- **Policy IDs:** `AUTH-009`, `QA-001`, `QA-006`, `QA-009`, `DATA-001`, `DATA-005`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`
- **Data/interface impact:** `TestCaseVersionModel` revision 1 is now deterministically created upon spreadsheet intake and backfilled on-demand within the update transaction under `DATA-005`. No breaking contract changes.
- **Authorization impact:** Maintained strict enforcement under `AUTH-009`: only QA assignees in proven QA Subtask scope can activate draft test cases directly. Other roles (e.g. `dev`) or QA outside scope are rejected with 403 Forbidden. Real data conflicts (e.g. duplicate external reference) return 409 Conflict with Problem Details.
- **Migration risk:** None. Missing revision records heal safely on write transactions without destructive schema changes.

## Changed files

- `apps/api/src/modules/testManagement/testManagementService.ts` — exports `snapshotTestCase` and atomically heals missing `TestCaseVersionModel` revision 1 inside `updateTestCase` under `DATA-005`.
- `apps/api/src/modules/testManagement/testCaseImportService.ts` — creates `TestCaseVersionModel` revision 1 on import and increments revisions on updates.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — verifies `updatedCase.status === 'active'` and awaits `loadExecutions()` reload before dispatching success snackbar; cleanly handles activation errors.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — verifies activation failure does not claim premature success in UI (29/29 tests pass).
- `apps/api/src/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.ts` — adds 6 PostgreSQL regression tests covering unversioned draft activation, authorization rejection, version healing, coverage updating, and real conflict preservation (39/39 tests pass).
- `TODO.md` — marks `AGY-QA-TEST-CASE-ACTIVATION-CONFLICT` as `Done`.

## Validation

- `NODE_ENV=test node --test apps/api/dist/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.js` — passed 39/39 tests (0 failures).
- `npm --prefix apps/web run test -- --run src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — passed 29/29 tests (0 failures).
- `npm run validate` (`npm run docs:check && npm run lint && npm run typecheck`) — passed 0 errors.
- `npm run build:web` — passed (1,713 modules transformed, 0 errors).

## Risks or follow-up

- None.

## TODO update

- `AGY-QA-TEST-CASE-ACTIVATION-CONFLICT` → `Done`
