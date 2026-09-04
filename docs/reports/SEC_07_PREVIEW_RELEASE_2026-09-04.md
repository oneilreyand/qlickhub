# Agent Report — SEC-07 Preview Release

## Task

SEC-07-PREVIEW-RELEASE-VALIDATION: approved recovery preparation, migrations 62/63/64, Preview
deployment, authenticated smoke, and scoped cleanup. Production is excluded.
Earlier connection/approval history is in the [preflight report](SEC_07_PREVIEW_RELEASE_PREFLIGHT_2026-09-04.md).

## Outcome

Migration rollout and authenticated Preview smoke succeeded: 48 canonical migrations applied,
zero pending, and 36/36 live smoke checks passed on source commit `e795252`.
Final Preview: [Qlick Hub Preview](https://qlickhub-k4k4ejdjg-oneilreyands-projects.vercel.app).

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, `docs/1_ARCHITECTURE.md` §§5–6,
  `docs/2_WORKFLOW_AND_ROLES.md` §7, `docs/4_AGENT_DEV_GUIDELINES.md`, and
  `docs/features/SEC_07_CREDENTIAL_SECURITY_AUDIT.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-005`, `AUTH-006`, `SEC-001`, `DATA-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Applied the three unchanged canonical migrations on Preview only.
  Migration 62 adds cancellation records and changes the Task soft-deletion guard; 63 expands
  archive/restore activity actions; 64 adds credential audit persistence and database constraints.
- **Authorization impact:** Existing approved backend policies remain unchanged. Smoke targets two
  temporary users with Owner/QA Workspace memberships, never existing users or Production.
- **Migration risk/recovery:** Preview PostgreSQL 17.6 had 45 applied migrations and all 38 public
  application tables empty. A disposable local PostgreSQL 16 database recreated all 45 baseline
  migrations; the pre-change Task deletion function and Workspace activity constraint matched the
  live definitions exactly. Baseline migration names, row counts, and affected definitions were
  retained temporarily with restricted permissions. No row backup was needed for the verified empty
  application tables; this is not a full Supabase platform backup or PostgreSQL 17 restore drill.
  The local recovery database was dropped after verification. No down migration was run; on a
  rollout failure prefer the older application and preserve additive schema/data, then review
  recovery explicitly rather than dropping tables after new records exist.

## Changed files

- `TODO.md` and release/preflight reports — approval, observed evidence, and status.
- `api/index.mjs` and `apps/api/src/http/vercelHandler.ts` — normalize only a matching, singular
  Vercel rewrite capture before the strict domain query parser; no RBAC relaxation.
- `apps/api/src/modules/auth/__tests__/credentialSecurityApiIntegration.test.ts` — run the real
  serverless adapter over HTTP/PostgreSQL and cover rewrite metadata plus rejected unknown,
  mismatched, and duplicate parameters. The feature card records this transport boundary.
- Temporary guarded migration/smoke runners outside the repository — operational checks only;
  not application source, not deployed, and removed after completion.
- Vercel Preview-only `DATABASE_URL` — synchronized to the verified Preview Transaction Pooler
  credential. The variable remains `sensitive`, scoped only to Preview, with its name unchanged.
  No database password rotation or Production variable change was performed.

## Validation

### Database and local release gates

- `node /private/tmp/qlikhub-preview-release.o05DkA/runner.cjs audit` — verified Preview identity
  and TLS certificate/hostname; PostgreSQL `170006`, 45 applied, migrations 62/63/64 pending,
  no unknown names; users/Workspaces/Tasks each zero.
- `node /private/tmp/qlikhub-preview-release.o05DkA/runner.cjs prepare` — verified all 38 application
  tables empty, recreated 45 baseline migrations locally, compared affected function/constraint
  definitions, and removed the disposable recovery database.
- `npm run env:check` — passed, zero warnings, no secret values printed.
- `npm run validate` — docs checks 5/5; lint zero errors and 27 pre-existing warnings;
  contracts/API/web typechecks passed.
- `npm run build` — contracts/API/web passed, 1,695 frontend modules transformed.
- `node /private/tmp/qlikhub-preview-release.o05DkA/runner.cjs migrate` — revalidated exact Preview
  identity, pending list, empty application tables, and recovery baseline, then used Sequelize and
  its Umzug migration mechanism to invoke the unchanged canonical files in order. Migrations
  `20260901000062-create-release-record-cancellations.cjs`,
  `20260901000063-add-workspace-archive-activity-actions.cjs`, and
  `20260904000064-create-auth-security-events.cjs` applied successfully; 48 up, zero pending.
- `node /private/tmp/qlikhub-preview-release.o05DkA/runner.cjs runtime-audit` — the verified Preview
  credential also authenticated successfully through Transaction Pooler port 6543, with TLS
  verification active; 48 migrations up and users/Workspaces/Tasks still empty.
- The original implementation has 383 API and 60 contract tests in its prior report. A runtime
  adapter correction became necessary during this release; new regression evidence follows below.

### Deployment and runtime credential remediation

- `vercel deploy --target preview --scope oneilreyands-projects --yes --no-wait` initially created
  `dpl_2MmUPtZAeib34D6ezkgmZtbYGhcU`. Build reached Ready, but health returned degraded/disconnected.
  The smoke runner stopped at its first check and created no fixture accounts; cleanup removed zero
  accounts/sessions/events.
- Preview-only runtime log inspection classified the failure as password authentication rejection,
  not TLS, DNS, pool-capacity, or timeout failure. Raw logs and secret values were not printed.
- `vercel env update DATABASE_URL preview --sensitive --yes --scope oneilreyands-projects`, supplied
  through process stdin, was attempted twice and rejected with the sensitive-variable key-change
  error. A second deployment, `dpl_7nuvAhsKVUMxLEmS6Tf4fBKDV8Wn`, was dispatched before the failed
  update result was handled; it did not contain the corrected credential and is not a validated
  release. No smoke fixtures were created on it.
- The official API metadata identified one Preview-only sensitive variable. A guarded
  `vercel api /v9/projects/prj_6lt8jj5DKjREdCrmTJXgLK3RM2mQ/env/KZ5BH41xLz1Q7HbK --method PATCH --input - --scope oneilreyands-projects --raw`
  sent only its new `value` through stdin. Response checks verified the same ID, sensitive type,
  and Preview-only target. No secret values were printed or stored in operational files.
- A third explicit Preview deployment was created:
  `dpl_96Qffmpkuc1145orCq3gNGXfU6nw`,
  `https://qlickhub-mqxhce8s1-oneilreyands-projects.vercel.app`.

### Serverless rewrite regression

- Third deployment reached Ready and health returned `ok` / database `connected`.
- One smoke retry stopped during initial setup before fixture creation, without enough diagnostic
  detail to establish its cause. The next read-only database probe succeeded.
- Two authenticated smoke runs then reproduced a `400 BAD_REQUEST` on a valid Owner audit query.
  Each created exactly two temporary users/one Workspace, then deleted its two users, three sessions,
  and Workspace/memberships; no audit events had yet been created.
- Vercel's compiled rewrite forwards the named `path` capture as query metadata. The shared audit
  schema correctly rejects unexpected domain query keys; the missing transport normalization caused
  valid deployed requests to fail even though local Express tests passed.
- Added the real serverless handler seam to the PostgreSQL integration test. Before the correction,
  `npm --prefix apps/api run build && NODE_ENV=test node --test apps/api/dist/modules/auth/__tests__/credentialSecurityApiIntegration.test.js`
  reproduced the exact `400 !== 200` failure: 14 passed, 1 failed, zero skipped. After removing only
  a single matching infrastructure capture in the adapter, the same command passed 15/15, zero
  failures/cancelled/skipped/todo. Invalid extra, duplicate, and mismatched fields remain rejected.
- Lesson: test the deployment adapter, not only `createApp()`, when infrastructure adds request data.
- After the adapter fix, `npm run validate && npm run build` passed again: docs 5/5,
  lint zero errors/27 existing warnings, all typechecks, and all builds (1,695 web modules).
  `NODE_ENV=test node --test apps/api/dist/**/__tests__/*.test.js` passed 384/384 across
  92 suites against local disposable PostgreSQL, zero failed/cancelled/skipped/todo.
- Local implementation commit: `3a980a9` (`fix(api): normalize Vercel rewrite metadata before validation`).
  No Git push was performed. Fourth explicit Preview deployment:
  `dpl_HAB7iW6xzoJty1Y83rVVVWJuzR7R`,
  `https://qlickhub-1v2fq898k-oneilreyands-projects.vercel.app`.
- The fourth deployment reached Ready but authenticated smoke still failed at the Owner audit
  query (`400`); cleanup deleted its two users, three sessions, and Workspace/memberships.
  The URL-only correction was insufficient. Vercel installs an own lazy `query` property whose
  parser captures the incoming URL before the application handler runs, shadowing Express's getter.
  Source: [Vercel runtime helpers](https://github.com/vercel/vercel/blob/main/packages/node/src/serverless-functions/helpers.ts).
  The integration server now includes this external-platform helper fixture (not a mocked internal
  backend); it reproduced 14 passed/1 failed with the URL-only fix. The adapter additionally removes
  that own property so Express parses the normalized URL without relaxing the domain schema.
- `npm --prefix packages/contracts test` passed 60/60 across 18 suites, zero failed/cancelled/skipped/todo.
  The first sandboxed attempt was prevented before tests by the runner's IPC `EPERM`; the approved
  local rerun passed.
- With the helper correction, the focused regression passed 15/15. Full API rerun passed
  384/384 (92 suites, zero failed/cancelled/skipped/todo), and validation/build passed again with
  the same 27 existing lint warnings. Corrected local source commit: `e795252`
  (`fix(api): clear Vercel query helper before Express parsing`); no push.
  Fifth explicit Preview deployment: `dpl_427wEXrtqLk6qypNsKkBz1pPcHRF`,
  `https://qlickhub-k4k4ejdjg-oneilreyands-projects.vercel.app`.
- Fifth deployment reached Ready. Its first full run passed all 33 pre-rate-limit checks,
  including the formerly failing Owner query, credential changes, persisted audit, role scope,
  session invalidation, and reset-token replay rejection. The 31-process `vercel curl` burst then
  encountered an undiagnosed CLI/transport failure after some requests; this was not counted as
  a passing rate-limit test. Cleanup removed two users, five sessions, three audit events, and
  the temporary Workspace/memberships.
- The retry replaced per-request CLI processes with direct HTTPS requests to that exact Preview
  URL, keeping the existing deployment-access token only in memory after a read-only project
  lookup. No new bypass token or protection setting was created/changed. Redirects are rejected;
  passwords, cookies, and access tokens are never printed or written to temporary files.
- The first direct-HTTPS run passed 34 checks, including exactly 30 requests accepted by the
  limiter and one `429` within 60 seconds, then hit a harness assertion: it incorrectly expected
  `error.code`, while `rateLimit.ts` and `linkPreviewSsrf.test.ts` define/assert top-level
  `code: RATE_LIMITED`. The harness expectation was corrected to that existing contract; no API,
  limiter, or repository test was weakened. Cleanup again removed two users, five sessions,
  three audit events, and the temporary Workspace/memberships.

### Final authenticated smoke and cleanup

- `node /private/tmp/qlikhub-preview-release.o05DkA/smoke.cjs` — final run passed 36/36 checks,
  zero failed/skipped, using two persisted temporary users and one Workspace in Preview PostgreSQL.
  Health/root/login, secure HttpOnly cookies, unauthenticated/origin rejection, Owner-vs-QA audit
  scope, bounded input, self-change, administrative reset, one-time reset/replay rejection,
  session revocation, and all three persisted audit types passed. Secret-bearing fields were absent
  from the audit response. The reset token was a persisted hash fixture, not proof of email delivery.
- Link-preview burst: 31 authenticated requests in 18,865 ms; 30 passed the limiter and were rejected
  by SSRF validation with `400 UNSAFE_URL`, one received `429` with top-level `RATE_LIMITED`.
  `Retry-After`, `RateLimit`, and `RateLimit-Policy` were present. The second user received
  `400 UNSAFE_URL`, proving its bucket was independent. No request fetched the loopback target.
- Final fixture cleanup deleted two users, five sessions, three audit events, and the temporary
  Workspace/memberships. Every earlier seeded attempt also ran its scoped cleanup.
- `node /private/tmp/qlikhub-preview-release.o05DkA/runner.cjs final-audit` — read-only verification
  using the guarded Preview identity and verified TLS: 48 up, zero pending, all 41 public application
  tables total zero rows. `SequelizeMeta` retains the 48 canonical migration records.
- Post-cleanup `/v1/health` returned `200` with database connected; unauthenticated
  `/v1/auth/security-events` returned `401`.
- `node /private/tmp/qlikhub-preview-release.o05DkA/final-runtime.cjs` — retrieved 200 recent
  runtime log records scoped to the final Preview deployment; no distributed-store fallback warning
  or server-error classification was observed in those records. This is a bounded log sample,
  not exhaustive multi-instance or sustained-load evidence.
- `vercel remove dpl_2MmUPtZAeib34D6ezkgmZtbYGhcU dpl_7nuvAhsKVUMxLEmS6Tf4fBKDV8Wn dpl_96Qffmpkuc1145orCq3gNGXfU6nw dpl_HAB7iW6xzoJty1Y83rVVVWJuzR7R --yes --safe --scope oneilreyands-projects`
  deleted exactly the four intermediate Preview deployments from this task. Final deployment
  `dpl_427wEXrtqLk6qypNsKkBz1pPcHRF` and all pre-existing deployments were retained.
- Removed the ten explicitly inspected operational files (three runners, recovery metadata,
  six fixture manifests) and their now-empty temporary directory. No secret values were stored in
  these artifacts. User `.env` was not changed or staged. Temporary users/data and deployments
  were intentionally deleted, not retained as recoverable product data. No temporary setup endpoint
  was introduced. Short-lived limiter keys expire through the configured provider TTL.
- Final documentation: `npm run docs:check` passed 5/5 with zero failures/skips and governance
  passed; targeted Prettier checks and `git diff --check` passed.

## Risks or follow-up

- This proves the bounded Preview credential-security release, not complete Production readiness.
- No Production environment, deployment, database, or user was accessed or changed.
- Email delivery, browser UI journeys, full release cancellation/archival workflows, MFA, audit
  retention, and broad production readiness are outside this bounded security smoke.

## TODO update

- `SEC-07-PREVIEW-RELEASE-VALIDATION` → `Done`: scoped Preview release, smoke, and cleanup verified.
