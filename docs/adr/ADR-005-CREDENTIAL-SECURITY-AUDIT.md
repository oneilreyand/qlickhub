# ADR-005 — Credential Security Audit

**Status:** Accepted
**Date:** 2026-09-04
**Decision owners:** Product and Engineering
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-005`, `AUTH-006`, `CONTRACT-001`, `DATA-001`, `DATA-002`

## Context

Credential resets now update passwords, clear one-time tokens, and revoke superseded sessions
atomically. Qlick Hub does not yet retain purpose-built evidence that those security-sensitive
mutations occurred. Existing task, test, bug, folder, and Workspace membership activities have
different ownership and action contracts and must not become a generic authentication log.

## Decision

1. Add a dedicated `auth_security_events` table for `password_reset_completed`,
   `password_changed`, and `member_password_reset` events.
2. Events are append-only at the database level: updates are rejected. Application code exposes no
   create, update, or delete endpoint.
3. Event creation occurs in the same transaction as the password, reset-token, and session updates.
   A credential mutation rolls back if its required audit event cannot be written.
4. Stored fields are limited to event type, nullable internal Workspace/actor/subject UUIDs,
   bounded JSON metadata, and creation time. Metadata may contain only revoked-session count and
   relevant Workspace roles. Passwords, password hashes, reset tokens, cookies, authorization
   headers, emails, URLs, user-agent strings, raw IP addresses, connection strings, and secrets are
   prohibited.
5. Authenticated users can list events in which they are actor or subject. A Workspace-scoped list
   requires active Owner/Admin membership in that exact Workspace. Results are newest-first and
   bounded to 100 items.
6. Foreign keys use `RESTRICT` so an associated user or Workspace cannot be hard deleted while its
   audit evidence remains. Existing soft-delete workflows are unaffected; an approved hard-delete
   maintenance path must explicitly address audit retention first.

## Consequences

- The change requires one additive canonical Sequelize migration, a model, associations, shared
  response/query contracts, an authenticated read endpoint, and PostgreSQL integration tests.
- The event table contains internal identifiers but no directly identifying request context or
  bearer material.
- No dedicated frontend viewer is added in this slice. The authenticated API establishes the
  backend evidence boundary first.
- Automatic retention is not guessed. Records remain until Product/Security approves a retention,
  export, and deletion policy in a later decision.

## Alternatives rejected

- Reusing Workspace membership activity was rejected because self-service and one-time-link resets
  are not inherently Workspace-scoped.
- Logging request headers, email, user-agent, or raw IP was rejected because it adds sensitive data
  without an approved incident-response or retention need.
- Best-effort logging after commit was rejected because it could report credential success without
  durable matching audit evidence.
