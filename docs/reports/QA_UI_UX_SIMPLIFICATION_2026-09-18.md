## Task

QA-UI-UX-SIMPLIFICATION — remove the mandatory PO Test Case publication wait, connect failed
Results to a deliberate Bug handoff, and give Developer/PO a reproducible immutable Test Case
context in Bug.

## Outcome

QA assignees can now activate a draft Test Case directly only when the backend can prove that all
linked Requirements belong to the root Feature of their assigned, unfinished QA Subtask. The action
seals the current version and writes a persistent PO notification outbox event. PO/Admin/Owner may
return an active Test Case to draft for revision or archive it; no historic Run is altered.

The QA desk presents **Aktifkan & Jalankan** as the direct draft action and retains **Minta Masukan
PO** as an optional consultation path. A failed or blocked Result now opens the deliberate **Buat Bug
dari hasil ini** form after the Result has been sealed. It preselects the Result and Requirement and
prefills Test Case title, steps, expected result, and actual result. A Bug is still created only
after QA confirms the form.

Bug responses and cards now expose the originating immutable Test Case revision: title,
preconditions, steps, expected result, test data, Requirement IDs, mapped Acceptance Criteria,
actual Result, evidence, build, and environment. Legacy records without a deterministically linked
version show an explicit unavailable state rather than current mutable Test Case data.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow §5](../2_WORKFLOW_AND_ROLES.md#5-manajemen-pengujian-native-qa-qa-test-management), [ADR-015](../adr/ADR-015-QA-DIRECT-TEST-CASE-ACTIVATION.md), and [Feature Card](../features/QA_UI_UX_SIMPLIFICATION.md).
- **Policy IDs:** `AUTH-002`, `AUTH-009`, `QA-001`, `QA-002`, `QA-003`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** additive `BugWithContext.originatingTestCase` read model; migration 83 replaces only the immutable-version lifecycle trigger. Existing rows are not rewritten.
- **Authorization impact:** QA direct activation is backend scope-checked. PO receives a durable event but receives no QA execution capability. Developer/PO read-only Bug context does not grant Test Case mutation.
- **Migration risk:** Production must apply migration 83 after a standard backup/status check. The change is additive to data but changes the database trigger governing Test Case lifecycle transitions. A clean disposable PostgreSQL migration verified migrations 17–83.

## Changed files

- `docs/adr/ADR-015-QA-DIRECT-TEST-CASE-ACTIVATION.md` — approved direct activation decision.
- `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/POLICY_REGISTRY.md` — canonical policy alignment.
- `apps/api/src/policies/testManagementPolicy.ts` and `apps/api/src/modules/testManagement/testManagementService.ts` — lifecycle, deterministic QA scope guard, audit, and PO outbox notification.
- `apps/api/src/db/migrations/20260918000083-allow-scoped-qa-test-case-activation.cjs` — immutable lifecycle trigger update.
- `packages/contracts/src/bug.ts` and `apps/api/src/modules/bugs/bugService.ts` — immutable Bug Test Case snapshot contract/read model.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — direct activation and failed Result → Bug handoff.
- `apps/web/src/components/ui/organisms/BugExperiencePanel.tsx` — reproducible Test Case detail in Bug.

## Validation

- `npm run db:verify:clean-migrations` — passed on disposable PostgreSQL database `qa_management_phase0_verify_20379`; migrations 17–83 applied cleanly.
- `npm run db:migrate:test && npm run build && NODE_ENV=test node --test dist/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.js` — passed 33/33 PostgreSQL integration tests; test-local migration 83 applied. FCM delivery was intentionally skipped because the test users have no registered device tokens; the persistent outbox event was asserted.
- `npm --prefix apps/web run test -- --run src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx src/components/ui/organisms/__tests__/BugExperiencePanel.test.tsx` — passed 33/33. The known anti-self-approval test emits React `act(...)` warnings only.
- `npm run validate` — passed with 0 errors and 21 pre-existing lint warnings.
- `npm run build:web` — passed; 1,711 modules transformed.
- `npm run docs:check` and `git diff --check` — passed.

## Risks or follow-up

- The requested single flat Task navigation (Info, Requirement, Pekerjaan, Pengujian, Bug & Retest,
  Rilis) remains the next UI composition slice; this change removes the QA publication wait and
  failure/Bug/reproduction dead ends without replacing the entire drawer navigation.
- Production migration/deployment and authenticated desktop/mobile browser UAT are not run.

## TODO update

- `QA-UI-UX-SIMPLIFICATION` → `In progress`
