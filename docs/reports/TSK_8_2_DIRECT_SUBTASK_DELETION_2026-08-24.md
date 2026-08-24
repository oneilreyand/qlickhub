## Task

TSK-8.2 — Complete direct Subtask deletion experience.

## Outcome

Owner, Admin, and Product Owner can now delete one Subtask explicitly from its Details workspace inside the parent Feature. The shared confirmation identifies the record as a Subtask, preserves audit/discussion history through the existing soft-delete API, and removes the deleted Subtask from the parent list immediately after success. A direct Subtask URL now uses the same Subtask-specific labels. Dev and QA do not receive the action, while the backend independently rejects them.

## Changed files

- `apps/web/src/components/ui/organisms/SubtaskAccordionItem.tsx` — adds the planner-only shared Delete Subtask action, loading/error handling, confirmation, and snackbar.
- `apps/web/src/components/ui/organisms/SubtaskList.tsx` — forwards planner authority and deletion refresh callbacks to reusable Subtask items.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — refreshes the parent list and uses Subtask-specific direct-link labels and confirmation text.
- `apps/web/src/components/ui/organisms/__tests__/SubtaskList.test.tsx` — covers planner success, non-planner visibility, API failure, and parent refresh.
- `apps/web/src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — covers direct-link Subtask confirmation and persisted deletion.
- `apps/api/src/modules/tasks/__tests__/taskDeletionApiIntegration.test.ts` — proves direct Subtask deletion for Owner/Admin/PO and rejection for Dev/QA against PostgreSQL.
- `TODO.md` and `docs/archive/TODO_COMPLETED_2026-08-24.md` — claim and archive the completed item.

## Validation

- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/api run build` — passed.
- `npm --prefix apps/web test -- --run src/components/ui/organisms/__tests__/SubtaskList.test.tsx src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` — passed 30/30 in 2 files, 0 skipped.
- Clean disposable PostgreSQL migration 17–54 on port 55433 — passed.
- `DATABASE_SSL=false TEST_DATABASE_URL=postgres://mac@127.0.0.1:55433/qa_management_test NODE_ENV=test node --test apps/api/dist/modules/tasks/__tests__/taskDeletionApiIntegration.test.js` — passed 4/4, 0 skipped.
- `npm --prefix apps/web test` — passed 252/252 in 56 files, 0 skipped.
- `npm --prefix apps/web run build` — passed; retained the existing Vite advisory for a main chunk larger than 500 kB.
- `git diff --check -- <TSK-8.2 files>` — passed.
- Disposable PostgreSQL was stopped and its temporary directory removed after validation.

## Risks or follow-up

- Task/Subtask restore and lifecycle guards for Features that already own Test/Bug/Sign-off/Release history remain separate product-policy tasks.
- No visual browser session was run; responsive behavior relies on the existing shared Modal/Button/Alert primitives and the full component regression.

## TODO update

- TSK-8.2 — Complete direct Subtask deletion experience → `Done` and archived.
