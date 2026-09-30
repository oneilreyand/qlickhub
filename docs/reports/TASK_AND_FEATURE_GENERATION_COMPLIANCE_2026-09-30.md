## Task

TASK-AND-FEATURE-GENERATION-COMPLIANCE

## Outcome

Enforced Single Source of Truth (SSoT) rules requiring every newly generated or manually created Feature (Root Task) to strictly include at least one Subtask (with a designated technical delivery area) and at least one Requirement with at least one Acceptance Criterion (AC).

Key outcomes:

1. **Contract Tightening (@qlick/contracts):**
   - In `ApplyTaskDraftInputSchema`, `requirements` and `subtasks` now require `.min(1)`.
   - In `GeneratedRequirementDraftSchema`, `acceptanceCriteria` now requires `.min(1)` non-empty string.
   - Added validation refinements (`superRefine`) rejecting drafts with 0 active (`enabled === true`) subtasks and requirements with empty acceptance criteria.
2. **Backend Transaction & Auto-Linking (apps/api):**
   - Updated `aiTaskGeneratorService.applyDraft` to automatically link every created subtask to the feature's requirements in `TaskRequirementModel` within the same atomic PostgreSQL transaction, ensuring end-to-end traceability from creation.
3. **AI Task Generator Guard (apps/web):**
   - Added live validation in `AiTaskGeneratorModal.tsx` (`enabledSubtaskCount`, `requirementCount`, `hasEmptyRequirementAc`).
   - Displays clear warning banner and disables the "Terapkan & Buat Feature" button whenever active subtasks, requirements, or acceptance criteria are missing.
4. **Manual Creation Alignment (apps/web):**
   - Enhanced `CreateTaskModal.tsx` to provide initial requirement and acceptance criteria input fields, alongside delivery area subtask toggles (`frontend`, `backend`, `qa`, `mobile`, `fullstack`).
   - Form submission automatically applies the feature, initial requirement with AC, and technical delivery area subtasks via the atomic intake pipeline, preventing orphaned empty root tasks.
5. **Zero Breaking Changes:**
   - Legacy tasks remain fully readable without crashes.

## Source of truth and impact

- **Applicable SSoT:**
  - `docs/1_ARCHITECTURE.md` §4 (Feature, Product Brief, Requirement, and Subtask domain hierarchy).
  - `docs/2_WORKFLOW_AND_ROLES.md` (Planner task creation authority, role-based subtasks).
  - `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` (Modal, form inputs, responsive layouts, badges).
  - `docs/plans/TASK_AND_FEATURE_GENERATION_COMPLIANCE_PLAN.md` (Approved execution plan).
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `FLOW-001`, `FLOW-002`, `FLOW-003`, `AUTH-001`, `AUTH-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `AI-001`, `AI-002`, `AI-003`, `AI-005`, `AI-006`, `AI-007`, `AI-008`, `TEST-001`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Strengthened Zod schema validation rules for task draft inputs. Backward-compatible with existing persisted PostgreSQL rows.
- **Authorization impact:** Preserved RBAC rules; only Planner roles (`owner`, `admin`, `po`, `qa`) can create tasks.
- **Migration risk:** None. No destructive database migrations or schema alterations required.

## Changed files

- `packages/contracts/src/aiTaskGenerator.ts` — enforces minimum 1 requirement with AC and minimum 1 active subtask on task generation schemas.
- `packages/contracts/src/contracts.test.ts` — automated unit tests asserting validation failure on missing subtasks, requirements, or AC.
- `apps/api/src/modules/ai/aiTaskGeneratorService.ts` — links subtasks to feature requirements in `TaskRequirementModel` within the atomic draft application transaction.
- `apps/api/src/modules/ai/__tests__/aiTaskGeneratorIntegration.test.ts` — integration test verifying subtask-to-requirement auto-linking in PostgreSQL.
- `apps/web/src/components/ui/organisms/AiTaskGeneratorModal.tsx` — added real-time validation banner and disabled state for the apply button when incomplete.
- `apps/web/src/components/ui/organisms/__tests__/AiTaskGeneratorModal.test.tsx` — unit tests for subtask disabling and empty AC blocking guards.
- `apps/web/src/components/ui/organisms/CreateTaskModal.tsx` — integrated initial Requirement, Acceptance Criteria, and Delivery Area Subtasks selection with atomic draft submission.
- `apps/web/src/components/ui/organisms/__tests__/CreateTaskModal.test.tsx` — unit tests for Requirement, AC, and Delivery Area Subtasks intake and atomic submit.
- `docs/plans/TASK_AND_FEATURE_GENERATION_COMPLIANCE_PLAN.md` — approved execution plan.
- `TODO.md` — claimed and marked task completed with evidence reference.

## Validation

- `npm --prefix packages/contracts test` — passed, 81/81 tests pass (including draft compliance test suite).
- `npm --prefix packages/contracts run build` — passed (`tsc` exit code 0).
- `npm --prefix packages/contracts run typecheck` — passed (`tsc --noEmit` exit code 0).
- `npm --prefix apps/api run typecheck` — passed (`tsc --noEmit` exit code 0).
- `npm --prefix apps/web run typecheck` — passed (`tsc --noEmit` exit code 0).
- `npm --prefix apps/web test src/components/ui/organisms/__tests__/AiTaskGeneratorModal.test.tsx` — passed (7/7 tests pass).
- `npm --prefix apps/web test src/components/ui/organisms/__tests__/CreateTaskModal.test.tsx` — passed (7/7 tests pass).
- `npm --prefix apps/api run build && NODE_ENV=test node --test apps/api/dist/modules/ai/__tests__/aiTaskGeneratorIntegration.test.js` — passed (5/5 tests pass).
- `npm run docs:check` — passed (5/5 doc tests pass; documentation governance check passed).

## Risks or follow-up

- All historical tasks remain intact. Existing features without subtasks can still be viewed in Task Hub and drawer without error.
- Future work: Consider expanding manual intake with multi-requirement support directly from the creation modal if product owners require complex multi-spec features at intake.

## TODO update

- `TASK-AND-FEATURE-GENERATION-COMPLIANCE` → `Done`
