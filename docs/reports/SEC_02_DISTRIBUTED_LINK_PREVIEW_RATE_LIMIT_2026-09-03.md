## Task

SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT: enforce the existing link-preview limit consistently across Vercel serverless instances.

## Outcome

The API now supports a shared single-region Upstash Redis REST exact rolling-window limiter for `GET /v1/meta/link-preview`. The limit remains 30 requests per 60 seconds per authenticated user, with an IP fallback. One atomic Redis script removes expired request markers, checks the active count, conditionally records the request, and returns the remaining/reset state. Redis identifiers are HMAC-derived, at most 30 short-lived markers are retained per identifier, and transient provider errors or timeouts degrade to a process-local memory limiter with a throttled sanitized warning.

Production and Vercel Preview now select Upstash by default and fail environment validation if the distributed store or any required backend-only credential is missing. Local and test environments retain the memory store unless Upstash is selected explicitly.

Authenticated Preview validation exposed that the former SDK weighted two-bucket approximation could open additional capacity while a burst crossed a fixed-minute boundary: all 31 requests were accepted even though they completed within 60 seconds. The exact rolling-window replacement closes that defect. The final authenticated smoke accepted 30 requests, rejected one with `429 RATE_LIMITED`, preserved a separate second-user bucket, and returned the standard rate-limit headers. The two temporary accounts and sessions, every endpoint-bearing deployment, the temporary credential file, and the temporary endpoint source were removed. The clean endpoint-free Preview deployment is healthy with its database connected. Production state was not changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, and accepted `docs/adr/ADR-003-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT.md`.
- **Policy IDs:** `SEC-001`, `AUTH-002`, `DATA-001`, `TEST-001`, `DOC-002`.
- **Data/interface impact:** Upstash stores only short-lived opaque rate-limit counters. The endpoint path, success response, `429 RATE_LIMITED` body, and standard rate-limit headers are unchanged.
- **Authorization impact:** None. Existing authentication still runs first; the limiter consumes authenticated `userId` and only falls back to normalized IP when identity is absent.
- **Migration risk:** No PostgreSQL schema or migration change. Deployment requires separate Preview and Production Upstash resources plus backend-only environment variables.

## Changed files

- `apps/api/package.json` and `package-lock.json` — retain the Upstash Redis client and remove the no-longer-used approximate rate-limit SDK.
- `apps/api/src/config/env.ts` — validate distributed-store configuration and fail fast in Production and Vercel Preview.
- `apps/api/src/config/__tests__/env.test.ts` — prove local/test defaults and mandatory Production/Preview configuration.
- `apps/api/src/http/middleware/rateLimit.ts` — configure the exact Upstash rolling window, HMAC identifiers, existing response contract, and fallback warning.
- `apps/api/src/http/middleware/exactSlidingWindowRateLimiter.ts` — execute the bounded atomic sorted-set script, enforce timeout semantics, validate provider output, and reset exact keys.
- `apps/api/src/http/middleware/distributedRateLimitStore.ts` — adapt the external limiter to `express-rate-limit` and provide the local fallback.
- `apps/api/src/http/__tests__/distributedRateLimit.test.ts` — prove the fixed-minute boundary regression, shared two-instance counter, exact request 31 rejection, user isolation, opaque identifiers, and error/timeout fallback.
- `apps/api/src/http/middleware/proxyTrust.ts` and `apps/api/src/app.ts` — trust exactly one proxy hop on Vercel so `express-rate-limit` can consume Vercel's normalized client IP without enabling permissive proxy trust.
- `apps/api/src/http/__tests__/proxyTrust.test.ts` — exercise the real `express-rate-limit` middleware with Vercel-style forwarding headers and prove non-Vercel environments retain Express defaults.
- `.env.example` and `.env.production.example` — document placeholder variable names without real credentials.
- `scripts/checkEnv.mjs` — validate the distributed limiter configuration without printing values.
- `docs/1_ARCHITECTURE.md`, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, and `docs/adr/ADR-003-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT.md` — record the canonical exact rolling-window and one-hop Vercel proxy boundaries.
- `TODO.md` — record completion and exact validation evidence.

## Validation

