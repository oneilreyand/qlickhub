# Clarify Task Detail and Product Brief Labels — 2026-09-25

## Task

`CLARIFY-TASK-DETAIL-AND-PRODUCT-BRIEF-LABELS`

## Outcome

Task detail navigation now distinguishes its two concepts: the operational overview is **Detail
Task**, while the versioned Feature context and scope document is **Brief Produk**. The latter
name is also used consistently in its heading, fields, messages, empty/error/read-only states, and
unsaved-draft confirmation.

## Work assurance

- **Work Readiness Assessment:** 2/16, `Ready`. Requirement clarity 0, affected layers 0
  (frontend only), data/migration 0, authorization 0, shared contract 0, touchpoints 1, validation
  1, external dependency 0.
- **Agent capability and access:** The executor inspected the applicable SSoT, current drawer and
  Product Brief implementation, and its component tests; it could run local frontend checks and
  production build. No database, deployment, or authenticated browser session was needed because
  the change is presentation-only.

| Acceptance Criterion                                                                                  | Required / achieved evidence level | Primary evidence and environment                                                                    | Verification status |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------- |
| Tabs clearly distinguish operational Task detail from the Feature context document.                   | E2 / E2                            | `TaskDetailDrawer.test.tsx` asserts unique accessible tab names and opening the Brief Produk panel. | Accepted            |
| Product Brief wording is consistent for normal, empty, error, read-only, and draft-protection states. | E2 / E2                            | Focused Task Detail and Product Brief tests exercise rendered labels and draft protection.          | Accepted            |
| The rename does not alter contracts, authorization, persistence, or build compatibility.              | E1 + E2 / E2                       | Diff inspection; frontend typecheck and full repository build.                                      | Accepted            |

- **Change Impact Map:** Feature-level presentation change limited to the Task Detail drawer and
  Product Brief tab. No contract, database, migration, authorization, release, or operational
  effect. Existing loading, empty, error, disabled, and read-only states were retained and renamed.
- **Decision Snapshot:** The earlier `Ringkasan Task` / `Ringkasan` pair was ambiguous. `Detail
Task` identifies the operational record; `Brief Produk` names the Product Brief domain document
  without reintroducing the longer old label. Rollback is a text-only reversal with no data impact.
- **Agent handoff and independent verification:** Local deterministic component checks and build
  provide executed evidence for this small change. A separate semantic reviewer was not run; no
  deployment was requested.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md) defines Product Brief ownership and
  scope; [Workflow](../2_WORKFLOW_AND_ROLES.md) defines Planner ownership; [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md)
  defines the Task Detail drawer and its Product Brief tab; [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md)
  defines the WRA and evidence process.
- **Policy IDs:** `DOMAIN-004`, `UI-001`, `UI-002`, `AI-002`, `AI-003`, `AI-005`, `DOC-003`,
  `DOC-004`.
- **Data/interface impact:** None.
- **Authorization impact:** None; Planner-only mutation behavior remains unchanged.
- **Migration risk:** None.

## Changed files

- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — renames drawer tabs and its
  Product Brief load/draft messaging.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailProductBriefTab.tsx` — uses consistent
  Brief Produk copy and default title.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — asserts the new tab
  names and draft protection copy.
- `apps/web/src/components/ui/organisms/taskDetail/__tests__/TaskDetailProductBriefTab.test.tsx` —
  asserts Product Brief labels and states.
- `TODO.md` — records the completed work and evidence.

## Validation

- `npm --prefix apps/web run test -- src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/taskDetail/__tests__/TaskDetailProductBriefTab.test.tsx` — passed: 2/2 files, 39/39 tests, 0 failed, 0 skipped.
- `npm run typecheck:web` — passed: TypeScript completed with 0 errors.
- `npm run build` — passed: contracts, API, and web builds completed; Vite transformed 1,715 modules.
- `npm run docs:check` — passed: 5/5 checks, 0 failed, 0 skipped; documentation governance passed.
- `git diff --check` — passed: no whitespace errors.

## Risks or follow-up

No data or authorization risk. Authenticated browser UAT and deployment were not requested.

## Human decision summary

The UI now uses distinct names for distinct concepts: **Detail Task** for operational task fields
and **Brief Produk** for Feature context and scope. The implementation has executed component and
build evidence; no product policy or data model changed.

## TODO update

- `CLARIFY-TASK-DETAIL-AND-PRODUCT-BRIEF-LABELS` → `Done`
