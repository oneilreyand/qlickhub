## Task

QA-DISCUSSION-CONTRAST

## Outcome

Plain text in a discussion message now inherits the sender bubble's text color. A QA message in the lime sender bubble therefore uses the product charcoal `#141413`, instead of the renderer's forced light text in dark mode.

The reported Test Management error is a separate database-schema issue: the running API queries `deduplicated_at`, which is supplied by the existing additive migration `20260824000061-add-evidence-links-unique-indexes.cjs`. The active database has not received that migration yet.

## Changed files

- `apps/web/src/components/ui/molecules/DiscussionMediaRenderer.tsx` — removes the hard-coded dark-mode text color so message content inherits its bubble contrast.
- `apps/web/src/components/ui/molecules/__tests__/DiscussionMediaRenderer.test.tsx` — regression coverage for sender-bubble text inheritance.
- `TODO.md` — records validation and the two independent blockers.

## Validation

- `npm --prefix apps/web test -- DiscussionMediaRenderer.test.tsx` — passed, 1 file and 12 tests.
- `npm --prefix apps/web run build` — blocked by unrelated current changes in `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx`: `WorkspaceMemberItem.specialties` is optional where a required array is expected (lines 1070 and 1108).
- `git diff --check` — passed.

## Risks or follow-up

- Apply migration 61 only to the confirmed development database, then restart the active API and verify `GET /v1/workspaces/:workspaceId/tasks/:taskId/test-executions` no longer reports the missing `deduplicated_at` column.
- Do not resolve the unrelated `TaskDetailDrawer.tsx` type errors without confirming ownership/scope of those in-progress changes.

## TODO update

- QA-DISCUSSION-CONTRAST → Blocked
