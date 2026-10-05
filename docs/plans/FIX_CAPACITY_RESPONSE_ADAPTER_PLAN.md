# Fix Capacity Response Adapter Plan

**Status:** Implemented — merged via PR #8 (`52f12f3`) (see [report](../reports/FIX_CAPACITY_RESPONSE_ADAPTER_2026-09-30.md))
**Task:** `FIX-CAPACITY-RESPONSE-ADAPTER`
**Policy boundaries:** `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## Confirmed facts

- The Task Hub Subtask form reproduces a schedule-preview error after an Owner/Admin/PO provides a
  valid assignee, Start Date, and Due Date.
- `apiClient` returns the JSON body directly.
- The capacity controller returns the direct preview and timeline bodies, and the PostgreSQL API
  integration tests assert those direct bodies.
- `apps/web/src/lib/api/capacityService.ts` incorrectly reads `response.data` for both capacity
  endpoints. That value is `undefined`, so Zod reports that an object is required.

## Work Readiness Assessment

| Dimension           |      Score | Basis                                                                            |
| ------------------- | ---------: | -------------------------------------------------------------------------------- |
| Requirement clarity |          1 | The visible error, its deterministic cause, and intended behavior are confirmed. |
| Affected layers     |          1 | Frontend API adapter and its focused test only.                                  |
| Data/migration      |          0 | No persistence, schema, or migration change.                                     |
| Authorization       |          0 | Existing planner-only preview authorization remains unchanged.                   |
| Shared contract     |          1 | The adapter must consume the existing direct capacity response correctly.        |
| Coupling            |          1 | Both preview and timeline use the same incorrect envelope assumption.            |
| Validation          |          1 | Focused regression test, frontend typecheck, build, and manual form recheck.     |
| External dependency |          0 | No vendor, deployment, or credential change.                                     |
| **Total**           | **5 / 16** | **Small — ready for an isolated frontend repair.**                               |

## Acceptance criteria and evidence

| Acceptance criterion                                                                          | Objective evidence                                                                            |
| --------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Valid Start Date and Due Date no longer show the `expected object, received undefined` error. | Focused service regression test and manual recheck in the existing Task Hub form.             |
| Assignment preview parses the direct backend body.                                            | Focused service test with the direct preview body.                                            |
| Team Capacity Timeline parses the direct backend body.                                        | Focused service test with the direct timeline body.                                           |
| Existing server response, authorization, and persistence contracts remain unchanged.          | No API/backend/contract/migration files in the final diff; frontend typecheck and build pass. |

## Change Impact Map

`Task Hub date fields → useAssignmentConflictPreview → capacityService → apiClient direct JSON →
capacity response schema → AssignmentConflictBanner / Team Capacity Timeline`

| Area                                           | Intended impact                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| Capacity frontend adapter                      | Parse the returned body itself rather than a non-existent `data` envelope. |
| Task Hub conflict banner                       | Receives a valid preview or a real API error.                              |
| Team Capacity Timeline                         | Receives a valid timeline body through the same adapter correction.        |
| Backend, contracts, RBAC, database, deployment | No change.                                                                 |

## Decision Snapshot

| Alternative                                                        | Decision | Reason                                                                                                       |
| ------------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------------ |
| Fix the frontend adapter to consume the documented direct response | Selected | Matches `apiClient`, controller behavior, and existing integration tests without changing a public endpoint. |
| Wrap backend capacity responses in `{ data }`                      | Rejected | Expands server/API scope and risks existing callers for no product benefit.                                  |
| Suppress the error banner                                          | Rejected | Hides a real adapter defect and leaves capacity results unavailable.                                         |

## Files and validation

1. `TODO.md`
2. `apps/web/src/lib/api/capacityService.ts`
3. `apps/web/src/lib/api/__tests__/capacityService.test.ts`
4. `docs/plans/FIX_CAPACITY_RESPONSE_ADAPTER_PLAN.md`
5. `docs/reports/FIX_CAPACITY_RESPONSE_ADAPTER_2026-09-30.md`
6. `quality/manifests/FIX-CAPACITY-RESPONSE-ADAPTER.json`

Run the focused regression test, frontend typecheck, frontend build, `npm run docs:check`, and
`npm run quality:check`. Recheck the existing Task Hub form with both dates and an assignee. Recovery
is a revert of this isolated frontend adapter and test.
