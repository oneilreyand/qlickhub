## Task

Local performance and security hardening.

## Outcome

- New Workspace members now receive a one-time set-password link. There is no shared initial password.
- Password-reset bearer tokens are SHA-256 hashed before persistence. Previously issued plaintext reset links are intentionally invalid.
- Email delivery no longer logs recipients, subjects, HTML, or reset links. Production configuration now requires SMTP credentials at startup.
- The one-connection Sequelize limit remains for Vercel serverless production only. A local process, including one started with production-like settings, uses the normal pool capacity of 10 unless `DATABASE_POOL_MAX` explicitly overrides it.
- Protected frontend routes and Firebase load after session verification. The login hero uses responsive Cloudinary transformations.
- Workspace readiness now batches its supporting records for all requested Feature / Story IDs instead of executing the supporting query sequence once per Feature. It also selects the requirement ID needed for correct active-test-case coverage.

## Changed files

- `apps/api/src/modules/auth/passwordResetToken.ts` — one-time token generation and hashing.
- `apps/api/src/modules/auth/auth.routes.ts` — hashes stored reset tokens and invalidates an undelivered reset.
- `apps/api/src/modules/workspaces/workspaceService.ts` — provisions passwordless accounts with a one-time set-password token after authorization.
- `apps/api/src/services/emailService.ts` and `apps/api/src/config/env.ts` — validated email configuration and non-sensitive delivery failure behavior.
- `apps/api/src/db/sequelizePool.ts` and `apps/api/src/db/sequelize.ts` — serverless-only pool restriction and bounded override.
- `.env` and `apps/api/src/config/env.ts` — local development selects `LOCAL_DATABASE_URL` without deleting deployment configuration.
- `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts` — batched readiness derivation.
- `apps/web/src/app/App.tsx`, `apps/web/src/main.tsx`, and `apps/web/src/pages/LoginPage.tsx` — deferred protected/Firebase code and responsive hero image.

## Validation

- `npm run env:check` — passed, 0 warnings.
- Local runtime resolution and database health — passed (`development`, `localhost/qa_management_dev`, SSL disabled, local storage, connected).
- `npm --prefix packages/contracts run typecheck` — passed.
- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/api run build` — passed.
- Focused API tests (`sequelizePool`, `passwordResetToken`, `emailService`) — 5/5 passed.
- PostgreSQL integration: Workspace member addition — 8/8 passed.
- PostgreSQL integration: Release Readiness single/batch parity and authorization — 8/8 passed.
- PostgreSQL integration: password reset hash, one-time use, and credential update — 1/1 passed.
- `npm --prefix apps/web run typecheck` — passed.
- `npm --prefix apps/web run test` — 296/296 passed; existing React `act(...)` and nested-button warnings remain.
- `npm --prefix apps/web run build` — passed. Initial JavaScript is 270.55 kB / 85.89 kB gzip, down from the measured 1.32 MB / 308.5 kB gzip before route splitting.
- `git diff --check` — passed.

## Risks or follow-up

- The already-running local API process must be restarted to load the rebuilt API and new pool behavior.
- Local development now selects `qa_management_dev`; production deployment values remain managed separately.

## TODO update

- `SEC-AUTH-EMAIL-HARDENING` → `Done`.
