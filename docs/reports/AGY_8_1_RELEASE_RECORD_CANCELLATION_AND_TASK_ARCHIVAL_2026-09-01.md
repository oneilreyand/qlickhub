# Agent Report: AGY-8.1 Release Record Cancellation & Task Archival

## Task

AGY-8.1 RELEASE-RECORD-CANCELLATION-AND-TASK-ARCHIVAL: Add append-only, reasoned cancellation events for QA Sign-offs and Release Decisions, and allow planner Task soft-deletion after all active release records are cancelled.

## Outcome

1. **Owner Decisions D1–D6 Enforced**:
   - **D1**: Feature / Story soft-deletion is permitted after every active release record has been cancelled.
   - **D2**: Cancellations are permanent and append-only (irreversible).
   - **D3**: QA Sign-off cancellation is restricted to the Original Signer, Owner, or Admin (other QA and Dev forbidden).
   - **D4**: Release Decision cancellation is restricted to the Product Owner, Owner, or Admin (QA and Dev forbidden).
   - **D5**: Active Release Decisions referencing a QA Sign-off must be cancelled before the QA Sign-off can be cancelled (`409 Conflict`).
   - **D6**: Cancelled records and history are retained indefinitely for audit.

2. **Database & Migrations**:
   - Migration `20260901000062-create-release-record-cancellations.cjs` created `qa_sign_off_cancellations` and `release_decision_cancellations` tables with foreign keys, unique constraint on `(workspace_id, qa_sign_off_id)` / `(workspace_id, release_decision_id)`, reason validation constraint (1–20,000 chars), and immutability triggers preventing `UPDATE` operations.
   - Updated `prevent_release_critical_task_soft_delete` trigger function so Task soft-delete is only blocked by **active** (non-cancelled) QA Sign-offs and Release Decisions.

3. **Backend Services & Policy**:
   - Implemented `assertCanCancelQaSignOff` and `assertCanCancelReleaseDecision` policies.
   - Implemented `cancelQaSignOff` and `cancelReleaseDecision` in `ReleaseDecisionService` with transaction locking, D5 sequence checks, and `TaskActivity` audit logging (`qa.sign_off.cancelled` and `release.decision.cancelled`).
   - Updated `listWorkspaceReleaseReadiness`, `listFeatureReleaseRecords`, and `createReleaseDecision` to evaluate readiness snapshots using active (non-cancelled) sign-offs.
   - Updated `WorkQueueService` planner and QA queues to ignore cancelled sign-offs and decisions.
   - Updated `TaskService.deleteTask` to verify only active release records when checking soft-delete blockers.

4. **Frontend UI**:
   - Added `cancelQaSignOff` and `cancelReleaseDecision` methods to web `releaseDecisionService.ts`.
   - Updated `ReleaseAssurancePanel.tsx` with role-authorized cancellation actions, an accessible Cancellation Modal with mandatory reason and permanent warning banner, cancelled badges, cancellation metadata display, and collapsible assurance history.
   - Updated `TaskDeleteConfirmationModal.tsx` warning copy.

## Changed files

- `packages/contracts/src/releaseDecision.ts` — Added `ReleaseRecordCancellationSchema`, `CancelQaSignOffInputSchema`, `CancelReleaseDecisionInputSchema`, and extended `QaSignOff` / `ReleaseDecision`.
- `packages/contracts/src/contracts.test.ts` — Added schema and input validation contract tests.
- `apps/api/src/db/migrations/20260901000062-create-release-record-cancellations.cjs` — Additive migration for cancellation tables, immutability triggers, and task soft-delete trigger update.
- `apps/api/src/db/models/qaSignOffCancellation.ts` — Sequelize model for `qa_sign_off_cancellations`.
- `apps/api/src/db/models/releaseDecisionCancellation.ts` — Sequelize model for `release_decision_cancellations`.
- `apps/api/src/db/models/qaSignOff.ts` & `apps/api/src/db/models/releaseDecision.ts` — Added `cancellation` association field.
- `apps/api/src/db/models/index.ts` & `apps/api/src/db/models/associations.ts` — Model registration and 1:1 associations.
- `apps/api/src/policies/releaseDecisionPolicy.ts` — Authorization policies `assertCanCancelQaSignOff` and `assertCanCancelReleaseDecision`.
- `apps/api/src/policies/__tests__/releaseDecisionPolicy.test.ts` — Unit tests for cancellation policies.
- `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts` — Cancellation methods, active-only read queries, and audit activity creation.
- `apps/api/src/modules/releaseDecisions/releaseDecisionController.ts` & `apps/api/src/modules/releaseDecisions/releaseDecisionRoutes.ts` — HTTP cancellation endpoints (`POST /workspaces/:workspaceId/features/:featureTaskId/qa-sign-offs/:qaSignOffId/cancellation` and `POST /workspaces/:workspaceId/features/:featureTaskId/release-decisions/:releaseDecisionId/cancellation`).
- `apps/api/src/modules/workQueue/workQueueService.ts` — Queue bucket calculation ignoring cancelled release records.
- `apps/api/src/modules/tasks/taskService.ts` — Task deletion blocker check considering only active sign-offs and decisions.
- `apps/api/src/modules/releaseDecisions/__tests__/releaseRecordCancellationApiIntegration.test.ts` — Comprehensive PostgreSQL integration tests for AGY-8.1.
- `apps/api/src/modules/tasks/__tests__/taskDeletionApiIntegration.test.ts` — Updated integration test expectations.
- `apps/web/src/lib/api/releaseDecisionService.ts` — Added `cancelQaSignOff` and `cancelReleaseDecision` API client functions.
- `apps/web/src/components/ui/organisms/ReleaseAssurancePanel.tsx` — Cancellation modal, cancel buttons, cancellation reasons, and history viewer.
- `apps/web/src/components/ui/organisms/__tests__/ReleaseAssurancePanel.test.tsx` — Unit tests for cancellation UI and interactions.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDeleteConfirmationModal.tsx` — Updated modal warning text.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — Updated test matchers.
- `TODO.md` — Updated AGY-8.1 to `Done`.

## Validation

- `npm --prefix packages/contracts run build && npm --prefix packages/contracts run test` — Passed (56/56 tests).
- `npm --prefix apps/api run db:verify:clean-migrations` — Passed (all 46 migrations verified from clean database).
- `NODE_ENV=test node --test apps/api/dist/policies/__tests__/releaseDecisionPolicy.test.js` — Passed (5/5 unit tests).
- `NODE_ENV=test node --test apps/api/dist/modules/releaseDecisions/__tests__/releaseRecordCancellationApiIntegration.test.js` — Passed (5/5 integration tests against disposable PostgreSQL).
- `NODE_ENV=test node --test apps/api/dist/modules/releaseDecisions/__tests__/releaseDecisionApiIntegration.test.js` — Passed (7/7 integration tests).
- `NODE_ENV=test node --test apps/api/dist/modules/tasks/__tests__/taskDeletionApiIntegration.test.js` — Passed (6/6 integration tests).
- `npm --prefix apps/web test -- --run` — Passed (61 test files, 296/296 tests).
- `npm --prefix apps/api run build` — Passed with clean TypeScript compilation.
- `npm --prefix apps/web run build` — Passed with clean Vite build.
- `git diff --check` — Passed with 0 whitespace / formatting issues.

## Risks or follow-up

- None. All migrations are strictly additive with backward compatibility and zero mock/local-only paths.

## TODO update

- `AGY-8.1 RELEASE-RECORD-CANCELLATION-AND-TASK-ARCHIVAL` → `Done`
