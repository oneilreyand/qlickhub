## Task

REQUIREMENT-CONTEXT-OWNERSHIP — separate Feature context from Requirement delivery detail.

## Outcome

The task drawer now has a separate Product Brief tab for Feature-level context, labelled Markdown links, In Scope, and Out of Scope. The Requirements tab now keeps Requirement-specific source URLs and exposes stable Acceptance Criteria with planner create/edit/deactivate actions and read-only views for Dev/QA. Existing Product Brief version history and legacy acceptance-criteria arrays are preserved unchanged; no active-Requirement gate was introduced because historical data still requires an explicit remediation decision.

## Source of truth and impact

- **Applicable SSoT:** [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md), [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [`docs/adr/ADR-010-PRODUCT-BRIEF-REQUIREMENT-CONTEXT-OWNERSHIP.md`](../adr/ADR-010-PRODUCT-BRIEF-REQUIREMENT-CONTEXT-OWNERSHIP.md)
- **Policy IDs:** DOMAIN-003, DOMAIN-004, AUTH-002, DATA-001, CONTRACT-001, UI-001, UI-002, TEST-001, DOC-002, DOC-004
- **Data/interface impact:** Reuses the existing ProductBrief versioned API and Requirement/Acceptance Criterion APIs. No schema, migration, or contract shape change.
- **Authorization impact:** Product Brief and Acceptance Criterion mutations remain planner/owner/admin-only through existing backend policy; Dev/QA receive read-only views.
- **Migration risk:** None for this slice. Existing Product Brief acceptanceCriteria arrays remain for history and are not presented as the canonical Requirement source.

## Changed files

- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailProductBriefTab.tsx` — Product Brief context, references, scope, and planner editing surface.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — adds the separate Product Brief tab and reload/error wiring.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx` — adds Acceptance Criteria display and planner lifecycle actions.
- `apps/web/src/lib/api/requirementService.ts` — adds create/update Acceptance Criterion calls.
- `apps/web/src/components/ui/molecules/RequirementFormModal.tsx` — clarifies Requirement-specific source/reference URL semantics.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailActivityTab.tsx` — human-readable Product Brief and Acceptance Criterion activity labels.
- `apps/web/src/components/ui/organisms/UserFlowGuide.tsx` and `InteractiveGuideSimulator.tsx` — documents the Product Brief → Requirement → Acceptance Criteria workflow.
- `apps/web/src/components/ui/organisms/__tests__/RequirementManager.test.tsx`, `apps/web/src/components/ui/organisms/taskDetail/__tests__/TaskDetailProductBriefTab.test.tsx`, `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx`, `apps/web/src/components/ui/molecules/__tests__/RequirementFormModal.test.tsx` — UI regression coverage.
- `docs/features/REQUIREMENT_CONTEXT_OWNERSHIP.md` — feature knowledge card.
- `docs/adr/ADR-010-PRODUCT-BRIEF-REQUIREMENT-CONTEXT-OWNERSHIP.md` — accepted ownership policy.
- `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/POLICY_REGISTRY.md` — canonical documentation updates.
- `TODO.md` — item claim and completion evidence.

## Validation

- `npm run docs:check` — passed, 5/5 checks.
- `npm run lint` — passed, 0 errors and 25 existing warnings.
- `npm run typecheck` — passed for contracts, API, and web.
- `npm --prefix apps/web run test -- --run` — passed, 73 files and 364 tests; 0 failures/skips. Existing React `act` and nested-button warnings remain in unrelated suites.
- Focused Product Brief/Requirement/Drawer tests — passed, 49/49.
- `NODE_ENV=test node --test apps/api/dist/modules/requirements/__tests__/requirementApiIntegration.test.js apps/api/dist/modules/qaDocuments/__tests__/qaDocumentApiIntegration.test.js` — passed, 20/20 across 2 PostgreSQL integration suites.
- Contracts test suite — passed, 62/62 across 18 suites.
- `npm run build:web` — passed, 1,699 modules transformed.
- `git diff --check` — passed.
- Visual QA — Product Brief inspected at desktop 1440×900 and mobile 390×844; Requirements tab, persisted source URL rendering, and the Acceptance Criterion create dialog were inspected through the authenticated local UI.
- Local QA-data cleanup — unlinked the exact temporary Requirement, marked `REF-ACV2885` deprecated to preserve Requirement history, deleted task `05c98257-00e2-4562-ba3a-8ff63042aa0a`, and verified the `assistMe` task list returned 0 records.

## Risks or follow-up

- The active-Requirement-with-AC release gate is intentionally deferred until the existing active Requirement population is audited and remediated; this is a separate policy/data-quality decision.

## TODO update

- `REQUIREMENT-CONTEXT-OWNERSHIP` → Done
