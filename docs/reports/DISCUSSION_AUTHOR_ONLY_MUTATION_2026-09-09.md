## Task

DISCUSSION-AUTHOR-ONLY-MUTATION: restrict Task Discussion message editing and deletion to the
signed-in author account.

## Outcome

Only the authenticated author of a non-deleted Task Discussion message can now edit or soft-delete
it. Owner, Admin, PO, Developer, and QA receive the same author-ownership rule; active Workspace
membership or a governance role no longer grants cross-account moderation. The frontend shows
edit/delete actions only on the current account's own root messages and replies in both thread and
bubble layouts. Existing tombstones, valid self-mutation activity, read/post behavior, realtime
events, and API response shapes remain unchanged.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` §5, `docs/2_WORKFLOW_AND_ROLES.md` §2,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`,
  `docs/adr/ADR-009-DISCUSSION-AUTHOR-ONLY-MUTATION.md`, and
  `docs/features/DISCUSSION_AUTHOR_ONLY_MUTATION.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-008`, `DATA-001`, `UI-001`, `UI-002`,
  `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Existing persisted `task_comments` and `task_activity` continue to use
  the same fields and response contracts. Valid self-edit and self-delete activity metadata now
  contains only the comment ID because cross-account moderation no longer exists.
- **Authorization impact:** Tightened. After active Workspace membership and Task/Workspace scope
  checks, `PATCH` and `DELETE` require `actorId === comment.authorId`; every non-author receives
  `403 Forbidden`, including Workspace Owner and Admin.
- **Migration risk:** None. No model, table, index, constraint, or migration changed.

## Changed files

- `apps/api/src/modules/tasks/taskDiscussionService.ts` — removes Owner/Admin moderation bypasses
  and authorizes edit/delete only for the persisted message author.
- `apps/api/src/modules/tasks/__tests__/taskDiscussionApi.test.ts` — proves author success and
  rejection of QA, Owner, and Admin cross-account edit/delete against PostgreSQL.
- `apps/web/src/components/ui/molecules/TaskCommentBox.tsx` — applies one author-only action
  predicate to root messages and replies in both layouts.
- `apps/web/src/components/ui/molecules/__tests__/TaskCommentBox.test.tsx` — proves another
  account's actions remain hidden in thread and bubble layouts.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — aligns frontend mutation guards
  with author-only ownership and removes the role-based management flag.
- `docs/adr/ADR-009-DISCUSSION-AUTHOR-ONLY-MUTATION.md` — records the approved authorization
  change and consequences.
- `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`, and `docs/POLICY_REGISTRY.md` — make
  `AUTH-008` canonical across architecture and role workflow.
- `docs/plans/TASK_SUBTASK_COLLABORATION_PLAN.md` — supersedes the earlier Owner/Admin moderation
  row.
- `docs/features/DISCUSSION_AUTHOR_ONLY_MUTATION.md` — records cross-role acceptance, API,
  authorization, UI, and evidence boundaries.
- `TODO.md` — claims and completes the scoped task.

## Validation

- Red frontend regression,
  `npm --prefix apps/web run test -- src/components/ui/molecules/__tests__/TaskCommentBox.test.tsx`
  — reproduced the bug: 10 passed, 1 failed because another account's Edit action rendered.
- Red PostgreSQL regression,
  `NODE_ENV=test node --test apps/api/dist/modules/tasks/__tests__/taskDiscussionApi.test.js` —
  reproduced the backend bug: 5 passed, 1 failed because Workspace Owner edit did not reject.
- Focused frontend regression, same command after the fix — passed 11/11 before the final
  thread/bubble parameterization; the complete frontend run below passed the final 12-test file.
- Focused PostgreSQL regression, same command after adding explicit Owner/Admin coverage — passed
  6/6, zero failed/cancelled/skipped, against the configured local PostgreSQL test database.
- `npm --prefix apps/api run test:integration` — passed 399/399 across 94 suites, zero
  failed/cancelled/skipped, against PostgreSQL. Firebase/FCM and SMTP remained unavailable external
  seams and reported their normal skipped-delivery diagnostics; no application test was skipped.
- `npm --prefix apps/web run test` — passed 350/350 across 71 files, zero failed/skipped. Existing
  non-failing React `act(...)` and Component Gallery DOM-nesting warnings remain.
- `npm run build` — contracts, API, and frontend production builds passed; Vite transformed 1,697
  modules and completed successfully.
- `npm run validate` — documentation governance passed; lint passed with 0 errors and 26 existing
  warnings; contracts, API, and frontend typechecks passed.
- `git diff --check` — passed with no whitespace errors after the final documentation adjustment.
- Static authorization audit — no `canManageComments`, comment `isModerator`, or role-based
  Discussion moderation branch remains in `apps/api/src` or `apps/web/src`.

## Risks or follow-up

- No deployment or authenticated browser UAT was requested or performed. The shared component
  ownership predicate is viewport-independent, and automated coverage exercises both thread and
  bubble layouts; release deployment remains a separate operation.
- Any future abuse-moderation capability requires a separate, explicitly approved, auditable
  workflow rather than reusing author edit/delete.

## TODO update

- `DISCUSSION-AUTHOR-ONLY-MUTATION` → `Done`.
