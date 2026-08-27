## Task

REQUIREMENT-BULK-CORRECTION: safe correction of many Requirements linked to one Feature.

## Outcome

Product Owner, Admin, and Owner can select up to 50 Requirements that are currently linked to a Feature, review the consequence, and either:

- unlink them from that Feature only; or
- mark them `deprecated` while retaining all mappings and historical traceability.

The API verifies every selected Requirement remains linked to the target Feature, executes the operation atomically, and writes a Feature Activity record. It never provides global Requirement deletion.

## Changed files

- `packages/contracts/src/requirement.ts` — bounded, distinct bulk-correction request and response contracts.
- `apps/api/src/modules/requirements/requirementController.ts` — validates and dispatches the correction request.
- `apps/api/src/modules/requirements/requirementRoutes.ts` — planner-only bulk-correction route.
- `apps/api/src/modules/requirements/requirementService.ts` — transactional scope validation, unlink/deprecation, and audit activity.
- `apps/api/src/modules/requirements/__tests__/requirementApiIntegration.test.ts` — persisted authorization, scope, status, link-retention, and activity assertions.
- `apps/web/src/lib/api/requirementService.ts` — authenticated client call.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx` — selection, accessible confirmation modal, and explicit non-deletion impact copy.
- `apps/web/src/components/ui/organisms/__tests__/RequirementManager.test.tsx` — planner interaction coverage.
- `packages/contracts/src/contracts.test.ts` — contract bounds and duplicate-ID validation.

## Validation

- `npm --prefix packages/contracts run build` — passed.
- `npm --prefix packages/contracts test` — passed, 55/55 tests.
- `npm --prefix apps/api run build` — passed.
- `npm --prefix apps/web test -- RequirementManager.test.tsx` — passed, 9/9 tests.
- `npm --prefix apps/web run build` — passed. Vite reported the existing >500 kB chunk-size advisory.
- `git diff --check` — passed.
- `env NODE_ENV=test node --test dist/modules/requirements/__tests__/requirementApiIntegration.test.js` from `apps/api` — blocked before setup with `SequelizeConnectionError`; the disposable PostgreSQL test database is not reachable in this environment.

## Risks or follow-up

- Start or provide the disposable PostgreSQL test database, run the focused Requirement integration test, and record its result before marking the work complete.
- This implementation intentionally does not add hard delete or bulk global mutation. Existing Test Case, Bug, and audit relationships remain traceable.

## TODO update

- `REQUIREMENT-BULK-CORRECTION` → `Blocked`
