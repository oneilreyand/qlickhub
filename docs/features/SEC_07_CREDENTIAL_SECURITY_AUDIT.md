# SEC-07 Credential Security Audit

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-04
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-005`, `AUTH-006`, `CONTRACT-001`, `DATA-001`, `DATA-002`, `TEST-001`, `DOC-002`, `DOC-004`

## 1. Tujuan dan Pengguna

Create durable evidence for completed credential changes without turning sensitive request context
into a second data-leak surface. Users can inspect events involving their identity; Workspace
Owner/Admin can inspect manager-initiated resets in the selected Workspace. This slice excludes a
frontend viewer, failed-attempt logging, automatic retention, export, alerting, MFA, deployment, and
Production changes.

## 2. Requirement dan Acceptance Criteria

- **SEC-07-R1:** Successful one-time reset creates `password_reset_completed` with the subject user
  and revoked-session count, but no actor or Workspace claim.
- **SEC-07-R2:** Successful authenticated self-change creates `password_changed` with the same actor
  and subject user plus revoked-other-session count.
- **SEC-07-R3:** Successful manager reset creates `member_password_reset` with exact Workspace,
  actor, subject, actor role, target role, and revoked-session count.
- **SEC-07-R4:** Credential mutation and event insertion commit or roll back together.
- **SEC-07-R5:** Event update is rejected by PostgreSQL, and no mutation endpoint exists.
- **SEC-07-R6:** Self reads return only events involving the authenticated user. Workspace reads
  require active Owner/Admin membership in that exact Workspace and return at most 100 newest items.
- **SEC-07-R7:** Stored and returned fields contain no password, hash, token, cookie, header, email,
  URL, user-agent, raw IP, connection string, or secret.

The decision source is the credential-security audit architecture decision record in `docs/adr`.

## 3. Alur Lintas Peran

- Any user can read their own involvement history after authentication.
- Owner/Admin can request a Workspace-scoped list for security review.
- PO/Developer/QA and non-members receive `403` for Workspace-scoped reads.
- Credential events are server-generated only; no role can forge or edit them through the API.

## 4. Data dan Relasi

The additive `auth_security_events` table belongs to the authentication domain. Nullable foreign
keys reference Workspace, actor User, and subject User with `ON DELETE RESTRICT`. A check constraint
limits event types, a JSON-object check constrains metadata, indexes support subject/actor/Workspace
chronology, and a trigger rejects updates. Down migration drops this new table and therefore loses
only SEC-07 audit data; it must not be run outside an approved rollback.

## 5. API dan Shared Contract

- `GET /v1/auth/security-events?limit=50` returns events involving the current user.
- `GET /v1/auth/security-events?workspaceId=<uuid>&limit=50` returns exact-Workspace events after
  Owner/Admin authorization.
- `AuthSecurityEventQuerySchema`, `AuthSecurityEventSchema`, and
  `AuthSecurityEventListResponseSchema` are defined in `packages/contracts`.
- Invalid input returns `400`; missing authentication returns `401`; insufficient membership/role
  returns `403` without revealing unrelated event existence.
- The Vercel transport adapter removes only a single `path` rewrite capture matching the current
  `/v1/` route before domain query validation, removing Vercel's own cached query helper so Express
  parses the normalized URL. Unknown, mismatched, or duplicate query parameters
  still fail the strict audit query contract; no authorization rule is relaxed.

## 6. Authorization

`AUTH-001`, `AUTH-002`, and `AUTH-006` apply. Backend queries apply actor/subject filters for self
reads and exact active-membership checks for Workspace reads. Global user role is never a Workspace
audit authorization shortcut.

## 7. UI dan Interaction States

No UI changes are included. The authenticated interface is intentionally delivered first so a later
viewer can reuse the shared contract without duplicating authorization or audit calculations in
React.

## 8. Pengujian dan Evidence

- Shared-contract tests prove query bounds and secret-free response shape.
- Migration tests prove clean application and update immutability in disposable PostgreSQL.
- HTTP/PostgreSQL tests prove each event type, transaction-linked data, self filtering, exact
  Workspace role matrix, bounded ordering, and absence of prohibited fields.
- Full API regression, build, typecheck/lint, docs check, and clean migration verification are
  required before completion. Results are recorded only after execution.

## 9. Release dan Readiness

No deployment is part of SEC-07. The migration is applied only to the disposable PostgreSQL test
database for evidence. Production requires a separate approved release, backup/recovery check, and
migration status audit.

## 10. Traceability

`SEC-07-R1..R7` → `SEC-07-CREDENTIAL-SECURITY-AUDIT` in `TODO.md` → migration/model/contracts/auth
routes and service → PostgreSQL contract/integration evidence → SEC-07 report.
