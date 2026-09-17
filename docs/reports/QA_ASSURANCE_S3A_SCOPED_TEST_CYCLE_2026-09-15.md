## Task

QA-ASSURANCE-S3A-SCOPED-TEST-CYCLE

## Outcome

QA assignee membuat Test Cycle dari baseline readiness Feature yang sudah persisten. Cycle mengunci
root Feature, QA Subtask, baseline, fingerprint kandidat, build, dan environment. Setiap Test Run
baru wajib menunjuk cycle tersebut serta Test Case revision `active`; service dan trigger PostgreSQL
menolak scope yang tidak identik. Run lama tetap dapat dibaca sebagai `legacy/unscoped` tanpa
backfill yang mengarang relasi Feature atau kandidat.

QA Testing Desk memuat cycle pada Feature/Subtask aktif. Hanya QA assignee dapat membuat cycle atau
memulai Run; PO/Owner/Admin tetap dapat membaca histori tanpa hak eksekusi.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), [QA assurance plan](../plans/QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md), dan [feature card SDLC](../features/SDLC_QUALITY_AND_RELEASE.md).
- **Policy IDs:** `AUTH-009`, `AUTH-010`, `QA-007`, `QA-008`, `QA-009`, `RELEASE-003`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Migration 73 adds `qa_test_cycles`, nullable Run-scope FKs for legacy records, scoped Run contract fields, and read/create cycle endpoints.
- **Authorization impact:** Backend requires the assigned QA for the exact QA Subtask to create a cycle or execute a Run. Workspace members can read cycles; Planner roles cannot mutate cycles/Runs.
- **Migration risk:** Additive. Trigger rejects only new partial/inconsistent Run scope. Down migration was verified before reapplying migration 73 on the test database.

## Changed files

- `apps/api/src/db/migrations/20260915000073-create-qa-test-cycles-and-scope-test-runs.cjs` — cycle table, composite FKs, scope trigger, indexes, and Task deletion protection.
- `apps/api/src/db/models/qaTestCycle.ts`, `testRun.ts`, exports, associations — persistence model.
- `packages/contracts/src/testManagement.ts` — cycle and scoped Run contracts.
- `apps/api/src/modules/testManagement/` — cycle endpoints and authoritative scope validation.
- `apps/web/src/lib/api/testManagementService.ts` and `QaTestingDesk.tsx` — cycle UI and scoped Run command.
- `apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts` and `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — regression coverage.
- `docs/features/SDLC_QUALITY_AND_RELEASE.md` — S3A feature traceability.

## Validation

- `npm --prefix packages/contracts run build` — passed.
- `npm run build` in `apps/api` — passed.
- `npm run db:verify:clean-migrations` in `apps/api` — passed on newly created and removed PostgreSQL database through migration 73.
- `npx sequelize-cli db:migrate:undo --name 20260915000073-create-qa-test-cycles-and-scope-test-runs.cjs --env test && npm run db:migrate:test` — passed on PostgreSQL test database.
- `NODE_ENV=test node --test dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js` in `apps/api` — passed: 7/7, 0 skipped. Existing pg deprecation warning and no-device-token FCM skip were non-failing.
- `npm --prefix apps/web run build` — passed: TypeScript and Vite build (1,710 modules).
- `npm --prefix apps/web test -- QaTestingDesk` — passed: 17/17, 0 skipped. Existing asynchronous React `act(...)` warnings remained non-failing.
- `npm run docs:check` and `git diff --check` — passed before the final report/TODO update.

## Risks or follow-up

- S3B must seal required image/video evidence into an immutable manifest at Result finalization. Existing evidence is transitional and is not a release gate.
- Test Cycle lifecycle completion/supersession is deferred until evidence and readiness snapshot rules exist; new cycles remain `in_progress` in S3A.

## TODO update

- `QA-ASSURANCE-S3A-SCOPED-TEST-CYCLE` → `Done`
