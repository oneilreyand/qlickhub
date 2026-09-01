# Subtask Deletion Activity Refresh — 2026-09-01

## Task

SUBTASK-DELETION-ACTIVITY-REFRESH

## Outcome

Deleting a direct Subtask as Owner, Admin, or PO now immediately reloads the parent Feature Activity timeline. The retained soft-delete audit event is shown as `removed a subtask` with the deleted Subtask title and delivery area.

## Diagnosis

- The API already soft-deletes the Subtask and writes its `deleted` activity in the same transaction.
- The parent Activity query deliberately includes soft-deleted direct Subtasks and returned the deletion event in PostgreSQL integration validation.
- The visible issue was stale UI state: the Subtask list removed the item locally after a successful delete, but the parent Feature Activity was not reloaded.

## Changed files

- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — reloads parent Activity after the direct-Subtask deletion callback succeeds.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — adds the PO delete-to-Activity regression path and isolates mock calls per test.

## Validation

- `npm --prefix apps/web test -- src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/__tests__/SubtaskList.test.tsx` — passed, 32/32 tests.
- `npm --prefix apps/api run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/modules/tasks/__tests__/taskActivityApi.test.js` — passed, 4/4 PostgreSQL integration tests; verifies the soft-deleted Subtask event is retained in parent Activity.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/web run build` — passed; existing Vite large-chunk advisory remains.
- `git diff --check` — passed.

## Risks or follow-up

No schema, migration, authorization, or deletion-policy change. The fix is local source validation only and has not been deployed to Production.

## TODO update

`SUBTASK-DELETION-ACTIVITY-REFRESH` → Done
