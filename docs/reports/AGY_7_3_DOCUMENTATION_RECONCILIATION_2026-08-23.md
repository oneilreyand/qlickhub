# AGY-7.3 Documentation Reconciliation — 2026-08-23

## Task

AGY-7.3: Reconcile product documentation and archive the phase.

## Outcome

The active product documentation now describes the repository's implemented Workspace schema, routes, UI modules, server authorization, release workflow, and validation baseline. Historical intent and pending owner proposals are explicitly separated from current behavior:

- the delivery plan uses canonical `workspace_id`, `tasks`, Requirement/Test/Bug/release records, and a release-critical database diagram;
- the frontend plan lists the actual routes and Task Hub/My Tasks modules, including the retained protected Component Gallery utility;
- the permission matrix matches current backend policy rather than the older Product/Lead-QA/Viewer assumptions;
- ADR-001 remains proposed and now records gaps between its proposals and the implementation without treating them as owner-approved decisions;
- completed AGY-0.1 through AGY-7.3 work is archived, while active `TODO.md` contains only blocked AGY-0.3 and explicitly deferred future work.

## Confirmed facts

- Browser routes currently include `/work`, `/my-tasks`, `/reports`, `/user-flows`, `/workspaces/settings`, `/components`, compatibility `/requirements` and `/tests`, and durable `/projects/:projectId/tasks/:taskId`.
- Backend domain routes and constraints are Workspace-scoped even though the durable compatibility URL names the parameter `projectId`.
- Test Cases currently map to Requirements through `test_case_requirements`; Acceptance Criteria have stable identity but do not yet have a Test Case mapping table.
- An explicit parent-Task creation permission can currently be granted to any Workspace member, so both Dev and QA can receive it; only Owner/Admin/PO may plan subtasks.
- Attachments are persisted and authorised, and Test Result evidence can reference `task_attachments`.
- Component Gallery still exists as a protected planner-visible `Dev` route; it was not falsely documented as removed.

## Unresolved decisions

- AGY-0.3 still requires the owner to approve or change the implemented task-creation grant scope, QA Test Case mapping authority, Requirement-vs-Acceptance-Criterion coverage target, and permanent evidence policy.
- No schema, policy, role, or workflow behavior was changed during this documentation slice.

## Changed files

- `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` — reconciles status, product flow, canonical data model/diagram, API areas, permission matrix, historical delivery status, and consolidated verification evidence.
- `DESIGN_IMPLEMENTATION_PLAN.md` — reconciles actual routes, navigation, Task detail/My Tasks modules, delivered frontend slices, validation baseline, and pending policy boundaries.
- `docs/adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md` — separates the implemented snapshot from proposals awaiting owner approval and corrects migration 48/49 history.
- `docs/archive/TODO_COMPLETED_2026-08-23.md` — archives completed AGY roadmap outcomes and report links.
- `TODO.md` — removes completed items and keeps only unfinished/blocked/deferred work.
- `docs/reports/AGY_7_3_DOCUMENTATION_RECONCILIATION_2026-08-23.md` — records this handoff.

## Data/interface impact

- None. Documentation now names existing tables, joins, routes, and read models; no contract, API, model, or migration changed.

## Authorization impact

- None. The matrix is descriptive of current backend policies. ADR-001 and TODO explicitly prevent that description from being interpreted as owner approval of pending policy choices.

## Migration risk

- None. No migration changed. Documentation records that migration 48 remains immutable history and additive migration 49 provides recovery.

## Validation

- Compared the reconciled route table against `apps/web/src/app/App.tsx` and `apps/web/src/components/layout/Sidebar.tsx` — matched current protected and compatibility routes.
- Compared the permission matrix against Task, Requirement, Test Management, Bug, release-decision, QA-document, attachment, Workspace, and folder policies/routes — matched current implemented role gates and assignment scopes.
- Compared the database diagram against Sequelize models/associations and canonical migrations 49–54 — matched current release-critical Workspace relationships and the Requirement-level Test Case mapping.
- Local Markdown link existence check across `TODO.md`, delivery/design plans, ADR-001, and the new archive — passed after this report was added.
- `git diff --check` on all AGY-7.3 documentation files — passed.
- No application tests were rerun because AGY-7.3 changes documentation only. The immediately preceding AGY-7.2 final baseline remains: contracts 49/49, API 207/207 in 60 suites, frontend 249/249 across 56 files, 0 skipped, all typechecks/builds passed, and all 38 migrations plus the full release tracer passed on a disposable PostgreSQL database.

## Risks or follow-up

- AGY-0.3 remains blocked pending owner approval; implementation must not diverge from current server policy without that decision.
- Component Gallery remains a protected development utility. Its future removal would require a separate claimed cleanup task and route/import verification.
- The web build retains the existing non-runtime >500 kB Vite chunk advisory recorded by AGY-7.2.

## TODO update

- AGY-7.3: Reconcile product documentation and archive the phase → `Done` and archived.
- AGY-0.3: Confirm unresolved domain policy → `Blocked` in active `TODO.md`.
