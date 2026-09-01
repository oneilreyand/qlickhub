## Task

API-EXPRESS-5-MODERNIZATION: Upgrade the existing backend from Express 4 to Express 5 while preserving all `/v1` contracts, cookie-session authentication, Workspace RBAC, Sequelize/PostgreSQL behavior, and deployment entry points.

## Outcome

The API now resolves Express `5.2.1` with `@types/express` `5.0.6`. No application source, data schema, migration, API response contract, authorization policy, cookie setting, or frontend code changed. The existing application boots and the public `GET /v1` contract remains `200` with the expected API name and version.

## Changed files

- `apps/api/package.json` — upgrades `express` from `^4.21.0` to `^5.2.1` and aligns `@types/express` to v5.
- `package-lock.json` — records the Express 5 dependency tree.
- `TODO.md` — claims this modernization item as in progress pending persisted-workflow verification.

## Validation

- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/api run build` — passed.
- Local Express 5 smoke check: boot `createApp()`, request `GET /v1`, assert `200`, `name = Authentication API`, and `version = v1.0` — passed.
- `npm --prefix apps/api run test:integration` — not completed. Its build phase passed, then PostgreSQL-backed suites failed at setup and remaining suites waited on database connection timeouts. The process was stopped after roughly 2.5 minutes; it does not provide valid regression evidence.
- Re-ran `npm --prefix apps/api run test:integration` — same result: build passed; PostgreSQL-backed suites failed at setup and the remaining suites waited on connection timeouts. The process was stopped after roughly one minute.
- `docker ps --format '{{.Names}}\t{{.Image}}\t{{.Status}}'` — unavailable: Docker is not installed in this environment, so a local disposable PostgreSQL container cannot be started here.

## Risks or follow-up

- Do not mark the upgrade complete until the disposable PostgreSQL test database is available and the full API integration suite passes.
- The package installation reported six moderate dependency vulnerabilities. No automated audit fix was applied because it could alter unrelated packages; audit and remediation need a separate scoped task.
- The pre-existing `/v1` router ordering returns `401` for an unknown unauthenticated `/v1/*` path before reaching the generic `404` handler. This was observed during the smoke check and is not an Express 5 regression; it is out of scope for this upgrade.
- `.env.production.example` contains an unrelated user change and was not modified.

## TODO update

- API-EXPRESS-5-MODERNIZATION → In progress
