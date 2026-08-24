## Task

AGY-6.1: Add a backend-derived role-aware queue.

## Outcome

The authenticated API now exposes `GET /v1/workspaces/:workspaceId/my-work-queue` and derives a three-bucket attention queue from persisted Workspace records. Every item includes a reason and an explicit next action.

- Owner, Admin, and PO members receive planner work for Requirements, Release Decisions, and timelines.
- Dev members receive their assigned subtasks, review feedback, and assigned active Bugs.
- QA members receive test/review work, resolved-Bug retests, and Feature sign-off work.

Authorization and Workspace scope are checked before queue data is returned. The response is runtime-validated against the shared contract, sorted deterministically, and bounded to 100 returned items per bucket while retaining the full bucket total. This is a read-only slice, so it adds no migration, mutation, or Activity record.

## Changed files

- `packages/contracts/src/workQueue.ts` — defines the role, bucket, item, reason, and next-action response contract.
- `packages/contracts/src/index.ts` — exports the work queue contract.
- `packages/contracts/src/contracts.test.ts` — verifies a representative role-aware queue response.
- `apps/api/src/modules/workQueue/workQueueService.ts` — derives the nine persisted role-specific queue buckets inside a read transaction.
- `apps/api/src/modules/workQueue/workQueueController.ts` — returns the queue and maps validation, authorization, and server errors.
- `apps/api/src/modules/workQueue/workQueueRoutes.ts` — adds the authenticated, member-only Workspace endpoint with UUID validation.
- `apps/api/src/modules/workQueue/__tests__/workQueueApiIntegration.test.ts` — proves every bucket, role scope, authorization boundary, Workspace isolation, and invalid-ID behavior against PostgreSQL and HTTP.
- `apps/api/src/app.ts` — registers the queue route before the generic Workspace router so invalid UUIDs are rejected before database lookup.
- `TODO.md` — records AGY-6.1 completion and validation evidence.

## Validation

- `npm --workspace packages/contracts test` — passed: 49 tests in 15 suites, 0 skipped.
- `npm --workspace packages/contracts run build` — passed.
- `npm --workspace apps/api run typecheck` — passed.
- `npm --workspace apps/api run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/modules/workQueue/__tests__/workQueueApiIntegration.test.js` — passed: 4 PostgreSQL/HTTP tests covering all 9 buckets, multi-role scope, non-member rejection, cross-Workspace isolation, and invalid UUID handling.
- `npm --workspace apps/api test` — passed: 206 tests in 59 suites, 0 skipped.
- `npm --workspace apps/web run typecheck` — passed.
- `npm --workspace apps/web test` — passed: 238 tests across 53 files, 0 skipped.
- `npm --workspace apps/web run build` — passed; retained the existing Vite warning for a JavaScript chunk larger than 500 kB.
- Scoped `git diff --check` for AGY-6.1 files — passed.

## Risks or follow-up

- AGY-6.2 must consume this shared backend queue in My Tasks and provide its loading, empty, error, permission, responsive, and keyboard states.
- Each bucket returns at most 100 items. A future large-Workspace requirement may need cursor pagination and more set-based query optimization; the API already preserves the full `total`.
- Owner and Admin intentionally map to the planner queue because the current authorization model gives them planner-equivalent Workspace responsibility.
- No frontend UI was changed in this backend/contract slice, so visual browser validation belongs to AGY-6.2.

## TODO update

- AGY-6.1: Add a backend-derived role-aware queue → Done