- `npm install --workspace @qlick/api @upstash/redis @upstash/ratelimit` — initial implementation install passed. The final implementation retains `@upstash/redis` 1.38.3 and removes `@upstash/ratelimit` because its weighted two-bucket algorithm did not satisfy the exact rolling-window contract. npm reported 7 moderate dependency vulnerabilities; no automatic dependency rewrite was attempted.
- `node scripts/checkEnv.mjs` — passed with 0 warnings; no environment values were printed.
- `npm --prefix apps/api run typecheck` — passed.
- `NODE_ENV=test npx tsx --test apps/api/src/config/__tests__/env.test.ts apps/api/src/http/__tests__/distributedRateLimit.test.ts apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — 59 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 10 suites.
- `NODE_ENV=test npx tsx --test apps/api/src/config/__tests__/env.test.ts apps/api/src/http/__tests__/proxyTrust.test.ts apps/api/src/http/__tests__/distributedRateLimit.test.ts apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` — final focused security regression passed: 62 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 10 suites.
- `npm --prefix apps/api run test:integration` — API build and complete local PostgreSQL-backed regression passed: 363 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo; 90 suites.
- `npm run validate` — passed: documentation checks 5/5, lint 0 errors with 27 pre-existing warnings outside this task, and contracts/API/web typechecks passed.
- Targeted Prettier and ESLint — passed with 0 warnings; `git diff --check` passed.
- Vercel Preview deployment `dpl_FcoE1h1ETZbP57wozFzhfsmEwfg7` (`qlickhub-el1txanvu-oneilreyands-projects.vercel.app`) — build completed and deployment reached `READY` in `iad1`.
- `vercel curl /v1/health --deployment https://qlickhub-el1txanvu-oneilreyands-projects.vercel.app -- --include` — `HTTP/2 200`; service healthy and database connected.
- Preview authentication probe after the proxy fix — reached the application and returned only the expected safe invalid-credential response; runtime logs no longer contained the earlier `ERR_ERL_UNEXPECTED_X_FORWARDED_FOR` or `ERR_ERL_FORWARDED_HEADER` failures.
- Direct real-Upstash diagnostic of the former SDK algorithm — 10/10 fresh-key bursts produced 30 allows and one rejection, with no timeout at either 750 ms or 3 seconds. This ruled out provider health, atomicity, and the configured timeout as the defect source; every diagnostic key was reset.
- Authenticated smoke of the former weighted two-bucket implementation — a 31-request burst completed across a fixed-minute boundary with 31 responses `200`; the response headers used one opaque partition key but exposed decaying prior-bucket weight and duplicate remaining values. Both temporary accounts and sessions were deleted.
- Direct real-Upstash exact-boundary regression — 3 requests immediately before a simulated minute boundary plus 27 immediately after it were accepted, request 31 at +12 seconds was rejected, and a second identifier was accepted. Both diagnostic keys were reset.
- Endpoint-bearing Preview deployment `dpl_5zb1JoMFAVQKcJzEWS3N8AnCVW17` — authenticated smoke passed: setup `201`, both logins `200`, second user `200`, 30 primary-user responses `200`, one `429 RATE_LIMITED`, standard `RateLimit`, `RateLimit-Policy`, and `Retry-After` headers present, then cleanup `200` deleted exactly two accounts and two sessions.
- Temporary deployment cleanup — removed `dpl_NYdG417pCxfMwh2qoSuaALtQmDBz`, `dpl_8YbUx4FREfAc964PvMHjGXkFx93J`, and `dpl_5zb1JoMFAVQKcJzEWS3N8AnCVW17`; none is recoverable. The project-level Preview environment was checked and contained no `SEC02_SMOKE_SETUP_SECRET`.
- Clean Preview deployment `dpl_HKXzES8URj8xYtL1gEVVDsvAU28e` (`qlickhub-38mo7cnkk-oneilreyands-projects.vercel.app`) — build completed and reached `READY` in `iad1`; `/v1/health` returned `200` with database `connected`, and a probe using the retired setup secret returned `401 UNAUTHORIZED` because the temporary route is absent.

## Risks or follow-up

- Preview resource `qlickhub-preview-rate-limit` (`store_sW3pPf5HQKwfMRBu`) is connected only to Preview with `LINK_PREVIEW_RATE_LIMIT_STORE=upstash` and a separate sensitive `RATE_LIMIT_KEY_SECRET`. Keep this resource isolated from Production.
- Provider failure intentionally weakens enforcement to per-instance memory until Upstash recovers. The warning is sanitized, throttled, and must be included in operational monitoring before claiming healthy distributed enforcement.
- Production still requires its own isolated Upstash resource and Production-scoped backend secrets before rollout. This task did not create, modify, or deploy any Production state.
- Review the 7 moderate npm audit findings as a separate dependency-maintenance task; do not use a breaking automatic fix without impact review.

## TODO update

- `SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT` → `Done`; local regression, real Upstash boundary behavior, authenticated Preview enforcement, second-user isolation, cleanup, and clean deployment health are all evidenced above.
