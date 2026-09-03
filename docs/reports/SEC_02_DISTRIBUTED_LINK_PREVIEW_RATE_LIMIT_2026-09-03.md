## Task

SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT: enforce the existing link-preview limit consistently across Vercel serverless instances.

## Outcome

The API now supports a shared single-region Upstash Redis REST sliding-window limiter for `GET /v1/meta/link-preview`. The limit remains 30 requests per 60 seconds per authenticated user, with an IP fallback. Redis identifiers are HMAC-derived, provider analytics are disabled, and transient provider errors or timeouts degrade to a process-local memory limiter with a throttled sanitized warning.

Production and Vercel Preview now select Upstash by default and fail environment validation if the distributed store or any required backend-only credential is missing. Local and test environments retain the memory store unless Upstash is selected explicitly.

The implementation is verified locally, including the complete PostgreSQL-backed API regression suite. A dedicated Preview Upstash resource is provisioned and linked, the Preview deployment is healthy, and the Vercel proxy boundary has a regression-tested one-hop trust configuration. Completion remains blocked only on the authenticated 31-request Preview smoke: the supplied account credentials were rejected, and the local `DATABASE_URL` was proven not to be the database used by the deployment. Production state was not changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, and accepted `docs/adr/ADR-003-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT.md`.
- **Policy IDs:** `SEC-001`, `AUTH-002`, `DATA-001`, `TEST-001`, `DOC-002`.
- **Data/interface impact:** Upstash stores only short-lived opaque rate-limit counters. The endpoint path, success response, `429 RATE_LIMITED` body, and standard rate-limit headers are unchanged.
- **Authorization impact:** None. Existing authentication still runs first; the limiter consumes authenticated `userId` and only falls back to normalized IP when identity is absent.
- **Migration risk:** No PostgreSQL schema or migration change. Deployment requires separate Preview and Production Upstash resources plus backend-only environment variables.

## Changed files

- `apps/api/package.json` and `package-lock.json` — add the Upstash Redis and rate-limit clients.
- `apps/api/src/config/env.ts` — validate distributed-store configuration and fail fast in Production and Vercel Preview.
- `apps/api/src/config/__tests__/env.test.ts` — prove local/test defaults and mandatory Production/Preview configuration.
- `apps/api/src/http/middleware/rateLimit.ts` — configure the Upstash sliding window, HMAC identifiers, existing response contract, and fallback warning.
- `apps/api/src/http/middleware/distributedRateLimitStore.ts` — adapt the external limiter to `express-rate-limit` and provide the local fallback.
- `apps/api/src/http/__tests__/distributedRateLimit.test.ts` — prove the shared two-instance counter, exact request 31 rejection, user isolation, opaque identifiers, and error/timeout fallback.
- `apps/api/src/http/middleware/proxyTrust.ts` and `apps/api/src/app.ts` — trust exactly one proxy hop on Vercel so `express-rate-limit` can consume Vercel's normalized client IP without enabling permissive proxy trust.
- `apps/api/src/http/__tests__/proxyTrust.test.ts` — exercise the real `express-rate-limit` middleware with Vercel-style forwarding headers and prove non-Vercel environments retain Express defaults.
- `.env.example` and `.env.production.example` — document placeholder variable names without real credentials.
- `scripts/checkEnv.mjs` — validate the distributed limiter configuration without printing values.
- `docs/1_ARCHITECTURE.md` — record the canonical one-hop Vercel proxy boundary.
- `TODO.md` — record the remaining authenticated Preview evidence blocker.

## Validation

- `npm install --workspace @qlick/api @upstash/redis @upstash/ratelimit` — passed; installed `@upstash/redis` 1.38.3 and `@upstash/ratelimit` 2.0.8. npm reported 7 moderate dependency vulnerabilities; no automatic dependency rewrite was attempted.
- `node scripts/checkEnv.mjs` — passed with 0 warnings; no environment values were printed.
- `npm --prefix apps/api run typecheck` — passed.
- `NODE_ENV=test npx tsx --test apps/api/src/config/__tests__/env.test.ts apps/api/src/http/__tests__/distributedRateLimit.test.ts apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — 59 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 10 suites.
- `NODE_ENV=test npx tsx --test apps/api/src/http/__tests__/proxyTrust.test.ts apps/api/src/http/__tests__/distributedRateLimit.test.ts apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — 57 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 10 suites.
- `npm --prefix apps/api run test:integration` — API build and complete local PostgreSQL-backed regression passed: 362 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 90 suites.
- `npm run validate` — passed: documentation checks 5/5, lint 0 errors with 27 pre-existing warnings outside this task, and contracts/API/web typechecks passed.
- Targeted Prettier and ESLint — passed with 0 warnings; `git diff --check` passed.
- Vercel Preview deployment `dpl_FcoE1h1ETZbP57wozFzhfsmEwfg7` (`qlickhub-el1txanvu-oneilreyands-projects.vercel.app`) — build completed and deployment reached `READY` in `iad1`.
- `vercel curl /v1/health --deployment https://qlickhub-el1txanvu-oneilreyands-projects.vercel.app -- --include` — `HTTP/2 200`; service healthy and database connected.
- Preview authentication probe after the proxy fix — reached the application and returned only the expected safe invalid-credential response; runtime logs no longer contained the earlier `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` or `ERR_ERL_FORWARDED_HEADER` failures.
- Real Upstash request-31 smoke — not complete because no valid authenticated Preview session was available. Two temporary records created in the user-confirmed local database were rejected by the deployment with `401`, then deleted by exact IDs; the follow-up query confirmed zero remaining records.

## Risks or follow-up

- Preview resource `qlickhub-preview-rate-limit` (`store_sW3pPf5HQKwfMRBu`) is connected only to Preview with `LINK_PREVIEW_RATE_LIMIT_STORE=upstash` and a separate sensitive `RATE_LIMIT_KEY_SECRET`. Keep this resource isolated from Production.
- Obtain a valid QlickHub account session from the actual Preview database. Then verify that the first 30 requests pass, request 31 returns `429 RATE_LIMITED`, a second authenticated user has an independent bucket, and the standard rate-limit headers are present.
- Vercel variables marked Sensitive are intentionally unavailable through CLI environment download. Do not substitute an unverified local `DATABASE_URL` for the deployed value.
- Provider failure intentionally weakens enforcement to per-instance memory until Upstash recovers. The warning is sanitized, throttled, and must be included in operational monitoring before claiming healthy distributed enforcement.
- Review the 7 moderate npm audit findings as a separate dependency-maintenance task; do not use a breaking automatic fix without impact review.

## TODO update

- `SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT` → `Blocked` pending an authenticated request-31 and second-user isolation smoke against the healthy Vercel Preview deployment.
