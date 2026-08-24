## Task

TSK-8.4 — Protect Task/Subtask deletion when release-critical records still exist.

## Outcome

Owner, Admin, and PO remain the only roles permitted to delete a Task or direct Subtask. Dev, QA, non-members, unauthenticated users, and cross-Workspace identifiers are rejected by the authenticated backend even if they call the endpoint directly.

Deletion now checks the selected Task plus its direct Subtasks in one transaction and returns HTTP 409 while any Requirement link, document link, attachment/evidence, Bug, QA Sign-off, or Release Decision remains. Requirement/document links and ordinary removable attachments can be cleared through their existing authorised paths. Immutable QA evidence, Bugs, QA Sign-offs, and Release Decisions cannot be deleted merely to make Task deletion possible, so the Task remains their durable historical anchor.

PostgreSQL independently rejects soft deletion that bypasses the service while critical records remain. It also rejects new attachments, Requirement links, document links, Bugs, QA Sign-offs, or Release Decisions that reference a soft-deleted Task. The Task and direct Subtasks are locked during the check so a concurrent critical-link insertion cannot race the deletion.

The shared Task and Subtask confirmation UI now distinguishes removable prerequisites from permanent history blockers. If the API rejects deletion, the confirmation remains open and the backend explanation is shown through the existing error notification.

## Changed files

- `apps/api/src/db/migrations/20260824000056-protect-release-critical-task-deletion.cjs` — adds six active-Task reference triggers and one release-critical soft-deletion guard.
- `apps/api/src/modules/tasks/taskService.ts` — locks the target Task tree, counts critical records, returns a detailed conflict, and preserves the existing atomic soft-delete/activity flow for clean targets.
- `apps/api/src/modules/tasks/taskController.ts` — maps deletion conflicts to RFC 9457 HTTP 409 responses.
- `apps/api/src/modules/tasks/__tests__/taskDeletionApiIntegration.test.ts` — proves role boundaries, Task-tree blockers, database bypass protection, inactive-reference rejection, successful soft deletion, and audit persistence through authenticated HTTP and PostgreSQL.
- `apps/api/src/modules/requirements/__tests__/requirementApiIntegration.test.ts` — uses forced deletion only in fixture teardown where a Product Brief link intentionally blocks production soft deletion.
- `apps/api/scripts/verifyTaskDeletionSafety.cjs` and `apps/api/package.json` — add repeatable targeted/full validation on a disposable PostgreSQL database and verify all seven triggers.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` and `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx` — explain cleanup prerequisites and immutable blockers in both deletion entry points.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` and `apps/web/src/components/ui/organisms/__tests__/SubtaskList.test.tsx` — cover role visibility, blocker guidance, success refresh, and retained error state.
- `docs/plans/QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` — records the Task-deletion integrity and authorization invariants.
- `TODO.md` and `docs/archive/TODO_COMPLETED_2026-08-24.md` — claim and archive the completed item.

## Validation

- `npm run typecheck --workspace apps/api` — passed.
- `npm run typecheck --workspace apps/web` — passed.
- `npm run db:verify:clean-migrations --workspace apps/api` — passed all 40 canonical migrations from 17 through 56 on disposable PostgreSQL; 0 skipped.
- `npm run db:verify:task-deletion-safety --workspace apps/api` — API build passed; all seven triggers were present; 6/6 targeted HTTP/PostgreSQL scenarios passed in 1 suite, 0 skipped; disposable database removed afterward.
- `TASK_DELETE_VERIFY_FULL_SUITE=true npm run db:verify:task-deletion-safety --workspace apps/api` — API build passed; 223/223 tests passed in 62 suites, 0 skipped, on a fresh disposable PostgreSQL database; database removed afterward.
- `npm test --workspace apps/web -- --run src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx src/components/ui/organisms/__tests__/SubtaskList.test.tsx` — passed 30/30 in 2 files, 0 skipped.
- `npm test --workspace apps/web` — passed 255/255 in 57 files, 0 skipped.
- `npm run build --workspace apps/web` — passed; retained the existing Vite advisory for a minified main chunk larger than 500 kB.
- `git diff --check -- <TSK-8.4 files>` — passed.

## Risks or follow-up

- A Task with immutable release history intentionally cannot be deleted. A future archive/restore or retention policy would require a separate explicit product decision.
- The confirmation reports blocker categories before the request, while exact counts come from the HTTP 409 response after the server checks persisted state.
- No visual browser session was run. The changed UI reuses the existing responsive shared modal/alert surfaces and is covered by component and full frontend regression tests.

## TODO update

- TSK-8.4 — Protect Task/Subtask deletion when release-critical records still exist → `Done` and archived.
