# Agent Report — SEC-07 Production Release Preflight

## Task

SEC-07-PRODUCTION-RELEASE: user requested deployment to Production after the successful
[Preview release](SEC_07_PREVIEW_RELEASE_2026-09-04.md).

## Outcome

Release remains blocked. After the initial read-only preflight, the user requested that available
local credentials be entered into Vercel. Ten missing Production-only variables have now been added
and their metadata verified. Dedicated Production Redis credentials and verified data recovery are
still missing. No Production migration, deployment, user/session mutation, or temporary fixture
was performed. Saving environment settings is not proof of runtime recovery or SMTP delivery.

Current Production is also unhealthy before this attempted release: `/v1/health` and unauthenticated
`/v1/auth/security-events` both returned HTTP 500. The underlying cause of those existing failures
was not established by the bounded log inspection; missing settings below independently prevent
the proposed source from starting successfully.

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §§4–8,
  `docs/1_ARCHITECTURE.md` §§5–6, `docs/2_WORKFLOW_AND_ROLES.md` §7,
  `docs/4_AGENT_DEV_GUIDELINES.md`, and `docs/features/SEC_07_CREDENTIAL_SECURITY_AUDIT.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-006`, `SEC-001`, `DATA-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Confirmed facts:** current local HEAD at start `dfd8151`, runtime source `e795252`, clean
  worktree before this task; Preview evidence is 384 API tests, 60 contract tests, and 36 smoke
  checks. These prior results were not rerun or represented as Production evidence.
- **Unresolved decisions:** provision/select a Redis resource dedicated to Production, functionally
  verify the configured SMTP credentials, establish recovery and migration connection, and select authorized
  Production smoke access. Preview Redis/data-fixture permissions do not carry over to Production.
- **Data/interface impact:** none executed. Pending migration 64 creates credential audit table,
  constraints, indexes, and immutable-update trigger transactionally; it does not update existing
  user or Workspace rows. No down migration or reset is planned.
- **Authorization impact:** release authorization is explicit; domain/RBAC policies unchanged.
  No existing user's password or sessions will be changed for testing without separate scope.
- **Migration risk:** Production contains data, unlike the empty Preview recovery exercise.
  A current backup/restorable recovery plan is not verified. Local `pg_dump` is PostgreSQL 16.10;
  no dump or restore was attempted, and client/server compatibility must be checked before use.

## Changed files

- `TODO.md` — claim and then block the Production release with concrete prerequisites.
- This report — sanitized preflight and configuration evidence. No application or local environment file changed.
- Vercel Production environment — ten missing variables added under the user's follow-up request;
  SMTP username/password and new rate-limit secret are marked sensitive. No existing variables replaced.

## Validation

- `git status --short` — clean before the task.
- Presence/identity-only `dotenv.parse` check — `MIGRATION_DATABASE_URL` absent;
  `PRODUCTION_DATABASE_URL` and `DATABASE_URL` identify Production Transaction Pooler (6543),
  not Preview. Only the explicit Production alias was used for the database audit.
- Guarded Node `pg.Client` probe — expected Production project username/host/database validated,
  public Supabase CA held in memory, certificate and hostname verification enabled, bounded
  connection/statement timeouts. Executed only `BEGIN READ ONLY`, migration-name/aggregate-count
  queries, and `ROLLBACK`. Result: 47 applied migrations, zero unknown, one pending:
  `20260904000064-create-auth-security-events.cjs`. Counts: users 2, Workspaces 4, Tasks 0.
- `vercel inspect qlickhub.vercel.app --scope oneilreyands-projects` — current deployment
  `dpl_2twkjE9UEWM89imRuTSxBg95ZADf`, target Production, Ready,
  `https://qlickhub-p5jub7w28-oneilreyands-projects.vercel.app`, alias
  `https://qlickhub.vercel.app`. Ready build state is not proof of health or a usable rollback.
- Direct HTTPS GET probes with redirects rejected and 20-second timeouts — `/v1/health`: 500;
  `/v1/auth/security-events` without credentials: 500. No login or mutating request sent.
- Initial `vercel env ls production --format json --scope oneilreyands-projects` — captured and filtered
  in memory to key/type/target only. Production has neither `UPSTASH_REDIS_REST_URL`/token nor
  `KV_REST_API_URL`/token, no `RATE_LIMIT_KEY_SECRET`, and no `SMTP_USER`/`SMTP_PASS`.
  `APP_URL` and explicit `DATABASE_POOL_MAX` are also absent and require release configuration review.
- Current `apps/api/src/config/env.ts` inspection confirms Production requires distributed Upstash
  configuration and SMTP credentials. Do not bypass these startup guards or reuse Preview Redis.
