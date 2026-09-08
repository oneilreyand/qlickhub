# ADR-008 — Workspace Permanent Deletion

**Status:** Accepted
**Date:** 2026-09-07
**Decision owners:** Product and Engineering
**Applicable Policy IDs:** `AUTH-002`, `AUTH-007`, `DATA-001`, `DATA-002`, `DATA-003`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`

## Context

Workspace archive currently preserves every delivery, QA, release, membership, and audit record
while making the Workspace read-only. Owners also need an explicit, irreversible path for removing
an archived Workspace that is no longer required. A direct database deletion is unsafe because
Workspace data spans many related tables, authentication audit references use `RESTRICT`, and
attachments also exist in server-managed storage.

## Decision

1. Permanent deletion is available only to the persisted Workspace Owner. A global user role or an
   Admin membership is insufficient.
2. The Workspace must already be archived, and the request must contain its exact current name as
   confirmation. The action has no undo.
3. The authenticated endpoint is `DELETE /v1/workspaces/:workspaceId`. It validates the shared
   request contract, locks the Workspace row, rechecks Owner identity, archived state, and exact
   confirmation inside the deletion transaction.
4. The transaction explicitly removes Workspace-scoped authentication security events that would
   otherwise retain a `RESTRICT` reference, then deletes the Workspace. Canonical cascading foreign
   keys remove every other Workspace-owned record. User accounts are not deleted.
5. The Workspace storage directory is permanently removed before the database transaction commits.
   A storage failure aborts and rolls back the database deletion; the API must not report success.
   Storage deletion is idempotent so a retry can safely complete after an ambiguous external result.
6. The UI exposes the action only for the Owner of an archived Workspace, uses the shared modal,
   requires exact-name entry, disables confirmation until it matches, and returns the user to a
   remaining Workspace (or the no-Workspace state) after success.
7. Permanent deletion does not create a Workspace audit event because all Workspace-owned audit
   history is intentionally deleted. The authenticated request and Owner enforcement are the
   authorization boundary; infrastructure access logs remain outside the product data model.

## Consequences

- This is an intentional exception to the normal audit-retention policy for an Owner-confirmed full
  Workspace purge. The exception applies only to the deleted Workspace; user accounts and unrelated
  Workspace data remain intact.
- No schema change is required because the existing `RESTRICT` authentication audit rows are
  explicitly deleted inside the transaction and all other relations use the canonical deletion
  graph.
- PostgreSQL integration evidence must prove Owner-only access, archived-state enforcement,
  confirmation enforcement, complete Workspace data removal, retained users, and storage cleanup.
- Storage cleanup is part of the request and can make deletion slower than ordinary mutations.

## Alternatives rejected

- Allowing deletion of an active Workspace was rejected because it makes accidental loss too easy.
- Allowing Admin or PO deletion was rejected because Workspace ownership is the governance boundary.
- Database-only deletion was rejected because it would orphan stored attachments.
- Best-effort cleanup after a successful response was rejected because it could falsely claim
  permanent deletion while files still existed.
