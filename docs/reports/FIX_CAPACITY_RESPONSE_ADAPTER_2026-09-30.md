# Fix Capacity Response Adapter — Evidence Report

**Task:** `FIX-CAPACITY-RESPONSE-ADAPTER`
**Status:** Owner-approved locally — automated validation passed; authenticated manual recheck pending
**Policy boundaries:** `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`
**Related plan:** [Fix Capacity Response Adapter Plan](../plans/FIX_CAPACITY_RESPONSE_ADAPTER_PLAN.md)

## Diagnosis

The authenticated capacity controller returns direct JSON bodies, and the shared frontend `apiClient`
also returns a direct JSON body. The capacity frontend adapter then incorrectly accessed `response.data`.
The resulting `undefined` was passed to the Zod response schema and produced the visible required-object
error when a user entered a valid Subtask schedule.

## Evidence outcome

- The focused regression test first failed 2/2 with the same Zod required-object error shown in the
  Task Hub. After the adapter repair, it passed 2/2 for both direct assignment-preview and direct
  timeline bodies.
- `npm --prefix apps/web run typecheck` passed.
- `npm --prefix apps/web run build` passed with 1,722 transformed modules.
- `npm run docs:check` passed with 8 tests passed, 0 failed, 0 skipped.
- The existing Task Hub browser session was redirected to login during hot reload before the visual
  retry could be run. No credentials were entered or session bypass attempted; that authenticated
  manual check remains pending for the next signed-in session.
- No backend, contract, authorization, database, migration, deployment, or production-data change is
  included.

## Quality review

- **Reuse:** the adapter continues to use the existing shared capacity response schemas and common
  `apiClient`; no parallel request or validation layer was introduced.
- **Duplicate/overlap:** none found. The two affected methods now use the same established direct-body
  behavior already used by `apiClient` and asserted by backend integration tests.
- **Obsolete material:** the incorrect envelope assumption was removed; no dead code was added.
- **Boundary:** capacity conflict calculation, PostgreSQL access, authorization, and response shape
  remain backend-owned. The frontend only validates and presents the authenticated result.

## Independent verification status

Owner approval record verified: [Issue #1 comment #5909479401](https://github.com/oneilreyand/qlickhub/issues/1#issuecomment-5909479401).
The authenticated manual recheck, independent PR review, and merge remain pending.
