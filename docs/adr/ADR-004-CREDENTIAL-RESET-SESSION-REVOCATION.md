# ADR-004 — Credential Reset and Session Revocation

**Status:** Accepted
**Date:** 2026-09-04
**Decision owners:** Product and Engineering
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-005`, `CONTRACT-001`, `DATA-001`

## Context

Qlick Hub supports one-time-link password reset, authenticated self-service password change, and
administrative member password reset. The administrative endpoint previously inferred a Workspace
from any Owner/Admin membership and also treated a global user role as authorization. Credential
changes did not invalidate sessions created with the superseded password. These behaviors leave
Workspace boundaries ambiguous and allow an already-issued session to survive a security reset.

## Decision

1. Administrative password reset requires explicit `workspaceId` and active memberships for both
   actor and target in that exact Workspace.
2. Owner can reset a non-Owner member. Admin can reset only PO, Developer, or QA. The administrative
   endpoint cannot be used for self-reset; authenticated users use the self-service endpoint.
3. One-time-link and administrative resets revoke every active session belonging to the target.
4. Authenticated self-service change preserves the verified current session and revokes all other
   sessions.
5. Every password mutation clears any outstanding reset token. Password mutation and applicable
   session revocation execute in one PostgreSQL transaction. One-time reset consumes the user row
   under a transaction lock to prevent concurrent replay.
6. Backend authorization is authoritative. The Workspace settings UI mirrors the hierarchy only to
   avoid presenting an action that the backend will reject.

## Consequences

- Existing callers of the administrative endpoint must add `workspaceId`.
- Users reset through email or by a Workspace manager must sign in again on every device.
- A user changing their own password stays signed in on the device performing the change, while
  other devices are signed out.
- No schema migration is required because `auth_sessions.revoked_at` and reset-token fields already
  exist.
- The change must be proven with shared-contract tests, PostgreSQL HTTP integration tests covering
  the role matrix and session state, frontend component/page tests, and repository validation.

## Alternatives rejected

- **Global Admin bypass:** rejected because Workspace membership is the canonical authorization
  boundary.
- **Keep all sessions alive:** rejected because existing sessions would outlive a credential reset.
- **Revoke the current session after self-change:** rejected because the current session has just
  proven the old password; revoking only other sessions preserves usability without retaining
  unverified remote sessions.
