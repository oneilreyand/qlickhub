## Task

AGY-5.3: Surface release readiness consistently.

## Outcome

Task Hub, My Tasks, and Report now consume the same backend-evaluated `ReadinessSnapshotV2` facts. The browser does not reproduce requirement coverage, latest-test-result, Critical/High Bug, development-completion, or QA Sign-off gate rules.

The backend exposes one authenticated Workspace batch read interface, bounded to 100 Feature IDs per request. The shared frontend hook deduplicates IDs, splits Workspaces larger than 100 Features into bounded requests, and maps loading, unavailable, permission-denied, ready, and failed states by root Feature ID.

- Task Hub presents Delivery Trace and Release Readiness together in each mobile card and desktop row, and shows the failed reason in the Task Overview drawer.
- My Tasks resolves every parent task or assigned subtask to its root Feature, then presents the same readiness state on the task card and parent Feature context.
- Report lists each Feature with the same readiness label and first backend-provided failed-gate reason.
- The shared molecule is registered in the Component Gallery.

Authorization remains unchanged for mutations: every active Workspace member may read readiness, QA Sign-off remains limited to Owner/Admin/QA, and Release Decision remains limited to Owner/Admin/PO. Cross-Workspace and non-member reads are rejected. No schema or migration change was required.

## Changed files

- `packages/contracts/src/releaseDecision.ts` — adds the bounded Workspace readiness query and response contracts.
- `packages/contracts/src/contracts.test.ts` — validates the batch contract and rejects an empty Feature list.
- `apps/api/src/modules/releaseDecisions/releaseDecisionController.ts` — parses and validates the Workspace batch request.
- `apps/api/src/modules/releaseDecisions/releaseDecisionRoutes.ts` — exposes the authenticated read route.
- `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts` — verifies membership and root Feature ownership, then returns current persisted readiness facts.
- `apps/api/src/modules/releaseDecisions/__tests__/releaseDecisionApiIntegration.test.ts` — proves single-Feature/batch fact consistency, cross-Workspace isolation, and membership boundaries against PostgreSQL and HTTP.
- `apps/web/src/lib/api/releaseDecisionService.ts` — adds the Workspace readiness client.
- `apps/web/src/lib/hooks/useReleaseReadinessMap.ts` — centralizes batching, loading, error, and authorization state.
- `apps/web/src/components/ui/molecules/ReleaseReadinessSignal.tsx` — presents the backend evaluation without recalculating gates.
- `apps/web/src/test/releaseReadinessFixture.ts` — provides one contract-valid frontend fixture for consistency tests.
- `apps/web/src/components/ui/molecules/__tests__/ReleaseReadinessSignal.test.tsx` — covers ready, failed, loading, restricted, and unavailable presentation.
- `apps/web/src/lib/hooks/__tests__/useReleaseReadinessMap.test.ts` — covers deduplication, mapping, authorization, and 101-Feature chunking.
- `apps/web/src/components/ui/organisms/TaskCollection.tsx`, `TaskHubDashboardTemplate.tsx`, `TaskDetailDrawer.tsx` — integrate readiness into Task Hub rows/cards and drawer Overview.
- `apps/web/src/pages/MyTasksPage.tsx`, `apps/web/src/components/ui/organisms/MyTasksDashboard.tsx`, `apps/web/src/components/ui/organisms/myTasks/MyTaskDetailWorkspaceDrawer.tsx`, `apps/web/src/components/ui/organisms/myTasks/MyTaskFeatureContext.tsx` — integrate root-Feature readiness into My Tasks cards and detail context.
- `apps/web/src/pages/ReportPage.tsx`, `apps/web/src/components/ui/organisms/TaskReportDashboard.tsx` — integrate the Feature readiness list into Report.
- `apps/web/src/pages/ComponentGalleryPage.tsx` — documents shared molecule states.
- Focused existing surface tests — assert the same backend label/reason across Task Hub, My Tasks, Feature context, and Report.

## Validation

- `npm --workspace packages/contracts test` — passed: 48 tests, 15 suites, 0 skipped.
- `npm --workspace packages/contracts run build` — passed.
- `npm --workspace apps/api run typecheck` — passed.
- `npm --workspace apps/api run build && NODE_ENV=test node --test apps/api/dist/modules/releaseDecisions/__tests__/readinessGateEvaluator.test.js apps/api/dist/modules/releaseDecisions/__tests__/releaseDecisionApiIntegration.test.js` — passed: 11 tests, 2 suites, backed by disposable PostgreSQL and authenticated HTTP.
- `npm --workspace apps/api test` — first run passed 201/202; one unrelated notification assertion flaked under parallel execution. The failing notification file then passed 17/17 in isolation, and the unchanged official command passed on rerun: 202 tests, 58 suites, 0 skipped.
- `npm --workspace apps/web test -- --run src/lib/hooks/__tests__/useReleaseReadinessMap.test.ts src/components/ui/molecules/__tests__/ReleaseReadinessSignal.test.tsx src/components/ui/organisms/__tests__/TaskCollection.test.tsx src/components/ui/organisms/__tests__/MyTasksDashboard.test.tsx src/components/ui/organisms/__tests__/TaskReportDashboard.test.tsx src/components/ui/organisms/myTasks/__tests__/MyTaskFeatureContext.test.tsx` — passed: 21 tests across 6 files before the final 101-Feature regression was added.
- `npm --workspace apps/web test` — passed: 238 tests across 53 files, 0 skipped.
- `npm --workspace apps/web run typecheck` — passed.
- `npm --workspace apps/web run build` — passed; Vite emitted the existing chunk-size warning for the 1,149.84 kB main bundle.
- Browser visual and interaction QA using the actual shared surfaces — passed at 1280×720 and 390×844 in dark mode. Verified identical `Not release ready · 1 failed` data in Task Hub, My Tasks, and Report; verified the Report reason, responsive cards, 44 px navigation targets, visible focus treatment, and no unnecessary desktop table overflow after combining the Delivery and Release column.
- Temporary public visual harness and local server — removed/stopped after QA; no QA-only production route remains.
- `git diff --check` — AGY-5.3 files are clean. The command still reports pre-existing unrelated trailing blank lines in `apps/api/src/policies/requirementPolicy.ts` and `apps/web/src/lib/api/requirementService.ts`; those user changes were preserved.

## Risks or follow-up

- Large Workspaces are safely chunked into requests of at most 100 Features, but readiness is evaluated per Feature. Monitor endpoint latency and consider a set-based read model if production Workspace size makes this material.
- The existing web bundle remains above Vite's 500 kB advisory threshold; route-level code splitting remains a separate follow-up.
- No database migration, data backfill, or recovery action is required for AGY-5.3.

## TODO update

- AGY-5.3: Surface release readiness consistently → Done