- Initial local presence-only check found SMTP credentials and old `SEC02_SMOKE_*` keys, but no Upstash/KV
  or rate-limit secret. SMTP values were not copied during that preflight. Legacy smoke keys are not proof of
  an authorized Production account and were not used.
- `vercel logs dpl_2twkjE9UEWM89imRuTSxBg95ZADf --no-follow --no-branch --environment production --since 10m --limit 20 --json --scope oneilreyands-projects`
  — two records retrieved; safe classification did not establish the failure cause. Raw logs and
  secrets were not displayed or written to artifacts.
- `pg_dump --version` — local client 16.10; only PostgreSQL 16 toolchain found under Homebrew opt.
- No full build/test rerun or `npm ci`: release prerequisites failed before that gate; no source
  changes require a new test result.
- `npm run docs:check` — 5/5 passed, zero failed/skipped, documentation governance passed.
  Targeted Prettier formatting and `git diff --check` also passed.

### Authorized partial Production environment setup

- Rechecked local presence and remote metadata before writing. Local SMTP host/port/TLS/user/password/
  sender are present; no Redis REST URL/token, KV aliases, or Production-specific Redis keys exist.
  Local APP_URL is not the canonical Production origin and was deliberately not copied.
- Validated the linked Vercel project/team, nonempty SMTP fields, recognized-placeholder/newline
  rejection, port range, and TLS flag before adding anything. These are configuration checks, not
  verification that the SMTP provider accepts the credentials.
- Used `vercel env add <key> production --yes --scope oneilreyands-projects`, with `--sensitive`
  for `SMTP_USER`, `SMTP_PASS`, and `RATE_LIMIT_KEY_SECRET`. Values were passed only through child
  process stdin, not command arguments, logs, reports, or temporary files. No `--force` was used;
  any existing key was to be preserved rather than overwritten.
- All 10 additions succeeded: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`,
  `SMTP_FROM`, `LINK_PREVIEW_RATE_LIMIT_STORE`, `RATE_LIMIT_KEY_SECRET`, `APP_URL`, and
  `DATABASE_POOL_MAX`. SMTP values came from the user's `.env`; the rate-limit secret was generated
  from 32 cryptographically random bytes directly in memory. Store is `upstash`, APP_URL is the
  canonical Production origin, and pool maximum is 1, following the deployment guide.
- Follow-up Production metadata verified exactly one Production-only entry for each added key and
  `sensitive` type for the three designated secrets. Existing variables were not changed; no Preview
  variable or Redis resource was copied or modified.
- Redis URL/token remain absent, so no deployment was attempted. No email sent, authentication
  test performed, database accessed, or local `.env` edit made in this configuration subtask.
- Documentation checks after this update: `npm run docs:check` passed 5/5, zero failed/skipped,
  governance passed; targeted Prettier formatting and `git diff --check` passed.

## Risks or follow-up

1. Supply or authorize selection of a dedicated Production Redis/Upstash resource. Keep secrets in
   the secret store; do not paste them into chat. Resource creation or reuse of Preview is not assumed.
2. Functionally verify the now-configured Production SMTP and runtime settings before deployment.
3. Establish current data recovery, audit the intended Session Pooler/direct migration connection,
   then apply only pending canonical migration 64 and validate migration status.
4. Re-run release gates, deploy verified source, and verify health plus Production-scoped authenticated
   behavior. Existing current deployment is not a proven healthy rollback target.

## TODO update

- `SEC-07-PRODUCTION-RELEASE` → `Blocked`; no deployment success claimed.

## Follow-up decision — 2026-09-05

The owner selected the PostgreSQL provider after this preflight was recorded. SEC-08 implements that
alternative locally, so provisioning Redis is no longer a release prerequisite after migration 65
is applied and the environment is coherently switched to `postgres`. The historical observations
above remain accurate for the earlier preflight: the current remote setting was not changed by
SEC-08 and still explicitly selects credential-less Upstash. Production recovery, migrations 64/65,
SMTP verification, provider cutover, health recovery, and authenticated smoke remain mandatory.
See `docs/reports/SEC_08_POSTGRESQL_RATE_LIMIT_2026-09-05.md` for local implementation evidence.

## Production release execution — 2026-09-07

The owner explicitly authorized the Production release, a temporary full database backup, and a
transactional data reset that retains one Owner account matching the local Owner. The release is
live and verified; permanent deletion of the temporary backup is the only remaining blocked cleanup
step.

### Recovery, target, and migration evidence

- The target was re-audited before mutation: PostgreSQL 17 was reachable through the dedicated
  Production connection, 47 migrations were applied, migrations 64/65 were pending, and aggregate
  counts were 2 users, 4 Workspaces, and 0 Tasks. The local database contained exactly one active
  global Owner, and Production contained exactly one active Owner with the same email/name.
- PostgreSQL client 17.11 was installed because the existing version-16 client could not safely dump
  a version-17 server. A custom-format pre-change backup was created in a private temporary directory
  with mode `600`, validated through `pg_restore --list`, and contained 733 catalog entries in
  397,310 bytes. Its SHA-256 checksum was verified again immediately before the reset. No backup
  content or credential was printed or copied into repository evidence.
- SMTP authentication succeeded without sending an email.
- `npm run db:migrate:prod` applied only
  `20260904000064-create-auth-security-events.cjs` and
  `20260904000065-create-link-preview-rate-limit-buckets.cjs`. The resulting status is 49 applied
  migrations; both tables and the PostgreSQL rate-limit function exist, and `PUBLIC` has neither
  table nor function access.

### Provider cutover, deployment, and data reset

- Production `LINK_PREVIEW_RATE_LIMIT_STORE` was replaced with `postgres` after migration 65. The
  subsequent build/deploy exceeded the required 60-second drain interval; the previous deployment
  retained its own configuration until the Production alias switched.
- `vercel --prod --yes --scope oneilreyands-projects` produced Ready deployment
  `dpl_9VRqKrfhkGT6YbCJQjkjt3FmXfrL` at
  `https://qlickhub-qqf7kxw1f-oneilreyands-projects.vercel.app`, aliased to
  `https://qlickhub.vercel.app`. It contains only the normal `api/index` serverless function.
