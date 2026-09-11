# Task Requirements-Only Tab — Verification Report

## Task

TASK-REQUIREMENTS-ONLY-TAB: Make the Task Detail Requirements tab display only persisted Requirements.

## Outcome

The Task Detail tab formerly labelled **Specs & Requirements** is now labelled **Requirements** and renders only the existing persisted Requirement Manager. Specification Brief editing, QA document/test-plan presentation, and Task attachments no longer appear on this surface. Task saving no longer performs a hidden Product Brief upsert while the Requirements tab is active, and the drawer no longer fetches Task QA document links that it cannot present.

The Overview shortcut and Product Owner workflow guide now use the same Requirements terminology. The Requirement URL treatment was also constrained at the mobile breakpoint so long external links stay within their card.

Persisted Product Brief, QA document, and attachment records were not deleted or migrated. Existing Product Brief data remains read-only input to the schedule context already used elsewhere in the drawer.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` defines Workspace-owned Requirements linked many-to-many with root Tasks; `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md` defines Task Detail tab 2 as Requirements & Acceptance Criteria and requires responsive, accessible Atomic Design reuse.
- **Policy IDs:** `DOMAIN-003`, `AUTH-002`, `UI-001`, `UI-002`, `TEST-001`, `DOC-004`.
- **Data/interface impact:** No API request or response contract changed. The frontend stops issuing inaccessible Task QA document reads and hidden Product Brief writes from the Requirements tab.
- **Authorization impact:** None. Requirement mutation visibility still follows the existing planner role check, while backend authorization remains authoritative.
- **Migration risk:** None. No schema, migration, seed, or persisted row changed.

## Changed files

- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — renames the tab, removes non-Requirement UI wiring and hidden Product Brief save behavior.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailSpecsTab.tsx` — reduces the tab body to the shared Requirement Manager.
- `apps/web/src/components/ui/organisms/RequirementManager.tsx` — uses Requirement-only headings and prevents long URLs from overflowing on mobile.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailOverviewTab.tsx` — aligns the Overview shortcut with the Requirements destination.
- `apps/web/src/components/ui/organisms/UserFlowGuide.tsx` and `InteractiveGuideSimulator.tsx` — align PO guidance and the simulator with Requirement-only behavior.
- `apps/web/src/components/ui/organisms/__tests__/RequirementManager.test.tsx`, `TaskDetailDrawer.test.tsx`, and `UserFlowGuide.test.tsx` — replace stale mixed-content expectations with the approved Requirement-only contract.
- `TODO.md` — records task lifecycle and verification evidence.

## Validation

- `npm --prefix apps/web run test -- --run src/components/ui/organisms/__tests__/RequirementManager.test.tsx src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/__tests__/UserFlowGuide.test.tsx` — passed 39/39 tests across 3/3 files; zero failures or skips.
- `npm --prefix apps/web run test -- --run` — passed 351/351 tests across 71/71 files; zero failures or skips. Existing React `act(...)` and Component Gallery nested-button warnings remain outside this change.
- `npm run typecheck:web` — passed with zero TypeScript errors.
- `npm run build:web` — passed; 1,697 modules transformed and the production bundle completed successfully.
- Targeted ESLint across all changed frontend files — passed with zero errors and one existing `react-hooks/exhaustive-deps` warning in `TaskDetailDrawer.tsx`.
- `npm run docs:check` — passed 5/5 documentation-governance tests and the documentation validation command.
- Desktop visual check at 1440 × 900 — passed using contract-valid Requirement fixtures; only Requirement content rendered and controls remained aligned.
- Mobile visual check at 390 × 844 — passed after constraining the external Requirement URL; content remained within the card with readable controls and no horizontal overflow.
- `git diff --check` — passed with no whitespace errors.

## Risks or follow-up

- Existing Product Brief, QA document, and Task attachment records remain persisted but are intentionally not accessible from the Requirements tab. A separate explicitly approved navigation task is required if those legacy document surfaces need a new location.
- No authenticated backend/database integration test was required because this change does not alter persistence, contracts, or authorization; frontend tests use contract-valid fixtures only.

## TODO update

- `TASK-REQUIREMENTS-ONLY-TAB` → `Done`.
