# Delete Safety and Human Errors — 2026-08-31

## Task

`DELETE-SAFETY-AND-HUMAN-ERRORS` from `TODO.md`.

## Outcome

- PO, Owner, and Admin can now open a persisted subtask from the PO Cockpit and use the existing soft-delete confirmation flow directly there.
- The Task Specs tab now lists persisted Task attachments. Planners and the original uploader can remove ordinary attachments after confirmation; `qa_evidence` is visibly marked immutable and has no delete control.
- Successful task and subtask deletion activity retains the actor, record type, title, hierarchy context, and delivery area. Attachment deletion already records the actor, file name, and category; the Activity tab now renders attachment, comment, and deletion events in readable language.
- Folder archive/unarchive requests now pass the authenticated actor into `FolderActivityModel`.
- API failures now retain status/code for permission-aware UI handling while presenting safe Indonesian copy. Deletion blockers and immutable formal QA evidence provide targeted next steps; 5xx responses no longer expose server details.
- Nested confirmation dialogs now use unique accessible title IDs.

## Authorization and data impact

- No authorization policy changed. The backend remains the authority for all delete/archive mutations.
- Formal QA evidence, Test Result-linked attachments, Bugs, QA Sign-offs, and Release Decisions remain immutable blockers.
- No migration is required. Existing task and folder activity tables store the added metadata/actor values.

## Validation

- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/web run test -- apiClient.test.ts taskService.test.ts PoTeamICardGrid.test.tsx TaskAttachmentsPanel.test.tsx TaskDetailDrawer.test.tsx` — 40/40 passed across 5 files.
- `npm --prefix apps/api run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/modules/tasks/__tests__/taskDeletionApiIntegration.test.js apps/api/dist/modules/folders/__tests__/folderApiIntegration.test.js` — 13/13 passed on the disposable PostgreSQL test database; 0 skipped.
- `npm --prefix apps/web run build` — passed. Existing Vite large-chunk advisory remains (main JS 1,308.71 kB; gzip 306.82 kB).
- `git diff --check` — passed.
- Vercel Production deployment `dpl_BZDMrFpmXJkRj88AAgs84qT1W4wk` — `Ready` at `https://qlickhub.vercel.app`.
- Production `GET /health` and `GET /v1/health` — both `200`, each reporting `database.status=connected`.

## Production UAT boundary

No Production record was deleted during implementation. A Production delete UAT must create explicitly disposable records and receive confirmation immediately before the final deletion action; existing formal-evidence UAT records remain out of scope.

## Follow-up: deleted Subtask Activity retention

The first release correctly persisted a `deleted` Task Activity row, but the parent Feature Activity query initially selected only non-deleted subtasks. A soft-deleted Subtask therefore disappeared from the aggregation that should display its retained audit event. The query now includes soft-deleted direct Subtasks and joins their Task context with `paranoid: false`, so the Feature Activity tab returns the actor, deletion event, title, and delivery area.

- Regression signal before fix: `taskActivityApi.test.ts` failed to find the deleted Subtask event in the parent Feature Activity response.
- After fix: `npm --prefix apps/api run build` plus the focused Activity and deletion integration suites — 10/10 passed against the disposable PostgreSQL test database.
- Production deployment `dpl_DGGn566UDTEKu3hUms9BvnieGCAg` — `Ready` at `https://qlickhub.vercel.app`; `GET /health` returned `200` with `database.status=connected`.
