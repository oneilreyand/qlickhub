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
