## Task

QA-ASSURANCE-S1B-TEST-CASE-DRAFT-AUTHORITY

## Outcome

Test Case draft authoring is now QA-only. A QA member creates the immutable-audit draft and submits it for review; PO retains the existing review lifecycle and can activate a reviewed Test Case. Owner, Admin, and PO no longer receive the creation endpoint or authoring controls.

## Source of truth and impact

- **Applicable SSoT:** [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), [Architecture](../1_ARCHITECTURE.md), and [ADR-014](../adr/ADR-014-QA-EVIDENCE-EXECUTION-AND-RELEASE-ASSURANCE.md).
- **Policy IDs:** `AUTH-009`, `AUTH-010`, `QA-006`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** No schema, migration, or payload change. `POST /workspaces/:workspaceId/test-cases` is QA-only; PO review/activation through `PATCH` is retained.
- **Authorization impact:** QA is the normal Test Case draft author. PO remains Test Case reviewer/activator. Owner/Admin normal authoring is removed; no break-glass path exists yet.
- **Migration risk:** None. Existing Test Cases are unchanged. The older spreadsheet import authority remains a separate legacy workflow and will be narrowed in a dedicated intake transition so its audit/history paths can be migrated safely.

## Changed files

- `apps/api/src/policies/testManagementPolicy.ts` — makes Test Case draft creation QA-only.
- `apps/api/src/modules/testManagement/testManagementRoutes.ts` — applies QA-only middleware to native Test Case creation.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — hides Test Case authoring/import entry points from PO/Owner/Admin.
- `apps/api/src/policies/__tests__/testManagementPolicy.test.ts`, `apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts`, and `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — cover QA creation, PO activation, PO denial, and UI visibility.

## Validation

- `npm run build` in `apps/api` — passed.
- `NODE_ENV=test node --test dist/policies/__tests__/testManagementPolicy.test.js` — passed: 6/6 tests, 0 skipped.
- `npm --prefix apps/web test -- QaTestingDesk` — passed: 15/15 tests, 0 skipped. Existing React `act(...)` warnings from `ReleaseAssurancePanel`/`QaTestingDesk` remain; no test failure.
- `npm --prefix apps/web run build` — passed.
- `NODE_ENV=test node --test dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js` — passed against the configured disposable PostgreSQL test environment: 7/7 tests, 0 skipped. FCM delivery was skipped because no test device tokens were active.

## Risks or follow-up

- QA role is the transitional author boundary; QA-assignee binding requires the Test Cycle and scoped Test Run model in S3.
- Spreadsheet import is intentionally not silently reclassified in this slice because it has separate preview, ownership, audit, and update-mode semantics. It must receive its own policy and regression migration.
- Owner/Admin break-glass remains unavailable until it is explicit, scoped, reasoned, expiring, and audited.

## TODO update

- `QA-ASSURANCE-S1B-TEST-CASE-DRAFT-AUTHORITY` → `Done`
