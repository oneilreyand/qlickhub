# Agent Report — SEC-04 JWT Query String Removal

## Task

Stop accepting access JWTs through URL query parameters while preserving supported Bearer-header and HttpOnly-cookie authentication.

## Outcome

`accessTokenFromRequest()` no longer reads `req.query.token`. A request that supplies an otherwise valid access JWT only through `?token=` now receives `401 UNAUTHORIZED`. Authorization Bearer headers and the `qa_access_token` HttpOnly cookie remain supported.

Repository inspection confirmed that the browser's Server-Sent Events client uses `EventSource` with `withCredentials: true`, so realtime connections already authenticate with the cookie and do not require a token in the URL. No repository caller used query-string access tokens.

This prevents reusable access JWTs from being copied into URL history, proxy/access logs, analytics, or referrer data through the API authentication layer.

## Source of truth and impact

- **Applicable SSoT:** `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md` security and authenticated-interface boundaries, and `docs/4_AGENT_DEV_GUIDELINES.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `TEST-001`.
- **Data/interface impact:** The undocumented query-string credential transport is removed. Supported Bearer-header and HttpOnly-cookie interfaces are unchanged. No persisted data changed.
- **Authorization impact:** Authentication fails closed when the only submitted credential is a query parameter. User, session, Workspace membership, and role checks are unchanged.
- **Migration risk:** None. No model, schema, migration, or database configuration changed.

## Changed files

- `apps/api/src/modules/auth/jwt.ts` — removes query-string JWT extraction.
- `apps/api/src/modules/auth/__tests__/jwt.test.ts` — proves accepted header/cookie transports and rejected query transport.
- `apps/api/src/modules/auth/__tests__/onboardingApi.test.ts` — proves a valid persisted session JWT supplied only in the URL receives 401 at the HTTP boundary.
- `TODO.md` — records task scope and completion evidence.
- `docs/reports/SEC_04_JWT_QUERY_STRING_REMOVAL_2026-09-04.md` — records this report.

## Validation

- Pre-fix `NODE_ENV=test npx tsx --test apps/api/src/modules/auth/__tests__/jwt.test.ts` — expected red result: 2 passed and 1 failed because the query JWT was returned by production code.
- Post-fix `NODE_ENV=test npx tsx --test apps/api/src/modules/auth/__tests__/jwt.test.ts apps/api/src/modules/auth/__tests__/onboardingApi.test.ts` — passed 8/8 across 2 suites; 0 failed, cancelled, skipped, or todo. PostgreSQL used the configured test/Preview database; no Production database was accessed.
- `npm --prefix apps/api run test:integration` — build passed and 367/367 tests passed across 91 suites; 0 failed, cancelled, skipped, or todo. This includes authentication/session, realtime SSE, SSRF, rate-limit, RBAC, and PostgreSQL integration coverage. Simulated FCM and unconfigured-test-SMTP notices were expected.
- `npm run validate` — documentation checks passed 5/5, lint passed with 0 errors and 27 pre-existing warnings, and contracts/API/web typechecks passed.
- `git diff --check` — passed with no whitespace errors.

## Risks or follow-up

- An external client not represented or documented in this repository that depended on `?token=` must switch to an Authorization Bearer header or the existing cookie. This is an intentional security break for an unsafe credential transport.
- Password-reset and invitation tokens are separate, short-lived, one-time credentials and are not changed by this task. Their browser URL lifecycle should be reviewed as a separate security task.

## TODO update

- `SEC-04-JWT-QUERY-STRING-REMOVAL` → `Done`.
