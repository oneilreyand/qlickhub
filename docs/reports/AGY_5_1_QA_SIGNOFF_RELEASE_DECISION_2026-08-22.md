# Agent Report — AGY-5.1 QA Sign-off and Release Decision

## Task

AGY-5.1: Add QA Sign-off and PO Release Decision records.

## Outcome

QA certification and product release approval are now independent, append-only records rather than Task status changes or text stored in `reviewNotes`.

- QA Sign-off records an approved/rejected certification, optional notes, signer, timestamp, and a server-captured readiness fact snapshot.
- Release Decision records an approved/rejected product decision, optional notes, optional override reason, referenced QA Sign-off, decider, timestamp, and a second immutable snapshot.
- The snapshot captures the persisted Feature status, subtask completion, linked Requirement count, latest canonical Test Result counts, and Bug status/severity counts. It records facts only; AGY-5.2 remains responsible for evaluating readiness gates.
- Release Decisions must reference the latest QA Sign-off. The QA signer cannot decide the same release. Approving rejected QA certification requires an explicit override reason.
- PostgreSQL rejects updates to either record type. No update/delete API is exposed, so later decisions append history instead of rewriting it.
- Each decision creates a Feature Task Activity entry in the same transaction.
- My Tasks now exposes a shared QA Certification / Release Decision panel. The former Product Owner action that completed the Task and wrote approval into `reviewNotes` has been removed. QA subtask completion is labelled separately from QA Sign-off.
- Task status remains an independent workflow field and is unchanged by both assurance mutations.

No unresolved schema or authorization decision remains for AGY-5.1.

## Changed files

- `packages/contracts/src/releaseDecision.ts`, `packages/contracts/src/index.ts`, `packages/contracts/src/contracts.test.ts` — add QA Sign-off, Release Decision, server snapshot, input, and aggregate read contracts.
- `apps/api/src/db/migrations/20260822000054-create-release-decision-records.cjs` — add Workspace-scoped QA Sign-off and Release Decision tables, indexes, constraints, composite foreign keys, and update-rejection triggers.
- `apps/api/src/db/models/qaSignOff.ts`, `apps/api/src/db/models/releaseDecision.ts`, `apps/api/src/db/models/index.ts`, `apps/api/src/db/models/associations.ts` — add Sequelize models and explicit associations.
- `apps/api/src/policies/releaseDecisionPolicy.ts`, `apps/api/src/policies/__tests__/releaseDecisionPolicy.test.ts` — enforce functional role separation and independent approval.
- `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts`, `releaseDecisionController.ts`, `releaseDecisionRoutes.ts`, `__tests__/releaseDecisionApiIntegration.test.ts`, `apps/api/src/app.ts` — add authenticated read/create interfaces, snapshot capture, audit activity, and PostgreSQL integration coverage.
- `apps/web/src/lib/api/releaseDecisionService.ts` — add the typed assurance API client.
- `apps/web/src/components/ui/organisms/ReleaseAssurancePanel.tsx`, `__tests__/ReleaseAssurancePanel.test.tsx` — add the shared persisted decision panel with loading, empty, error/retry, permission, disabled, modal, override, and keyboard states.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx`, `PoTeamICardGrid.tsx`, `MyTaskDetailWorkspaceDrawer.tsx` and their focused tests — connect QA and Product Owner entry points without mutating Task status or `reviewNotes`.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — humanise the new QA Sign-off and Release Decision Activity events.
- `TODO.md` — record AGY-5.1 completion evidence.

## Data/interface impact

- Additive tables: `qa_sign_offs` and `release_decisions`.
- New authenticated interfaces:
  - `GET /v1/workspaces/:workspaceId/features/:featureTaskId/release-records`
  - `POST /v1/workspaces/:workspaceId/features/:featureTaskId/qa-sign-offs`
  - `POST /v1/workspaces/:workspaceId/features/:featureTaskId/release-decisions`
- Both records are root Feature / Story scoped and use composite Workspace foreign keys for Feature, actor membership, and QA Sign-off references.
- The readiness snapshot is generated entirely by the backend from persisted records; the client cannot submit or alter it.
- Existing Task status, completion time, `reviewNotes`, Test Results, Bugs, and historical Activity are not migrated, rewritten, or deleted.
- Migration 54 was applied successfully to test and development environments.

## Authorization impact

- Owner/Admin/QA may record QA Sign-off.
- Owner/Admin/Product Owner may record Release Decisions.
- Every active Workspace member may read release assurance history within their permitted Feature scope.
- A QA signer cannot create the Release Decision that references their own certification, including when an Owner/Admin has both functional capabilities.
- Product Owner cannot create QA certification; QA and Developer cannot create product Release Decisions.
- Non-members, cross-Workspace Features, cross-Workspace actors, and cross-Workspace QA Sign-off references are rejected by HTTP policy and PostgreSQL constraints.

## Validation

- `npm run test --workspace=@qlick/contracts` — passed, 46/46 across 15 suites, 0 skipped.
- `npm run build --workspace=@qlick/contracts` — passed.
- `npm run db:migrate:test --workspace=@qlick/api` — passed; migration 54 applied to the PostgreSQL test environment.
- `npm run db:verify:clean-migrations --workspace=@qlick/api` — passed from an empty disposable PostgreSQL database through migration 54.
- `NODE_ENV=test node --test dist/policies/__tests__/releaseDecisionPolicy.test.js dist/modules/releaseDecisions/__tests__/releaseDecisionApiIntegration.test.js` — passed, 9/9 across 2 suites.
- `npm test --workspace=@qlick/api` — passed, 197/197 across 57 suites, 0 skipped.
- `npm run typecheck --workspace=@qlick/api` and `npm run build --workspace=@qlick/api` — passed.
- `npm test --workspace=@qlick/web -- --run src/components/ui/organisms/__tests__/ReleaseAssurancePanel.test.tsx src/components/ui/organisms/myTasks/__tests__/PoTeamICardGrid.test.tsx src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — passed, 14/14 across 3 files without React test warnings.
- `npm test --workspace=@qlick/web` — passed, 229/229 across 51 files, 0 skipped.
- `npm run typecheck --workspace=@qlick/web` — passed.
- `npm run build --workspace=@qlick/web` — passed. Vite retains the existing warning for a JavaScript bundle above 500 kB.
- Browser QA using the actual shared organism with a temporary contract-valid fixture — passed at 1280×720 and a 390×844 mobile viewport. No horizontal overflow was present; mobile actions expanded safely; the modal fit within the viewport; focus entered the Close control; Escape closed the modal and restored launcher focus; rejected-QA approval required an override reason; the persisted decision rendered while Task status remained `In Review`. Temporary fixture files, local server, and browser tabs were removed afterward.
- `npm run db:migrate --workspace=@qlick/api` — passed; migration 54 applied to development.
- Targeted `git diff --check` — passed; no visual QA harness files remain.

## Risks or follow-up

- AGY-5.2 must evaluate deterministic readiness gates from these persisted facts and require override reasons for failed gates, not only rejected QA certification.
- AGY-5.3 must surface the same readiness and decision history consistently in Task Hub, My Tasks, and Report. AGY-5.1 adds the My Tasks mutation entry points and Feature Activity evidence only.
- Migration 54 is additive on upgrade. Rolling it back after real decisions exist deletes both decision tables, so production rollback requires exporting/backing up their immutable history first.
- The existing production bundle-size warning remains; no new framework or production fixture was introduced.

## TODO update

- AGY-5.1: Add QA Sign-off and PO Release Decision records → `Done`
