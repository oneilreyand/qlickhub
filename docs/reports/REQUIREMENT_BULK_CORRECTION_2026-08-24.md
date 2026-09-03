## Task

REQUIREMENT-BULK-CORRECTION: safe correction of many Requirements linked to one Feature.

## Outcome

Product Owner, Admin, and Owner can select up to 50 Requirements that are currently linked to a Feature, review the consequence, and either:

- unlink them from that Feature only; or
- mark them `deprecated` while retaining all mappings and historical traceability.

The API verifies every selected Requirement remains linked to the target Feature, executes the operation atomically, and writes a Feature Activity record. It never provides global Requirement deletion.

The PostgreSQL validation blocker was resolved on 2026-09-02. Final verification also exposed and corrected an invalid locked outer join; links and Requirements are now locked in separate queries inside the same transaction.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` and `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DOMAIN-003`, `AUTH-002`, `DATA-001`, `TEST-001`.
- **Data/interface impact:** The approved bulk unlink/deprecation contract and persisted audit behavior are unchanged.
- **Authorization impact:** None; planner-only authorization remains enforced by the backend.
- **Migration risk:** None; no schema or canonical migration was required.

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
- Final focused Requirement integration on 2026-09-02 — **9 passed, 0 failed, 0 skipped**, 1 suite, configured PostgreSQL test environment.
- Final `npm --prefix apps/api run test` on 2026-09-03 — TypeScript build passed; **353 passed, 0 failed, 0 skipped** across 88 suites using the configured PostgreSQL test environment.
- `npm run docs:check` — documentation governance passed after the evidence update.

## Risks or follow-up

- The previous PostgreSQL availability blocker is resolved.
- This implementation intentionally does not add hard delete or bulk global mutation. Existing Test Case, Bug, and audit relationships remain traceable.

## TODO update

- `REQUIREMENT-BULK-CORRECTION` → `Done`
