# SEC-06 Credential Reset and Session Revocation

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-04
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-005`, `CONTRACT-001`, `DATA-001`, `TEST-001`, `UI-001`, `DOC-002`, `DOC-004`

## 1. Tujuan dan Pengguna

Protect users whose password is reset by invalidating sessions authenticated with superseded
credentials, and ensure an Owner/Admin can act only inside the selected Workspace. This slice covers
email reset, authenticated self-change, and the existing Workspace member reset action. It excludes
password-strength policy changes, MFA, schema migrations, deployment, environment configuration,
and Production changes.

## 2. Requirement dan Acceptance Criteria

- **SEC-06-R1:** Email reset consumes a valid token exactly once and revokes every target session.
- **SEC-06-R2:** Self-change verifies the current password, clears any outstanding reset token,
  preserves the current session, and revokes every other target session.
- **SEC-06-R3:** Administrative reset requires `workspaceId`, active actor and target memberships in
  that exact Workspace, the approved role hierarchy, and revokes every target session.
- **SEC-06-R4:** Password mutation, reset-token clearing, and session revocation are atomic.
- **SEC-06-R5:** Invalid, cross-Workspace, inactive, self, and disallowed role requests fail without
  changing the password or sessions.

The decision source is the credential-reset and session-revocation architecture decision record in
`docs/adr`.

## 3. Alur Lintas Peran

- A user follows a one-time reset link, sets a password, and then signs in again on all devices.
- An authenticated user changes their own password and continues on the current device; other
  devices lose access.
- An Owner may reset Admin/PO/Developer/QA in the selected Workspace. An Admin may reset only
  PO/Developer/QA. All other role combinations are rejected.

## 4. Data dan Relasi

The slice updates existing `users.password_hash`, `users.password_reset_token`,
`users.password_reset_expires_at`, and `auth_sessions.revoked_at` records. All related writes occur in
one transaction. Existing tables and indexes are sufficient, so migration risk is none. No password,
token, session credential, or connection string may enter logs, fixtures, reports, or browser state.

## 5. API dan Shared Contract

- `POST /v1/auth/reset-password`: request remains `{ token, newPassword }`.
- `POST /v1/auth/change-password`: request remains `{ currentPassword, newPassword }`.
- `POST /v1/auth/admin/reset-member-password`: request becomes
  `{ workspaceId, targetUserId, newPassword }` through `AdminResetPasswordRequestSchema`.
- Authorization failures use the existing `403 FORBIDDEN` envelope. Missing exact active membership
  is not exposed as a cross-Workspace user lookup.

## 6. Authorization

`AUTH-001`, `AUTH-002`, and `AUTH-005` apply. Backend membership and role checks are authoritative.
The global `users.role` field is not administrative reset authority. The target cannot be the actor
on the administrative route.

## 7. UI dan Interaction States

Workspace Settings reuses `WorkspaceMembersTable` and `AdminResetPasswordModal`. It sends the active
Workspace ID and mirrors the same role hierarchy for action visibility. Existing loading, disabled,
error, success, keyboard, desktop, and mobile behavior remains in the shared components.

## 8. Pengujian dan Evidence

- Shared-contract tests reject missing or malformed Workspace IDs.
- PostgreSQL HTTP integration tests cover email reset, self-change, exact-Workspace authorization,
  Owner/Admin hierarchy, unchanged denied targets, and persisted session revocation.
- Session-manager tests cover all-session revocation and transaction participation.
- Frontend tests cover role-based action visibility and the exact request payload.
- Full API/web regressions, build, typecheck/lint, docs check, and `npm run validate` are required
  before completion. Results are recorded only after execution.

## 9. Release dan Readiness

No deploy is part of this task. Rollback is the task commit because there is no migration or external
state change. Production remains unchanged until separately authorized.

## 10. Traceability

`SEC-06-R1..R5` → `SEC-06-CREDENTIAL-RESET-SESSION-REVOCATION` in `TODO.md` → shared contracts,
auth routes/session manager, Workspace settings UI → PostgreSQL and frontend tests → SEC-06 report.
