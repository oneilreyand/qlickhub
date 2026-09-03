## Task

SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT: enforce the existing link-preview limit consistently across Vercel serverless instances.

## Outcome

The API now supports a shared single-region Upstash Redis REST sliding-window limiter for `GET /v1/meta/link-preview`. The limit remains 30 requests per 60 seconds per authenticated user, with an IP fallback. Redis identifiers are HMAC-derived, provider analytics are disabled, and transient provider errors or timeouts degrade to a process-local memory limiter with a throttled sanitized warning.

Production and Vercel Preview now select Upstash by default and fail environment validation if the distributed store or any required backend-only credential is missing. Local and test environments retain the memory store unless Upstash is selected explicitly.

The implementation is verified locally, including the complete PostgreSQL-backed API regression suite. Completion remains blocked on provisioning a separate Preview Upstash resource and recording a real Preview smoke test; no external resource, credential, deployment, or Production state was changed in this task.

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
- `.env.example` and `.env.production.example` — document placeholder variable names without real credentials.
- `scripts/checkEnv.mjs` — validate the distributed limiter configuration without printing values.
- `TODO.md` — record the remaining Preview evidence blocker.

## Validation

- `npm install --workspace @qlick/api @upstash/redis @upstash/ratelimit` — passed; installed `@upstash/redis` 1.38.3 and `@upstash/ratelimit` 2.0.8. npm reported 7 moderate dependency vulnerabilities; no automatic dependency rewrite was attempted.
- `node scripts/checkEnv.mjs` — passed with 0 warnings; no environment values were printed.
- `npm --prefix apps/api run typecheck` — passed.
- `NODE_ENV=test npx tsx --test apps/api/src/config/__tests__/env.test.ts apps/api/src/http/__tests__/distributedRateLimit.test.ts apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — 59 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 10 suites.
- `npm --prefix apps/api run test` — API build and complete local PostgreSQL-backed regression passed: 360 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 90 suites.
- `npm run validate` — passed: documentation checks 5/5, lint 0 errors with 27 pre-existing warnings outside this task, and contracts/API/web typechecks passed.
- Targeted Prettier and ESLint — passed with 0 warnings; `git diff --check` passed.
- Real Upstash Preview smoke — not run because no Preview resource or credentials were provisioned in scope.

## Risks or follow-up

- Provision and link a dedicated Upstash resource to the Vercel Preview scope, configure `LINK_PREVIEW_RATE_LIMIT_STORE`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, and a separate `RATE_LIMIT_KEY_SECRET`, then redeploy. Do not paste credentials into chat, reports, fixtures, or Git.
- In Preview, verify that one authenticated user's first 30 requests can pass, request 31 returns `429 RATE_LIMITED`, another user has an independent bucket, and the standard rate-limit headers are present.
- Provider failure intentionally weakens enforcement to per-instance memory until Upstash recovers. The warning is sanitized, throttled, and must be included in operational monitoring before claiming healthy distributed enforcement.
- Review the 7 moderate npm audit findings as a separate dependency-maintenance task; do not use a breaking automatic fix without impact review.

## TODO update

- `SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT` → `Blocked` pending real Vercel Preview + Upstash smoke evidence.
