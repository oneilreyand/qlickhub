# ADR-012: Guarded Mistaken Requirement Deletion

**Status:** Accepted
**Date:** 2026-09-11
**Decision owners:** Product and Engineering

## Context

The Requirement correction workflow supports unlinking a reusable Requirement from one Task and
marking a no-longer-valid Requirement as deprecated. It does not address accidental bulk creation,
such as creating ten Requirements when only one should exist. Keeping nine never-used mistakes as
deprecated records makes planning lists noisy, while unconstrained hard deletion could destroy
Requirement coverage, Test Case mappings, Bug provenance, or immutable QA history.

## Decision

1. A permanent-delete action is added to the existing Task-scoped bulk Requirement correction
   workflow. It is not a general data-cleanup endpoint.
2. Only active `owner`, `admin`, and `po` Workspace memberships may use the action. The request must
   include the exact typed confirmation `DELETE`; frontend visibility does not replace backend
   authorization or validation.
3. Every selected Requirement must belong to the Workspace, be linked to the current Task, and have
   no link to any other Task or Subtask.
4. Every selected Requirement must have zero legacy or canonical Test Case references and zero Bug
   references. One unsafe Requirement rejects the complete batch without a partial deletion.
5. Acceptance Criteria belong to the deleted Requirement definition and may be deleted with it only
   after the downstream-reference guards pass.
6. The transaction removes the current `task_requirements` link, the Requirement and its
   definition-owned Acceptance Criteria, and appends `requirements_bulk_deleted` Task Activity with
   the deleted identifiers, codes, and titles. Existing Activity history remains.
7. Requirements that have participated in delivery use `deprecated`; Test Results, QA evidence,
   Bugs, and other delivery history are never deleted or detached through this action.
8. The existing endpoint is extended additively with a `delete` action and conditional confirmation.
   Existing `unlink` and `deprecate` clients remain compatible. No schema migration is required.

## Consequences

- A Planner can remove many accidental, unused Requirements in one intentional operation.
- PostgreSQL and backend checks fail closed when traceability exists, even if a client bypasses the
  UI.
- The deleted Requirement text and Acceptance Criteria no longer exist; the Task Activity retains a
  minimal correction summary, not the full deleted content.
- Concurrent link or QA-reference creation cannot silently bypass the transactional Requirement row
  locks and database foreign keys.

## Alternatives considered

- **Only hide deprecated Requirements:** rejected because never-used accidental records still remain
  in Workspace planning data and can confuse future selection.
- **Allow deletion after Test Case or Bug use:** rejected because it would detach or erase canonical
  traceability and conflict with immutable QA evidence.
- **Delete any selected Requirement and cascade all references:** rejected because referential
  success is not equivalent to product-safe deletion.
