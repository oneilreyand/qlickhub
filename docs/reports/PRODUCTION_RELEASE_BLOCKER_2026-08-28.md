> **Resolved:** See [`PRODUCTION_RELEASE_2026-08-28.md`](PRODUCTION_RELEASE_2026-08-28.md) for the final audit, deployment, and smoke-test evidence.

## Task

PRODUCTION-RELEASE: audit Supabase Production, migrate with recovery evidence, deploy FE/BE to Vercel Production, and run protected smoke checks.

## Outcome

The exact local source passed the release build gate, and the dedicated Vercel and Supabase Production targets were identified without exposing secrets. The local root `.env` now contains a separately stored, untracked `PRODUCTION_DATABASE_URL` that points to the Production Session Pooler. The migration configuration accepts it only as a fallback after the canonical `MIGRATION_DATABASE_URL`, so it does not alter local API runtime connection selection.

The release remains stopped before mutation because the Production database cannot yet be audited or backed up: Supabase reports no available backup, and the configured Production URI is structurally valid but authentication is rejected. The password was not printed or changed.

No Production migration, Vercel Production deployment, or smoke-test mutation was run. The only recorded Production deployment remains in `ERROR` state.

## Changed files

- `TODO.md` — records the verified Production release blocker and safe unblock paths.
- `docs/reports/PRODUCTION_RELEASE_BLOCKER_2026-08-28.md` — records release validation and database/deployment evidence.
- `apps/api/src/config/database.cjs` — permits the existing `PRODUCTION_DATABASE_URL` local alias only for Sequelize migration commands, after `MIGRATION_DATABASE_URL`.
- `scripts/checkEnv.mjs` — validates the local Production migration alias without printing it.
- `.env.example` — documents the backward-compatible local alias.

## Validation

- `npm run env:check` — passed with 0 errors and 0 warnings; no values printed.
- `npm run validate` — passed; lint reported 0 errors and 27 existing warnings, and contracts/API/web typechecks passed.
- `npm run build` — passed for contracts, API, and web; Vite reported the existing JavaScript chunk advisory (`1,298.30 kB`, `304.08 kB` gzip).
- Vercel project/environment audit — `oneilreyands-projects/qlickhub` is linked and Production contains the required database, JWT, CORS, browser API, Firebase, and Google Drive variable names.
- `vercel list qlickhub --environment production --format json` — one Production deployment found; state `ERROR`; no healthy Production deployment is active.
- Supabase dashboard audit — Production project `qlickhub` (`avesjntvtasqeuynxqzt`) is healthy in Tokyo on `ap-northeast-1`; dashboard reports no backups.
- Redacted local target check — root `.env` points to Preview project `zdouvrybthbmzmtlarht`, not Production.
- Single credential-isolation check — the Preview credential was rejected by Production as expected; no retry or password guessing occurred.
- Redacted Production URI check — `PRODUCTION_DATABASE_URL` points to `avesjntvtasqeuynxqzt` through the Tokyo Session Pooler on port 5432, with the correct pooler username form and a nonempty, non-placeholder password.
- `npm run env:check` — passed with 0 warnings after the Production migration alias was added.
- `npm run typecheck:api` — passed.
- `../../node_modules/.bin/sequelize-cli db:migrate:status --env production` from `apps/api` — connected using the intended configuration but failed password authentication; no migration status, data read, schema change, or migration ran.
- `git diff --check` — passed before the documentation update; rerun after the update is required at resume.

## Risks or follow-up

- Correct the password in the untracked root `.env` `PRODUCTION_DATABASE_URL` (or set the canonical `MIGRATION_DATABASE_URL`), without pasting either value into chat. URL-encode reserved password characters such as `@`, `:`, `/`, `?`, `#`, and `%`.
- Before migration, confirm the Production project reference, list `SequelizeMeta`, count schema/data objects, and create a restorable logical backup outside the repository.
- Apply only pending canonical migrations, then deploy Vercel Production and verify `/`, `/login`, `/v1`, `/health`, `/v1/health`, database connectivity, CORS, Google Drive, and authenticated workflows when an account is available.
- The Supabase Advisor displayed RLS-disabled warnings for public tables. Qlick Hub currently authorizes through the Express API and the Data API is not part of the browser contract, but Data API exposure must remain disabled or be separately hardened before it is enabled.

## TODO update

- `PRODUCTION-RELEASE` → `Blocked`
