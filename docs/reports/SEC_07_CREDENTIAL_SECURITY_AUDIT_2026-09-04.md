# Agent Report — SEC-07 Credential Security Audit

## Task

SEC-07-CREDENTIAL-SECURITY-AUDIT: persist secret-free credential-change evidence and provide
authenticated, least-privilege reads.

## Outcome

Successful email resets, self password changes, and Workspace manager resets create typed audit
events in the same transaction as password, reset-token, and session mutations. PostgreSQL rejects
event updates, unexpected metadata keys, invalid roles, and invalid event identity combinations.
The authenticated read endpoint returns only events involving the current user, or events in an
explicit Workspace after active Owner/Admin membership verification. Queries are newest-first and
bounded to 100 records. Global user roles do not bypass Workspace authorization.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` §5, `docs/4_AGENT_DEV_GUIDELINES.md`, the
  credential-security audit ADR in `docs/adr`, and
  `docs/features/SEC_07_CREDENTIAL_SECURITY_AUDIT.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-005`, `AUTH-006`, `CONTRACT-001`, `DATA-001`,
  `DATA-002`, `TEST-001`, `DOC-002`, `DOC-004`.
- **Data/interface impact:** One additive `auth_security_events` table and
  `GET /v1/auth/security-events`, with shared query/response schemas. No frontend changes.
- **Authorization impact:** Authenticated self actor/subject filtering or exact active Workspace
  Owner/Admin membership. There is no audit create, update, or delete endpoint.
- **Migration risk:** Apply migration 64 before deploying the new credential handlers. Foreign keys
  restrict hard deletion of referenced Users/Workspaces; soft deletion remains unchanged. Down
  migration destroys audit records and requires a separately approved recovery/retention plan.

## Changed files

- `packages/contracts/src/authSecurity.ts`, `index.ts`, and `contracts.test.ts` — strict audit
  metadata/query/response contracts and regression tests.
- `apps/api/src/db/migrations/20260904000064-create-auth-security-events.cjs` — additive table,
  indexes, identity/metadata checks, and update-rejection trigger.
- `apps/api/src/db/models/authSecurityEvent.ts`, model index, and auth/Workspace associations —
  Sequelize mapping and restricted foreign-key relationships.
- `apps/api/src/modules/auth/authSecurityEventService.ts` and `auth.routes.ts` — transactional
  event writes, scoped read service, and sanitized read errors.
- Auth credential and reset integration tests — persisted audit evidence, scoped reads, metadata
  rejection, immutability, and transaction rollback coverage without mocking internal services.
- `apps/api/scripts/verifyCleanMigrations.cjs` — verifies the audit migration, table, metadata
  constraint, and immutable trigger on a clean disposable PostgreSQL database.
- Architecture, Policy Registry, ADR, Feature Card, report, and `TODO.md` — policy and delivery evidence.

## Validation

Node 24.15.0 is selected with
`export PATH=/Users/mac/.nvm/versions/node/v24.15.0/bin:$PATH` for final checks.

- `node --import tsx --test packages/contracts/src/contracts.test.ts` — 60 passed across 18 suites;
  0 failed, cancelled, skipped, or todo.
- `NODE_ENV=test node --test apps/api/dist/**/__tests__/*.test.js | tail -n 30` with
  `set -o pipefail` — 383 passed across 92 suites against local PostgreSQL `qa_management_test`;
  0 failed, cancelled, skipped, or todo. This includes the audit-write failure rollback test.
- `NODE_ENV=test node --test apps/api/dist/modules/auth/__tests__/passwordResetApiIntegration.test.js apps/api/dist/modules/auth/__tests__/credentialSecurityApiIntegration.test.js`
  — earlier focused run passed 14/14 across 2 suites, with 0 failed or skipped. The subsequently
  added rollback test was verified by the full 383-test run.
- `npm run build` — contracts/API builds passed; web build passed with 1,695 modules transformed.
- `npm run validate` — docs checks 5/5 passed; lint 0 errors and 27 pre-existing warnings;
  contracts/API/web typechecks passed.
- `npm --prefix apps/api run db:verify:clean-migrations` — all 48 canonical migrations applied from
  an empty disposable PostgreSQL database, `qa_management_phase0_verify_50750`; table, constraint,
  and trigger checks passed. The script removed that disposable database afterward.
- `NODE_ENV=test ../../node_modules/.bin/sequelize-cli db:migrate:status --env test` from `apps/api`
  — all 48 migrations `up` in local `qa_management_test`.
- `git diff --check` — passed without whitespace errors.

Before revising the new migration, a guarded local database query verified
`current_database() = qa_management_test` and zero `auth_security_events` rows. Only migration 64
was reverted and reapplied there using
`NODE_ENV=test ../../node_modules/.bin/sequelize-cli db:migrate:undo --env test` and
`NODE_ENV=test ../../node_modules/.bin/sequelize-cli db:migrate --env test`. No existing audit records
were deleted. Earlier migration checks used Node 20; the final clean migration check above used the
required Node 24 runtime.

## Risks or follow-up

- No Vercel environment, Preview deployment/database, or Production resource was accessed or changed.
- This is local implementation and test evidence, not proof of a deployed production release.
- UI viewer, retention/export/deletion policy, failed-attempt auditing, alerting, and MFA remain
  separate work. Database administrators can still delete events; this is not tamper-proof storage.
- No frontend interaction tests were rerun because there are no frontend edits; web build and
  typecheck passed. No manual browser session was used for this backend-only slice.

## TODO update

- `SEC-07-CREDENTIAL-SECURITY-AUDIT` → `Done`.
