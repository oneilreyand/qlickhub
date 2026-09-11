# ADR-009: Discussion Messages Use Author-Only Mutation

- **Status:** Accepted
- **Date:** 2026-09-09
- **Accepted by owner:** Direct user instruction on 2026-09-08
- **Supersedes:** The Owner/Admin cross-account moderation allowance in
  `docs/plans/TASK_SUBTASK_COLLABORATION_PLAN.md`

## Context

Task Discussion connects Owner, Admin, PO, Developer, and QA accounts in a shared Workspace thread.
The implemented policy allowed a Workspace Owner or Admin to edit or soft-delete a message written
by another account. This made message authorship unreliable because a role holder could mutate
another person's communication.

## Decision

Task Discussion edit and delete operations are author-only. After confirming active Workspace
membership and exact Task/Workspace scope, the backend must require the authenticated actor ID to
equal the persisted comment author ID. This rule applies equally to root messages and replies.

No Workspace role grants cross-account message moderation. Owner, Admin, PO, Developer, and QA may
edit or soft-delete only messages authored by their own signed-in account. Every non-author attempt
returns `403 Forbidden`. The UI presents edit/delete actions only for the signed-in author's own
non-deleted messages, but backend enforcement remains authoritative.

Soft deletion and the existing tombstone remain unchanged. Reading, posting, replying, mentions,
realtime events, activity records for valid self-mutations, API payloads, and database schema also
remain unchanged.

## Consequences

- Message authorship and mutation accountability are consistent across all roles.
- Workspace governance roles cannot remove another account's Discussion content through the normal
  comment mutation endpoints.
- Any future moderation or abuse-management feature requires a separate explicit decision, an
  auditable workflow, and a distinct authorization contract rather than reusing author edit/delete.
- No migration or shared response-contract change is required.
