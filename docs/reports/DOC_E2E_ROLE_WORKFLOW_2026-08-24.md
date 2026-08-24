## Task

DOC-E2E-ROLES: Document the approved end-to-end workflow for every Workspace role.

## Outcome

Published a role-based E2E guide covering Owner, Admin, PO, Developer, and QA from Workspace
governance through an auditable QA Sign-off, independent Release Decision, and explicit parent
Feature closure. The guide describes backend-derived work queues, persisted evidence, role handoffs,
and rejection paths without inventing new product policy.

Data/interface impact: none. Authorization impact: none; the document reflects existing backend
policy. Migration risk: none.

## Changed files

- `docs/plans/ROLE_BASED_E2E_WORKFLOW.md` — approved role-by-role E2E workflow, boundaries, handoffs, queue reference, and exceptions.
- `TODO.md` — records the completed documentation task.

## Validation

- Reviewed against `docs/adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md`, `docs/adr/ADR-002-DEVELOPER-SPECIALTIES-AND-DELIVERY-ASSIGNMENT.md`, `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md`, and the backend `workQueue` contract/service.
- `npm exec prettier -- --write docs/plans/ROLE_BASED_E2E_WORKFLOW.md` — passed.
- `npm exec prettier -- --check docs/plans/ROLE_BASED_E2E_WORKFLOW.md` — passed.
- `git diff --check -- TODO.md` — passed.

## Risks or follow-up

- The guide documents the accepted current implementation. Any new role, transition, gate, or
  automation must first be approved as a product/policy change and then implemented in the backend.
- Application tests were not run because no executable code, contract, migration, or policy changed.

## TODO update

- DOC-E2E-ROLES: Document the approved end-to-end workflow for every Workspace role → Done
