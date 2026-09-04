# SEC-05 One-Time Token URL Hardening

**Status:** Active

**Owner:** Engineering and Security

**Last reviewed:** 2026-09-04

**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `TEST-001`, `UI-001`, `DOC-004`

## 1. Tujuan dan Pengguna

Protect users receiving password-reset or Workspace invitation links from unnecessary one-time-token exposure in web-server requests, proxy logs, referrer data, and browser history. This does not change password policy, email delivery, membership creation, or reset-token validity.

## 2. Requirement dan Acceptance Criteria

- **SEC05-R1 / SEC05-AC1:** New password-reset and set-password email links carry the one-time token in the URL fragment, not the query string.
- **SEC05-R2 / SEC05-AC2:** The reset page captures a fragment token and removes it from the address bar before paint while retaining it only for the current form submission.
- **SEC05-R3 / SEC05-AC3:** Previously issued query-token links remain usable, but the page replaces their history entry with a token-free URL.
- **SEC05-R4 / SEC05-AC4:** Missing-token, validation, loading, success, and API-error behavior remains unchanged.

## 3. Alur Lintas Peran

An unauthenticated recipient opens a password-reset link or a one-time set-password link from an Owner/Admin Workspace invitation. The browser reads the token locally, immediately sanitizes the URL, and submits the token only in the existing reset API request body when the recipient confirms a new password. Failures remain on the same form without restoring the token to the URL.

## 4. Data dan Relasi

The existing hashed token and expiry fields on `users` remain canonical. No raw token is persisted, no entity relation changes, and no migration is required.

## 5. API dan Shared Contract

`POST /v1/auth/reset-password` and `ResetPasswordRequestSchema` are unchanged: `{ token, newPassword }` is submitted in the JSON body. Only the email-to-browser transport changes for newly generated links.

## 6. Authorization

The reset endpoint remains available only to a holder of a valid, unexpired, single-use token. Workspace invitation authorization and authenticated Workspace RBAC are unchanged. Backend authentication and authorization remain authoritative under `AUTH-001` and `AUTH-002`.

## 7. UI dan Interaction States

Route `/reset-password` and its existing Atomic Design components remain unchanged visually at desktop and mobile sizes. Token cleanup is nonvisual. Existing missing-token, disabled, loading, error, success, and keyboard-accessible form states remain in place.

## 8. Pengujian dan Evidence

Backend email tests prove new links use a fragment and do not contain `?token=` (2/2 passed). Frontend tests prove fragment and legacy-query tokens are removed from location while the captured token still reaches the reset API body (3/3 focused and 327/327 complete tests passed). The complete PostgreSQL backend suite passed 367/367. Monorepo build, lint, typecheck, documentation, and diff checks also passed; detailed evidence is recorded in `docs/reports/SEC_05_ONE_TIME_TOKEN_URL_HARDENING_2026-09-04.md`.

## 9. Release dan Readiness

The change is backward compatible with already-issued query links and is locally release-ready. Rollback is a code revert; no data recovery or migration is required. Production deployment was explicitly outside this task and was not performed.

## 10. Traceability

`SEC05-R1..R4` → `SEC05-AC1..AC4` → `emailService.ts` and `ResetPasswordPage.tsx` → focused email/page tests → `docs/reports/SEC_05_ONE_TIME_TOKEN_URL_HARDENING_2026-09-04.md`. No Bug, QA sign-off, release decision, or Production deployment is created by this local hardening task.
