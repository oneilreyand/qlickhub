## Task

TASK-BASED-REQUIREMENT-CODE-SUGGESTION

## Outcome

Create Requirement now prefills an editable code suggestion from the numeric code series already
linked to the current Task. For example, `REQ-101` and `REQ-102` produce `REQ-103`, while a custom
series such as `UAT-MCU-009` produces `UAT-MCU-010`. The suggestion skips exact codes already used
elsewhere in the Workspace. A Task without a numeric series starts from the first available
`REQ-###` code. Edit Requirement continues to display the persisted code without applying a new
suggestion.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` for Workspace-owned Requirement uniqueness,
  `docs/2_WORKFLOW_AND_ROLES.md` for Planner-owned Requirement mutation, and
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` for the shared modal/input and responsive UI contract.
- **Policy IDs:** `DOMAIN-003`, `FLOW-002`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** None. The existing create payload remains unchanged, and backend
  Workspace uniqueness remains authoritative.
- **Authorization impact:** None. Existing Planner-only create behavior is unchanged.
- **Migration risk:** None. No schema or persisted-data migration was introduced.

## Changed files

- `apps/web/src/lib/requirements/suggestRequirementCode.ts` — derives a deterministic, unused code
  suggestion from persisted Task-linked and Workspace Requirement data.
- `apps/web/src/lib/requirements/__tests__/suggestRequirementCode.test.ts` — covers sequential,
  collision, custom-prefix, and empty-Task behavior.
- `apps/web/src/components/ui/molecules/RequirementFormModal.tsx` — prefills and explains the
  editable suggestion only during creation.
- `apps/web/src/components/ui/molecules/__tests__/RequirementFormModal.test.tsx` — verifies editable
  suggestion behavior and preservation of persisted edit codes.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx` — supplies Task-scoped data and
  waits for Requirement loading before creation.
- `apps/web/src/components/ui/organisms/__tests__/RequirementManager.test.tsx` — verifies the
  end-to-end Create Requirement suggestion shown from linked and Workspace codes.
- `TODO.md` — records completion and validation evidence.

## Validation

- `npm --workspace apps/web test -- --run src/lib/requirements/__tests__/suggestRequirementCode.test.ts src/components/ui/molecules/__tests__/RequirementFormModal.test.tsx src/components/ui/organisms/__tests__/RequirementManager.test.tsx` — passed, 3 files and 26 tests.
- `npm --workspace apps/web run typecheck` — passed.
- `npm --workspace apps/web test -- --run` — passed, 76 files and 391 tests; 0 failed and 0 skipped.
  Existing non-failing React `act(...)` warnings and the existing Component Gallery nested-button
  warning were emitted outside this change.
- `npm --workspace apps/web run build` — passed; Vite built 1,700 modules for Production.
- `npx eslint apps/web/src/lib/requirements/suggestRequirementCode.ts apps/web/src/lib/requirements/__tests__/suggestRequirementCode.test.ts apps/web/src/components/ui/molecules/RequirementFormModal.tsx apps/web/src/components/ui/molecules/__tests__/RequirementFormModal.test.tsx apps/web/src/components/ui/organisms/RequirementManager.tsx apps/web/src/components/ui/organisms/__tests__/RequirementManager.test.tsx` — passed with 0 errors and 0 warnings.
- `npm run docs:check` — passed, 5 documentation tests and the governance check.
- `git diff --check` — passed.
- Local visual review — passed at 1440×1000 and 390×844. The suggestion and guidance remained
  readable, the mobile grid stacked without horizontal overflow, the editor body remained
  scrollable, and modal actions remained visible. No persisted record was created or mutated.

## Risks or follow-up

- The suggestion is advisory and can be edited. A concurrent creator may claim the same code after
  the list loads; the existing backend uniqueness validation remains the final guard and returns
  the conflict to the modal.

## TODO update

- `TASK-BASED-REQUIREMENT-CODE-SUGGESTION` → `Done`