- The authorized reset ran in one PostgreSQL transaction under an advisory lock. All 41 application
  tables other than `users` and `SequelizeMeta` were truncated, all users except the exact matching
  active Production Owner were deleted, and all sessions were revoked. The Production password hash
  was deliberately retained rather than copied from development.
- The post-reset read-only audit initially proved one active Owner matching the local fixture identity,
  49 migrations, and zero rows across all other 41 application tables. A subsequent explicit owner
  instruction replaced the Production account email with the user-specified real address while
  preserving its name, Owner role, and separate Production password. Production is therefore no
  longer expected to match the local fixture email.

### Runtime verification and diagnosis

- Release gates passed: documentation 5/5, lint 0 errors with 27 existing warnings, all package
  typechecks, environment validation with zero warnings and no values printed, and the full
  Production build with 1,695 frontend modules.
- Health returned `200` with `database=connected`; root, login, and `/v1` loaded; an unauthenticated
  protected request returned `401`; a state-changing request without Origin returned
  `403 UNTRUSTED_ORIGIN`; Production CORS preflight returned `204` with the exact allowed origin,
  while an untrusted origin received no allow-origin header.
- The first long smoke harness kept an audit connection open across HTTP work and reached its timeout;
  cleanup was subsequently verified at zero. A minimized retry initially returned the expected
  `403 UNTRUSTED_ORIGIN` because it intentionally lacked the Production Origin header, then passed
  with the required header and persisted one PostgreSQL marker. A five-request batching attempt took
  longer than the 60-second rolling window, so request 31 was correctly accepted after expiry; its
  fixtures were fully cleaned. These were harness findings, not runtime-policy failures.
- The final bounded authenticated smoke used two temporary users and 15-request batches. It completed
  in 36,201 ms: unauthenticated access returned `401`; both logins returned `200`; exactly 30 requests
  reached SSRF rejection as `400 UNSAFE_URL`; request 31 returned `429 RATE_LIMITED` with RateLimit,
  RateLimit-Policy, and Retry-After headers; the second user independently received
  `400 UNSAFE_URL`; PostgreSQL stored marker counts `[1,30]`. Cleanup left one real Owner, zero smoke
  users, zero sessions, and zero counters.
- A bounded 200-record deployment-log sample contained 172 link-preview records, zero distributed
  fallback warnings, and zero 5xx responses. It included expected 429, 401, and 200 traffic from the
  release checks.

### Remaining cleanup blocker

The only verified local backup of the pre-reset state remains in private temporary storage. An
attempt to remove it after successful verification was rejected by the safety gate because permanent
deletion removes this recovery path. No workaround was attempted. The owner must explicitly
acknowledge that loss before the archive is permanently deleted. Until then,
`SEC-07-PRODUCTION-RELEASE` remains `Blocked` only on this cleanup item; Production itself is live,
healthy, migrated, reset, and smoke-verified.

### Production Owner email correction — 2026-09-07

- The owner explicitly identified the retained fixture-style email as non-real and requested its
  replacement with a specific real address. The address itself is not duplicated into repository
  evidence.
- The mutation ran in one transaction under a dedicated advisory lock. Preconditions required exactly
  one Production user, exactly one active Owner, and no duplicate target email. The update preserved
  the existing password hash and Owner role while clearing any stale password-reset token and expiry.
- Read-only verification found exactly one active Owner with the requested address, null reset-token
  fields, and no additional users. Production `/v1/health` remained `200` with
  `database=connected`. No email was sent and no session was created.
