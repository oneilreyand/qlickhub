# QA E2E Lifecycle Alignment — Implementation Report

## Task

QA-E2E-01-LIFECYCLE-ALIGNMENT: align QA Subtask execution, Test Case revision, UI actions, and
backend authorization with the canonical end-to-end QA flow.

## Outcome

- The root Feature remains the cross-role container; QA execution is owned through an assigned QA
  Subtask.
- Assigned QA execution now follows `todo → in_progress → done` without a self-review state.
- Reopening `done → in_progress` requires a non-empty reason and persists that reason in Task
  activity.
- Legacy QA Subtasks in `in_review` can recover to `in_progress` or `done`; completion clears stale
  `reviewedBy` attribution instead of recording QA as its own reviewer.
- QA members who are not the assignee do not receive QA Subtask status actions. Planner management
  rights and role-level Test Management/Bug permissions remain unchanged.
- Planner return of a Test Case from `in_review → draft` now matches the canonical lifecycle.
- QA Subtask completion remains distinct from QA Sign-off and the Product Owner release decision.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, ADR-011, and
  `docs/features/QA_E2E_LIFECYCLE_ALIGNMENT.md`.
- **Policy IDs:** `DOMAIN-002`, `AUTH-002`, `FLOW-001`, `FLOW-002`, `QA-001`, `QA-004`,
  `RELEASE-002`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-004`.
- **Data/interface impact:** Existing Task, TaskActivity, and TestCase records/interfaces are reused.
  QA completion no longer writes self-review attribution. No shared response or request shape changed.
- **Authorization impact:** QA Subtask lifecycle mutations are assignment-scoped for QA members;
  generic QA review applies to Development Subtasks in `in_review`. Planner rights are unchanged.
- **Migration risk:** None. No schema or migration change.

## Changed files

- `docs/adr/ADR-011-QA-SUBTASK-LIFECYCLE-ALIGNMENT.md` — records the accepted lifecycle decision.
- `docs/2_WORKFLOW_AND_ROLES.md` and `docs/POLICY_REGISTRY.md` — define the Development/QA split
  and register `QA-004`.
- `docs/features/QA_E2E_LIFECYCLE_ALIGNMENT.md` — captures scope, acceptance criteria, impact, and
  deferred slices.
- `apps/api/src/policies/taskPolicy.ts` — enforces assigned QA execution, reasoned reopen, legacy
  recovery, and Development-only review behavior.
- `apps/api/src/policies/testManagementPolicy.ts` — permits planner `in_review → draft` Test Case
  revision.
- `apps/api/src/modules/tasks/internal/taskLifecycle.ts` — prevents self-review attribution on QA
  completion and clears it during legacy recovery.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — removes the invalid self-review
  action, adds direct completion/recovery labels, explains the boundary, and scopes status controls.
- Policy, PostgreSQL integration, Test Management integration, and QA desk tests — prove the new
  lifecycle and persisted audit behavior.

## Validation

- `npm --prefix apps/api run test:integration` — passed 400/400 tests across 94 suites against the
  disposable PostgreSQL test database; 0 failed, 0 skipped. Expected fixture logs reported missing
  SMTP configuration and skipped FCM delivery without device tokens. One asynchronous notification
  cleanup warning occurred in this broad run; the final isolated fixture was corrected and the
  targeted PostgreSQL rerun below completed without that warning.
- `NODE_ENV=test node --test dist/modules/tasks/__tests__/taskStateMachine.test.js dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js`
  — final targeted PostgreSQL verification passed 14/14, 0 failed, 0 skipped.
- `node --import tsx --test apps/api/src/policies/__tests__/taskPolicy.test.ts apps/api/src/policies/__tests__/testManagementPolicy.test.ts`
  — passed 17/17, 0 failed, 0 skipped.
- `npm --prefix apps/web test -- --run src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx`
  — passed 13/13 with no warnings.
- `npm --prefix apps/web test -- --run` — passed 369/369 across 73 files, 0 failed, 0 skipped. Existing
  React `act(...)` warnings remain in unrelated drawer/settings/timeline/header tests, and the existing
  Component Gallery DateRangePicker test reports nested-button DOM markup.
- `npm --prefix apps/api run build` — passed.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/web run build` — passed; 1,699 modules transformed.
- Targeted ESLint for all changed TypeScript/React files — passed with 0 errors and 0 warnings.
- `npm run docs:check` — passed 5/5 checker tests and documentation governance.
- `git diff --check` — passed.
- Static responsive review — existing `flex-col md:flex-row`, wrapping action group, shared Button,
  and approved text tokens remain intact. An authenticated browser UAT was not run.

## Risks or follow-up

- `TestRun` still lacks explicit `featureTaskId` and `qaSubtaskId`; evidence-gated QA completion is
  unsafe until that scope is persisted.
- Formal Bug retest attempts and derived Developer handback/rework metrics are not part of this slice.
- A later slice should bind Test Case execution ownership to the assigned QA Subtask and then enforce
  coverage, latest-pass, and severe-Bug gates before QA execution completion.

## TODO update

- `QA-E2E-01-LIFECYCLE-ALIGNMENT` → `Done`.
