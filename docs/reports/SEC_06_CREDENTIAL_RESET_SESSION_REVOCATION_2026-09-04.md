# Agent Report — SEC-06 Credential Reset and Session Revocation

## Task

SEC-06-CREDENTIAL-RESET-SESSION-REVOCATION: constrain administrative password reset to the exact
Workspace and invalidate sessions authenticated with superseded credentials.

## Outcome

Administrative reset now requires an explicit Workspace ID and active actor/target memberships in
that exact Workspace. Owner can reset non-Owner members; Admin can reset only PO, Developer, or QA.
Global user role, membership in another Workspace, inactive membership, self-reset, Owner targets,
and Admin targets do not bypass the backend policy.

Email and administrative resets revoke every target session. Authenticated self-change clears any
outstanding reset token, preserves the verified current session, and revokes all other sessions.
Each password mutation, reset-token cleanup, and session revocation is one PostgreSQL transaction.
One-time reset locks the user row so two concurrent requests produce one success and one rejection.
Unexpected failures on these credential routes return a generic 500 response rather than exposing a
database or internal error message.

Workspace Settings sends the active Workspace ID and mirrors the backend hierarchy on both mobile
and desktop member surfaces. The backend remains authoritative.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` §5, `docs/4_AGENT_DEV_GUIDELINES.md`,
  `docs/adr/ADR-004-CREDENTIAL-RESET-SESSION-REVOCATION.md`, and
  `docs/features/SEC_06_CREDENTIAL_RESET_SESSION_REVOCATION.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-005`, `CONTRACT-001`, `DATA-001`, `TEST-001`,
  `UI-001`, `DOC-002`, `DOC-004`.
- **Data/interface impact:** `AdminResetPasswordRequestSchema` now requires `workspaceId`. Existing
  user password/reset-token fields and `auth_sessions.revoked_at` are updated transactionally.
- **Authorization impact:** Administrative reset is exact-Workspace scoped and follows the approved
  Owner/Admin target hierarchy. Global user role is no longer an authorization shortcut.
- **Migration risk:** None. No model, table, index, migration, seed, or external persisted state was
  added or changed.

## Changed files

- `packages/contracts/src/user.ts` and `packages/contracts/src/contracts.test.ts` — require and prove
  the administrative-reset Workspace boundary.
- `apps/api/src/modules/auth/auth.routes.ts` — transactionally updates credentials, consumes reset
  tokens under lock, revokes sessions, applies exact-Workspace policy, and sanitizes unexpected
  credential-route failures.
- `apps/api/src/modules/auth/sessionManager.ts` — adds transaction-aware all-session revocation and
  transaction support for other-session revocation.
- `apps/api/src/modules/auth/__tests__/credentialSecurityApiIntegration.test.ts`,
  `passwordResetApiIntegration.test.ts`, and `sessionManager.test.ts` — prove the role matrix,
  persisted session state, concurrent one-time-token behavior, and rollback participation.
- `apps/web/src/lib/api/authService.ts` and `apps/web/src/pages/WorkspaceSettingsPage.tsx` — send the
  shared contract with the active Workspace ID.
- `apps/web/src/components/ui/organisms/WorkspaceMembersTable.tsx` and affected tests — mirror the
  reset hierarchy and expose the existing action consistently on mobile and desktop.
- `docs/1_ARCHITECTURE.md`, `docs/POLICY_REGISTRY.md`, the ADR, Feature Card, and `TODO.md` — record
  the approved policy, contract, scope, and status.

## Validation

- `node --import tsx --test packages/contracts/src/contracts.test.ts` — 57 passed, 0 failed,
  cancelled, skipped, or todo across 17 suites.
- `npm --prefix apps/web test -- src/components/ui/organisms/__tests__/WorkspaceMembersTable.test.tsx src/pages/__tests__/WorkspaceSettingsPage.test.tsx`
  — 10 passed across 2 files; 0 failed or skipped. Existing React `act(...)` warnings remain in the
  Workspace Settings test file.
- `NODE_ENV=test node --test apps/api/dist/modules/auth/__tests__/sessionManager.test.js apps/api/dist/modules/auth/__tests__/passwordResetApiIntegration.test.js apps/api/dist/modules/auth/__tests__/credentialSecurityApiIntegration.test.js`
  — 14 passed across 3 suites; 0 failed, cancelled, skipped, or todo against PostgreSQL database
  `qa_management_test`.
- `npm --prefix apps/web run test` — 329 passed across 67 files; 0 failed. Pre-existing React
  `act(...)` and DOM nesting warnings were emitted by unrelated suites.
- `NODE_ENV=test node --test apps/api/dist/**/__tests__/*.test.js` — 376 passed across 92 suites; 0
  failed, cancelled, skipped, or todo against PostgreSQL `qa_management_test`.
- `NODE_ENV=test ../../node_modules/.bin/sequelize-cli db:migrate:status --env test` from `apps/api`
  — all 47 canonical migrations reported `up`; no migration was applied.
- `npm run build` — contracts and API TypeScript builds passed; web production build transformed
  1,694 modules and completed successfully.
- `npm run validate` — documentation checks passed 5/5, ESLint passed with 0 errors and 27 existing
  warnings, and contracts/API/web typechecks passed.
- `git diff --check` — passed with no whitespace errors.

One intermediate full-suite run stopped during fixture creation because local disk availability was
1.5 GB and PostgreSQL returned `No space left on device`; this was an infrastructure failure, not a
test assertion. The downloadable npm cache was removed with `npm cache clean --force`, increasing
free space to 5.5 GB. No source, application data, database records, credentials, or secrets were
removed. The complete API suite then passed on the unchanged implementation.

## Risks or follow-up

- Password-strength modernization, MFA, and dedicated security-event audit logging remain separate
  security work; this task does not silently introduce those product or persistence decisions.
- No manual authenticated browser session was run. Contract-valid component tests prove both
  responsive action surfaces and the exact request payload.
- No Vercel environment, Preview deployment, or Production resource was read or changed.

## TODO update

- `SEC-06-CREDENTIAL-RESET-SESSION-REVOCATION` → `Done`.
