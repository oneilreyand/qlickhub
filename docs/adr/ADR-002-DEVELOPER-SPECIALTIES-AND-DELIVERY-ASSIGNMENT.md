# ADR-002 — Developer specialties and delivery-area assignment

- **Status:** Accepted
- **Date:** 2026-08-24
- **Decision owner:** Workspace Owner (approved by the user for implementation)
- **Scope:** DEV-1.1

## Context

Workspace authorization currently has one `dev` role, while Task delivery already distinguishes `frontend`, `backend`, `mobile`, and `fullstack`. The generic role is appropriate for authorization, but it does not identify which development work a member may receive. Existing memberships also cannot be safely classified from historical task titles or assignments.

## Decision

1. Keep `dev` as the only Developer authorization role. Frontend, Backend, Mobile, and Fullstack are specialties of a Developer's Workspace membership, not new authorization roles and not global User attributes.
2. Persist zero or more normalized rows in `workspace_member_specialties`, constrained to the same active Workspace membership and to the `dev` role. New or edited Developer memberships must submit at least one of `frontend`, `backend`, `mobile`, or `fullstack`.
3. Do not infer or backfill specialties for existing Developers. Legacy memberships with no rows remain readable and are shown as **Unclassified Developer**. The backend temporarily preserves their existing assignment capability; planning UI requires classification before offering them for a new development assignment.
4. Once a Developer has at least one persisted specialty, create, reassignment, and delivery-area changes must match that specialty. Owner/Admin/PO remain valid planning assignees. A mismatched executor assignment requires an explicit override by the Workspace Owner and a 10–500 character reason recorded in Task activity.
5. A role or specialty edit is rejected while it would leave an active development subtask assigned to a member who no longer supports that delivery area. Workspace role/specialty changes create Workspace membership activity.
6. QA completion waits for every incomplete development sibling across Frontend, Backend, Mobile, and Fullstack, rather than only FE/BE.
7. Batch member additions verify Owner/Admin authority independently for every selected Workspace. UI visibility never replaces backend authorization.

## Data and interface impact

- Additive table: `workspace_member_specialties(id, workspace_id, workspace_member_id, specialty, created_by, created_at)`.
- Workspace member contracts and authenticated list/add/update interfaces return `specialties`.
- Task create/update contracts accept `roleMismatchReason`; it is required when `allowRoleMismatch` is true.
- Workspace Settings supports classification and exposes the legacy unclassified state. Task planning filters candidates by persisted specialties. Task Hub, My Tasks, Task detail, and Report display all development delivery areas; Report also displays member specialties.

## Authorization and audit impact

- `dev` policy permissions are unchanged.
- Specialty assignment integrity is enforced by the Task service and PostgreSQL guards prevent specialty rows for inactive, cross-Workspace, or non-Developer memberships.
- Only Workspace Owner can override a mismatch. The reason and assignee classification are written to Task activity.
- Role and specialty mutations remain Owner/Admin operations and write `workspace_membership_activity` events.

## Migration and rollback risk

The migration is additive and performs no destructive backfill. Existing Task and membership rows remain readable. Rolling back drops the specialty table and therefore loses classifications created after deployment; a production rollback must export that table first. Classification should be completed gradually for legacy Developers before the temporary unclassified assignment compatibility is removed in a separate, explicitly planned task.

## Validation evidence required

- Clean canonical migrations on a disposable PostgreSQL database.
- HTTP/PostgreSQL integration proving persistence, list visibility, mismatch rejection, active-assignment protection, expanded specialty assignment, and membership audit.
- Contract, API, frontend, typecheck, and frontend build suites with exact pass/fail counts recorded in the DEV-1.1 report.
