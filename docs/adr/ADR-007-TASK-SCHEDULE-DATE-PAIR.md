# ADR-007 — Complete Task and Subtask timeline date pairs

- **Status:** Accepted
- **Date:** 2026-09-07
- **Decision owner:** Product owner
- **Applicable Policy IDs:** `FLOW-002`, `FLOW-004`, `CONTRACT-001`, `DATA-002`, `TEST-001`

## Context

Task and Subtask creation accepted `startDate` or `dueDate` independently. The shared contract and
backend compared their order only when both values existed, the forms submitted a blank counterpart
as omitted, and PostgreSQL allowed either nullable column independently. This produced an incomplete
timeline even though the two fields jointly describe one schedule.

The owner reported the behavior on 2026-09-07 and requested validation for both Task and Subtask
creation. The resulting invariant must also apply to later edits and non-UI callers so the same
invalid state cannot be reintroduced through another authenticated interface.

## Decision

A Task or Subtask timeline has exactly two valid states:

1. unscheduled: both `startDate` and `dueDate` are null; or
2. scheduled: both dates are present and `startDate <= dueDate`.

The shared create contract rejects an incomplete or reversed pair. Update remains a partial API
contract, so the backend validates the merged persisted state after applying the requested fields.
Task and Subtask create/edit forms show the same validation before sending a request. PostgreSQL
enforces the final invariant with an additive check constraint.

## Data, interface, and authorization impact

- Request and response field names and types do not change.
- Previously accepted one-sided date mutations return the existing bad-request error family.
- Planner authorization remains unchanged under `FLOW-002`; validation does not grant new access.
- Existing records are not rewritten. Before implementation, aggregate audits found zero invalid
  records among 3 local Tasks and 5 Production Tasks.

## Migration and rollback

The migration first checks for incomplete or reversed historical rows and stops with an explicit
error instead of silently changing product data. It then adds one check constraint. Rollback removes
only that constraint. Production deployment and migration execution are outside this implementation
task and require the normal release gates.

## Validation

Required evidence includes shared-contract regression tests, Task and Subtask UI tests, authenticated
PostgreSQL integration tests for create/update behavior and rollback, direct database-constraint
evidence, clean canonical migration application, build, and repository validation.
