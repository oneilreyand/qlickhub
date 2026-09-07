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

## Preview release follow-up — 2026-09-07

- Local implementation was committed as `dcfb683`. A protected one-use Preview runtime migration
  path audited the target before mutation: migration 64 was up, migration 65 was pending, and users
  and Workspaces were both zero. The database fingerprint was bound to the migration request.
- Migration 65 applied successfully on Preview: applied migrations moved from 48 to 49, the table
  and function were present, and user/Workspace counts stayed zero. Preview-only
  `LINK_PREVIEW_RATE_LIMIT_STORE` was changed from `upstash` to `postgres`; Production settings were
  not accessed or modified. A 60-second pause/drain was observed before the first final deployment.
- The first full-concurrency smoke found a real serverless contention issue: all 31 requests reached
  SSRF validation and sampled logs contained sanitized local-fallback warnings. Cleanup still removed
  its two users, two sessions, and counters. No passing claim was made for that run.
- The limiter's default transaction-local lock and statement timeouts were raised from 750/1,500 ms
  to 5,000/8,000 ms so normal multi-instance serialization can complete on the remote Transaction
  Pooler. Tests retain injected 100/300 ms timeouts to prove rollback/fallback promptly. The hotfix
  was committed as `24fe40e`; local PostgreSQL integration passed 8/8 afterward.
- Final Preview deployment `dpl_4WLyp1ELDrWa1bUZLEdwTRMdzJnx`
  (`https://qlickhub-nnnjae1la-oneilreyands-projects.vercel.app`) reached Ready and contains only the
  normal `api/index` function—no operational endpoint.
- Live hotfix smoke passed: health/database connected; unauthenticated link preview returned 401;
  31 authenticated requests completed within 55,363 ms with exactly 30 `400 UNSAFE_URL` responses
  and one `429 RATE_LIMITED`; retry/rate-limit headers were present. PostgreSQL inspection showed 30
  accepted markers for user one and one for isolated user two.
- Cleanup removed the final two users, two sessions, and two counters. An exact-marker global audit
  reported zero remaining users/sessions/counters, including two users/two sessions/one counter
  recovered after a transient local HTTPS timeout on an earlier attempt.
- A bounded 100-record log sample from the final deployment contained 98 link-preview requests,
  zero distributed-store fallback warnings, and zero 5xx responses. This is bounded smoke evidence,
  not a sustained load test.
- Full local API regression passed 393/393 across 93 suites in 73.634 s. `npm run validate` passed
  docs 5/5, all typechecks, and lint with zero errors/27 existing warnings. Full build passed with
  1,695 web modules transformed.
- Four intermediate deployments, the temporary sensitive Vercel variable, all operational endpoint
  source, and the exact temporary directory containing pulled Preview environment data, secrets,
  fingerprint, and smoke ID were deleted. Preview metadata no longer lists the temporary variable;
  the final deployment remains Ready. Local git working tree was clean before this documentation
  update.
- Production remains blocked on its own recovery, migrations 64/65, SMTP verification, provider
  cutover, health, and authenticated smoke gates. Preview success does not authorize or prove the
  Production release.
