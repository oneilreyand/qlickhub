## Task

GUARDED-MISTAKEN-REQUIREMENT-DELETION

## Outcome

A Planner can select one or many Requirements from a Task correction flow and permanently delete them after typing `DELETE`. The backend performs the operation atomically and rejects the entire selection when any Requirement is linked to another Task or Subtask, referenced by a legacy or canonical Test Case, or referenced by a Bug. Successful deletion removes the current Task links and definition-owned Acceptance Criteria while preserving an auditable Requirement summary in Task Activity.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, and the decision recorded in `docs/adr/ADR-012-GUARDED-MISTAKEN-REQUIREMENT-DELETION.md`.
- **Policy IDs:** `DOMAIN-003`, `DOMAIN-004`, `AUTH-002`, `FLOW-002`, `QA-002`, `DATA-001`, `DATA-004`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** The existing bulk Requirement correction contract now accepts `delete` plus exact typed confirmation `DELETE`. Deletion removes Requirement rows, their current Task links, and definition-owned Acceptance Criteria in one transaction. No schema change was required.
- **Authorization impact:** The existing backend Planner boundary remains authoritative: active Workspace `owner`, `admin`, and `po` memberships may execute the correction; other roles receive `403`.
- **Migration risk:** None. No migration or production data backfill is needed.

## Changed files

- `packages/contracts/src/requirement.ts` — adds the guarded bulk-delete contract and exact confirmation validation.
- `packages/contracts/src/contracts.test.ts` — covers valid and invalid deletion payloads.
- `apps/api/src/modules/requirements/requirementService.ts` — enforces authorization-adjacent service guards, dependency checks, atomic deletion, and audit creation.
- `apps/api/src/modules/requirements/__tests__/requirementApiIntegration.test.ts` — proves deletion, rollback-on-conflict, confirmation validation, and role denial against PostgreSQL.
- `apps/web/src/components/ui/molecules/Modal.tsx` — supports disabled and destructive primary actions through the shared modal component.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx` — adds the permanent-delete choice, warning, typed confirmation, error handling, and responsive selection layout.
- `apps/web/src/components/ui/organisms/__tests__/RequirementManager.test.tsx` — covers the guarded deletion interaction and API failure state.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailActivityTab.tsx` — renders the deletion audit event in human-readable form.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — covers the human-readable deletion event.
- `docs/1_ARCHITECTURE.md` — defines the data integrity policy boundary.
- `docs/2_WORKFLOW_AND_ROLES.md` — defines the Planner correction workflow.
- `docs/POLICY_REGISTRY.md` — registers `DATA-004`.
- `docs/adr/ADR-012-GUARDED-MISTAKEN-REQUIREMENT-DELETION.md` — records the approved correction decision.
- `docs/features/GUARDED_MISTAKEN_REQUIREMENT_DELETION.md` — records scope, contracts, states, and acceptance criteria.
- `TODO.md` — records completion and validation evidence.

## Validation

- `npm run docs:check` — passed 5/5 documentation checks.
- `npm run test:contracts` — passed 63/63 tests across 18 suites; 0 failed, 0 skipped.
- `npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/RequirementManager.test.tsx src/components/ui/molecules/__tests__/Modal.test.tsx` — passed 17/17 tests across 2 files; 0 failed, 0 skipped.
- `npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/__tests__/RequirementManager.test.tsx src/components/ui/molecules/__tests__/Modal.test.tsx` — passed 48/48 tests across 3 files; 0 failed, 0 skipped.
- `npm --prefix apps/api run build && NODE_ENV=test node --test apps/api/dist/modules/requirements/__tests__/requirementApiIntegration.test.js` — passed 12/12 PostgreSQL integration tests; 0 failed, 0 skipped. Tests used the disposable PostgreSQL test environment and canonical models.
- `npm run typecheck` — passed contracts, API, and web type checks.
- `npm run validate` — passed documentation, lint, and all type checks; lint reported 0 errors and 23 existing warnings.
- `npm run build` — passed contracts, API, and web production builds; Vite transformed 1,700 modules.
- `npm test` — passed the full suite: contracts 63/63, web 392/392 across 76 files, and API 406/406 across 94 suites; 0 failed, 0 skipped. Existing non-failing jsdom navigation, React `act(...)`, and nested-button warnings remain visible in unrelated tests.
- `git diff --check` — passed with no whitespace errors.

## Risks or follow-up

- No migration or data backfill is required.
- The implementation was subsequently committed and released to Production; see
  `docs/reports/PRODUCTION_RELEASE_GUARDED_MISTAKEN_REQUIREMENT_DELETION_2026-09-11.md`.
- Existing unrelated local Requirement code-suggestion changes were preserved and excluded from this implementation report.

## TODO update

- `GUARDED-MISTAKEN-REQUIREMENT-DELETION` → `Done`
