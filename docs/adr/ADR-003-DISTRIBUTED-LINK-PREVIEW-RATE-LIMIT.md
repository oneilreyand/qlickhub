# ADR-003 — Distributed link-preview rate limiting

- **Status:** Proposed — owner decision required
- **Date:** 2026-09-03
- **Decision owner:** Product owner / Production infrastructure owner
- **Scope:** SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT

## Context

The authenticated `GET /v1/meta/link-preview` endpoint performs bounded outbound network work. SEC-01 applies a limit of 30 requests per minute per authenticated user, with an IP fallback, but the current `express-rate-limit` memory store is isolated to one Node.js process. Qlick Hub Production runs as Vercel serverless functions, so traffic distributed across warm instances can exceed the intended aggregate limit.

The current source of truth defines Supabase PostgreSQL as the application database with `DATABASE_POOL_MAX=1` on Vercel. It does not define Redis, a Vercel Marketplace key-value provider, or failure behavior for an unavailable distributed rate-limit store.

## Confirmed facts

1. Authentication runs before the link-preview limiter, so the canonical key can remain the authenticated `userId`; IP is only a fallback.
2. The endpoint must preserve the existing `429` response contract and standard rate-limit headers.
3. Vercel WAF rate limiting is available on all plans, but Hobby and Pro counting keys are IP and JA4. Arbitrary header counting is an Enterprise capability, so WAF alone does not preserve the current per-user application boundary. It remains useful as a separate IP-level edge defense.
4. Upstash provides an HTTP/REST Redis client and rate-limit SDK designed for serverless functions and supports per-identifier fixed or sliding windows.
5. Using PostgreSQL as the counter store would add a database operation to every link-preview request and compete with application work for the deliberately constrained Vercel connection pool.

Official references:

- [Vercel WAF rate-limiting limits and pricing](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
- [Vercel Marketplace storage](https://vercel.com/docs/marketplace-storage)
- [Upstash Vercel integration](https://upstash.com/docs/redis/howto/vercelintegration)
- [Upstash rate-limit algorithms](https://upstash.com/docs/redis/sdks/ratelimit-ts/algorithms)
- [Upstash timeout and caching behavior](https://upstash.com/docs/redis/sdks/ratelimit-ts/features)

## Proposed decision

1. Use one single-region Upstash Redis database connected to the Vercel project through the Marketplace integration.
2. Apply a sliding-window limit of 30 requests per 60 seconds to link preview only. Keep the existing API, login, and notification limiters out of this task.
3. Use an opaque HMAC-derived Redis identifier rather than storing a raw user UUID or IP in Redis keys. Add a dedicated backend-only secret rather than exposing or reusing a browser variable.
4. Require the Redis REST URL, Redis REST token, and identifier secret when Production selects the distributed store. Missing Production configuration fails startup instead of silently reverting to a per-instance store.
5. On a transient Redis timeout or provider error, fall back to the existing local in-memory limiter for that instance and emit a sanitized warning. This preserves availability while retaining partial protection, but the limit is temporarily no longer globally consistent.
6. Do not enable provider analytics in this slice. This minimizes stored request metadata and Redis command cost.
7. Preserve the existing `429 RATE_LIMITED` response body and standards-based rate-limit headers.

## Alternatives considered

### Vercel WAF only

Strong edge protection and no application datastore call, but it cannot preserve authenticated per-user counting on Hobby or Pro. It may be added separately as an IP-level defense after plan and pricing approval.

### PostgreSQL counter table

Avoids a new provider, but adds hot counter writes and connection demand to the Production database. This conflicts with the serverless pool constraint and couples abuse protection to primary database health.

### Fail closed on every Redis outage

Provides the strictest cost protection but turns a rate-limit provider incident into a complete link-preview outage. The proposed local fallback is the availability-oriented option; owner approval is required.

## Files likely to change after approval

- `apps/api/package.json` and `package-lock.json` — add the selected Redis/rate-limit clients.
- `apps/api/src/config/env.ts` and configuration tests — validate store selection and required backend-only credentials.
- `.env.example` and `.env.production.example` — document placeholder names only.
- `apps/api/src/http/middleware/rateLimit.ts` and a focused internal adapter — use the distributed store while retaining an injected test seam and local fallback.
- `apps/api/src/modules/meta/__tests__/linkPreviewSsrf.test.ts` or a focused rate-limit integration suite — prove shared counting across independent middleware instances, per-user isolation, IP fallback, `429`, headers, and provider-failure behavior.
- `docs/1_ARCHITECTURE.md`, `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`, and `docs/POLICY_REGISTRY.md` — record the accepted security and operational policy once approved.
- `TODO.md` and an implementation report — record exact evidence.

## Data and interface impact

- No PostgreSQL schema or migration is proposed.
- Redis holds short-lived opaque counter keys only; it is not a production workflow data source.
- The public endpoint path, success response, error body, and authentication boundary remain unchanged.

## Authorization impact

None. The limiter consumes authenticated identity after the existing authentication middleware and does not grant access.

## Migration and deployment risk

- No database migration.
- Production deployment must provision/link Redis, scope credentials separately for Preview and Production, add the identifier secret, and redeploy.
- Rolling back code is safe after removing the new store selection; short-lived Redis counter keys may expire naturally.
- Real provider validation requires a non-Production or disposable Redis resource. No credential may enter fixtures, logs, reports, or Git.

## Validation evidence required

1. Unit/behavior tests with an injected external-store seam proving aggregate counting across at least two middleware instances.
2. Existing 31-request production-equivalent behavior, authenticated-user isolation, IP fallback, `429` body, and standard header assertions.
3. Missing-configuration and transient-provider-failure tests matching the accepted failure policy.
4. API typecheck/build, focused lint, full API regression, docs check, and clean diff check.
5. Preview smoke evidence against a real linked Redis resource without disclosing credentials.

## Owner decisions required

1. Approve or reject Upstash Redis as a new external Production dependency with usage-based cost.
2. Approve local in-memory fallback during transient Redis failure, or require fail-closed link-preview responses instead.

Implementation must not begin until these decisions are accepted and the affected canonical SSoT is updated.
