## Task

REQUIREMENT-GUIDED-SUBTASK-PLANNING: continue from a newly created Requirement into explicit Subtask planning and persist the selected Requirement links.

## Outcome

Planner roles can now choose either `Create Requirement` or `Create & Plan Subtask`. The guided path first persists and links the new Requirement to the root Feature, then opens Subtask planning with that Requirement preselected. The Planner can select additional active Requirements already linked to the same Feature. Creating the Subtask persists the Subtask, all selected `task_requirements` links, and one `requirement_linked` activity per Requirement in the existing database transaction.

The flow never creates a Subtask implicitly. QA Test Case assignment remains a separate action in QA Testing Desk.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, and `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-004`, `AUTH-002`, `FLOW-002`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** additive optional `requirementIds` input on Subtask creation; accepted IDs create canonical `task_requirements` rows and Activity audit entries. Existing responses and existing Subtasks remain compatible.
- **Authorization impact:** none beyond the existing policy. Requirement mutation and Subtask planning remain restricted to active Workspace members with `owner`, `admin`, or `po` role; the backend remains authoritative.
- **Migration risk:** none. The implementation reuses the existing Requirement, Task, TaskRequirement, and TaskActivity tables and needs no schema migration or backfill.

## Changed files

- `packages/contracts/src/task.ts` and `packages/contracts/src/contracts.test.ts` — define and verify the additive, unique, Subtask-only Requirement ID input.
- `apps/api/src/modules/tasks/internal/taskLifecycle.ts` — validate active same-Workspace Requirements linked to the parent Feature and persist the links and audit atomically.
- `apps/api/src/modules/tasks/__tests__/subtaskApi.test.ts` — prove persisted links/audit and rejection without partial Task creation against PostgreSQL.
- `apps/web/src/components/ui/molecules/Modal.tsx` and `RequirementFormModal.tsx` — expose the explicit save-only and save-and-plan actions while preserving edit behavior.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx`, `TaskDetailSpecsTab.tsx`, and `TaskDetailDrawer.tsx` — run create → Feature link → Subtask planning and carry the created Requirement selection.
- `apps/web/src/components/ui/organisms/CreateSubtaskModal.tsx` — load eligible Requirements, provide loading/error/empty/keyboard-accessible selection states, and submit selected IDs.
- Focused frontend tests beside those components — verify the explicit actions, operation ordering, preselection, multi-selection payload, and complete Task Detail wiring.
- `docs/features/REQUIREMENT_GUIDED_SUBTASK_PLANNING.md` — record the cross-role workflow and traceability without redefining canonical policy.
- `TODO.md` and this report — record task status and evidence.

## Validation

- `npm run validate` — passed: documentation governance 5/5, documentation compliance, lint with 0 errors and 23 pre-existing warnings, and contracts/API/web typechecks.
- `npm --prefix packages/contracts run test` — passed: 63/63 tests across 18 suites; 0 failed, 0 skipped.
- `npm --prefix apps/web run test` — passed: 382/382 tests across 75 files; 0 failed, 0 skipped. Existing unrelated React `act(...)` and Component Gallery nested-button warnings remain.
- `npm --prefix apps/api run test:integration` — passed against the disposable PostgreSQL test database: 403/403 tests across 94 suites; 0 failed, 0 skipped.
- Focused Subtask PostgreSQL integration suite — passed: 10/10 tests, including persisted Requirement links/audit and rollback on invalid linkage.
- `npm run build` — passed: contracts, API, and web Production builds; Vite transformed 1,699 modules.
- Desktop browser inspection at the local Task Hub — shared modal layout rendered correctly at desktop width. End-to-end manual navigation into the new Feature flow could not be completed because the existing local development Task list/create path returned a conflict on the empty Workspace. This local data/runtime issue did not reproduce in the complete 403/403 PostgreSQL API suite or 382/382 frontend suite.
- Responsive code/test review — passed: the Subtask modal retains one-column mobile fields/actions, responsive delivery-area grids, bounded scrolling for Requirement selection, accessible checkbox labels, and loading/error/empty states. A live mobile end-to-end screenshot remains covered only indirectly because of the same local Task Hub conflict above.

## Risks or follow-up

- The change is implemented and verified but has not been committed, pushed, or deployed to Production in this task.
- The local development Task Hub conflict should be diagnosed separately if manual browser seed-data validation is required; it is outside this Requirement-guided planning slice and does not appear in the disposable PostgreSQL integration environment.

## TODO update

- `REQUIREMENT-GUIDED-SUBTASK-PLANNING` → `Done`
