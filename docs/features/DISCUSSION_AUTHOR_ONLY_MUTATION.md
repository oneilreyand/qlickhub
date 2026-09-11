# Discussion Author-Only Mutation

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-09
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-008`, `DATA-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Preserve trustworthy cross-role communication by ensuring that only the signed-in author account
can edit or delete its own Task Discussion message. The rule applies to Owner, Admin, PO, Developer,
and QA on root messages and replies. Reading, posting, replies, mentions, and a separate future
moderation workflow are outside this authorization change.

## 2. Requirement dan Acceptance Criteria

- **DAM-R1:** An active Workspace member can edit and soft-delete a non-deleted Discussion message
  authored by the same authenticated account.
- **DAM-R2:** Every active non-author, including Owner and Admin, receives `403 Forbidden` when
  attempting to edit or delete another account's message.
- **DAM-R3:** Edit/delete controls render only on the signed-in author's own non-deleted root
  messages and replies in thread and bubble layouts.
- **DAM-R4:** Valid soft deletion retains the existing persisted tombstone and activity record.
- **DAM-R5:** Workspace scope, Task scope, read/post permissions, realtime delivery, and API response
  shapes remain unchanged.

The canonical rule is
[Kepemilikan Mutasi Pesan Discussion](../1_ARCHITECTURE.md#kepemilikan-mutasi-pesan-discussion),
with its decision record linked from that source.

## 3. Alur Lintas Peran

Any active Project Member may participate in Task Discussion. When a member chooses edit or delete,
the backend compares the authenticated user ID with the persisted message `authorId`. Matching
accounts continue through the existing mutation and activity flow; all non-matching accounts are
rejected regardless of Workspace role. The UI applies the same ownership comparison before showing
actions.

## 4. Data dan Relasi

The existing Workspace-scoped `task_comments`, `task_comment_mentions`, and `task_activity` records
remain canonical. Author ID, edited timestamp, deleted timestamp, and tombstone behavior are
unchanged. There is no schema or migration risk.

## 5. API dan Shared Contract

The existing `PATCH` and `DELETE
/v1/workspaces/:workspaceId/tasks/:taskId/comments/:commentId` endpoints and `TaskComment` contracts
remain unchanged. Authorization failures use the existing Problem Details `403 Forbidden` mapping.

## 6. Authorization

`AUTH-001`, `AUTH-002`, and `AUTH-008` apply. Active Workspace membership remains necessary but is
not sufficient for mutation: exact author ownership is also required. Role-based moderation is not
part of these endpoints.

## 7. UI dan Interaction States

The existing `TaskCommentBox` molecule is reused. It renders edit/delete controls only when
`comment.authorId === currentUserId` and the message is not deleted, across desktop/mobile thread
and bubble layouts. Existing loading, empty, error, disabled, confirmation, and permission-denied
feedback remains unchanged.

## 8. Pengujian dan Evidence

PostgreSQL integration tests must prove author success and non-author rejection for both edit and
delete, explicitly including Owner/Admin. Frontend component tests must prove that handlers do not
make another account's controls visible even when a legacy management flag is supplied. Focused
tests, full relevant suites, frontend build, documentation checks, and static validation are
recorded only after execution in the task report.

## 9. Release dan Readiness

This is an authorization-tightening release with no database rollout. Existing messages require no
backfill. Rollback would restore cross-account moderation and therefore requires an explicit policy
decision rather than a data operation. No QA sign-off or release-readiness formula changes.

## 10. Traceability

User instruction → author-only mutation decision record → `AUTH-008` → backend Discussion service
→ `TaskCommentBox` → PostgreSQL and frontend regression tests → task report → TODO status.
