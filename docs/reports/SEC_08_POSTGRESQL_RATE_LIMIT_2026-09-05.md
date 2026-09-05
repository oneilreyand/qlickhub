# SEC-08 PostgreSQL link-preview rate limit report

## Task

SEC-08-POSTGRESQL-LINK-PREVIEW-RATE-LIMIT — replace the mandatory Redis dependency with the existing
PostgreSQL infrastructure for link-preview counters.

## Outcome

The API now defaults Production and Vercel Preview to a PostgreSQL-backed, exact rolling-window
limiter while retaining explicit Upstash compatibility. Migration 65 adds an ephemeral counter table
and invoker-only PostgreSQL function. It stores only HMAC digests, accepted timestamps, and expiry;
same-key advisory locks and database time make concurrent instances atomic. Cleanup is indexed and
limited to 100 expired rows per call. RLS has no client policies, and public/anon/authenticated access
is revoked. Provider SQL errors or timeouts finish transaction rollback before the existing sanitized
process-local fallback is used.

The limit and external contract remain 30 accepted requests per rolling 60 seconds for each
authenticated user. Request 31 receives `429 RATE_LIMITED` with standard rate-limit headers. No
general API, login, notification, frontend, domain RBAC, or product-data behavior changed. No Vercel
setting, remote database, Preview/Production deployment, or Production data was changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` §5; `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`;
  `docs/adr/ADR-006-POSTGRESQL-LINK-PREVIEW-RATE-LIMIT.md`;
  `docs/features/SEC_08_POSTGRESQL_RATE_LIMIT.md`.
- **Policy IDs:** `SEC-001`, `AUTH-002`, `DATA-002`, `TEST-001`, `DOC-002`, `DOC-004`.
- **Data/interface impact:** additive infrastructure table/function; no client API or shared DTO
  change. Counters expire logically after the rolling window and are cleaned opportunistically.
- **Authorization impact:** endpoint authentication remains mandatory. Counter table/function are
  backend-only; RLS and revoked grants prevent direct client access.
- **Migration risk:** migration 65 is additive, but the runtime role must be the object owner or use
  an explicitly reviewed backend-only RLS/grant design. It must be applied before `postgres` is
  selected. Rolling back the application preserves the table; the down migration destroys counters
  and is not automatic.

## Changed files

- `apps/api/src/db/migrations/20260904000065-create-link-preview-rate-limit-buckets.cjs` — creates the
  constrained table, expiry index, RLS/grants, and atomic database function.
- `apps/api/src/http/middleware/postgresRateLimiter.ts` — invokes the function in an awaited Sequelize
  transaction with local lock and statement timeouts.
- `apps/api/src/http/middleware/rateLimit.ts` — selects PostgreSQL and preserves HMAC keys/fallback.
- `apps/api/src/config/env.ts`, `scripts/checkEnv.mjs`, environment examples — make PostgreSQL the
  deployed default and keep explicit Upstash validation.
- `apps/api/src/http/__tests__/postgresRateLimitIntegration.test.ts`, configuration/environment tests,
  and `apps/api/scripts/verifyCleanMigrations.cjs` — prove real PostgreSQL and configuration behavior.
- Architecture, deployment, ADR, feature, API README, TODO, and reports — record decision, operational
  risks, release gates, evidence, and the superseded provider choice.

## Validation

- `npm --prefix apps/api run db:migrate:test` against local disposable
  `qa_management_test` — pass; migration 65 applied in 0.099 s.
- `npm --prefix apps/api run db:verify:clean-migrations` — pass; all 49 canonical migrations applied
  to a new local database, table/function/RLS/index checks passed, and that database was dropped.
- `NODE_ENV=test node --test` for PostgreSQL integration, config, and distributed compatibility —
  17/17 passed, 0 failed/skipped. One initial fixture-role name was rejected as reserved; the fixture
  was corrected and the recorded run passed fully.
- `NODE_ENV=test node --test apps/api/dist/http/__tests__/postgresRateLimitIntegration.test.js` — final
  cleanup-aware run 8/8 passed, 0 failed/skipped. Concurrent proof accepted exactly 30 of 45 requests
  over two pools and rejected 15; authenticated HTTP accepted 30 and rejected request 31.
- `npm --prefix apps/api run test:integration` — full PostgreSQL API suite 393/393 passed across 93
  suites, 0 failed/skipped, in 72.886 s.
- `node --test scripts/checkEnv.test.mjs` — 3/3 passed, 0 failed/skipped; secrets were not printed.
- `npm --prefix packages/contracts run test` — 60/60 passed, 0 failed/skipped. The first sandboxed
  attempt could not open the test runner's local IPC pipe; the approved rerun passed.
- `npm run validate` — documentation 5/5 passed; lint 0 errors with 27 pre-existing warnings;
  contract/API/web typechecks passed.
- `npm run build` — contract, API, and web production builds passed (1,695 web modules transformed).
- `npm run env:check` — passed with 0 warnings and no values printed.
- Final local database checks — 49 migrations applied, zero remaining SEC-08 counters, fixture roles,
  and temporary verification databases. Six soft-deleted test users from preliminary runs were
  identified by exact fixture signature, physically removed, and cleanup was changed to prevent
  recurrence; the final test run then removed its own users.
- `git diff --check` — passed.

## Risks or follow-up

- PostgreSQL counter transactions share the application pool and add write load. Monitor pool queue,
  latency, database capacity, and sanitized fallback warnings; PostgreSQL is not a free-usage
  guarantee.
- Idle expired buckets remain until later link-preview traffic performs bounded cleanup.
- A fallback protects only one process and is not global enforcement while PostgreSQL is unavailable.
- Provider changes reset the short window. Apply migration 65 first, then pause/drain link-preview
  traffic for at least 60 seconds and avoid mixed-provider deployments. Rotating the HMAC identifier
  secret likewise creates fresh buckets and requires the same pause/drain procedure.
- Preview migration/provider setup and authenticated persisted-counter smoke are still required before
  any Production release. Production also retains its separate recovery, migration 64, SMTP, health,
  and smoke gates.

## TODO update

- `SEC-08-POSTGRESQL-LINK-PREVIEW-RATE-LIMIT` → `Done` locally and verified.
- `SEC-07-PRODUCTION-RELEASE` → `Blocked`; PostgreSQL removes the future Redis prerequisite but does
  not satisfy recovery, migration, deployment, or Production verification gates.
