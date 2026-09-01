## Task

PRODUCTION-RELEASE: audit Supabase Production, apply only approved canonical migrations, deploy FE/BE to Vercel Production, and run protected smoke checks.

## Outcome

Qlick Hub Production is live at `https://qlickhub.vercel.app` on Vercel deployment `dpl_9irhHz8n5CRQnNEeZPNbUTCuahFA`.

The dedicated Supabase Production database (`avesjntvtasqeuynxqzt`, Tokyo) was audited before deployment. All 45 canonical migrations are already recorded as `up`, so no migration or schema mutation was needed. The audit found 39 public tables and zero rows in `users`, `workspaces`, `tasks`, and `task_attachments`.

The first deployment exposed two configuration defects: a trailing newline in the Google Drive attachment-provider value, and an outdated Vercel Production database password. The API now trims that provider input before validation, and the Vercel Production `DATABASE_URL` was securely replaced from the verified local Production value. No secret was displayed or committed.

The final deployment reports a connected database. During browser validation, the root URL exposed a missing React route and rendered the Not Found page even though the HTTP response was successful. The app now redirects `/` to `/login`, and the replacement deployment was validated through the browser. API routes, CORS, an unauthenticated authorization guard, and a live Google Drive create/read/trash workflow also passed. The Drive smoke artifact and its temporary workspace folder were moved to Google Drive Trash after the check.

## Changed files

- `apps/api/src/config/env.ts` — normalizes whitespace around the attachment-storage provider before runtime validation.
- `apps/api/src/config/__tests__/env.test.ts` — verifies newline normalization without mutating the source environment object.
- `apps/web/src/app/App.tsx` — redirects the public root URL to the login page.
- `apps/web/src/app/__tests__/AppRoutes.test.tsx` — covers the public root redirect in the route inventory.
- `apps/api/src/config/database.cjs` — allows the local Production migration URL alias after `MIGRATION_DATABASE_URL`.
- `scripts/checkEnv.mjs` — validates the Production migration alias without printing values.
- `.env.example` — documents the local Production migration URL alias.
- `TODO.md` — records the completed Production release and validation boundary.
- `docs/reports/PRODUCTION_RELEASE_2026-08-28.md` — records release evidence.

## Validation

- `npm run env:check` — passed with 0 errors and 0 warnings; no values printed.
- `npm run validate` — passed; lint reported 0 errors and 27 existing warnings, and contracts/API/web typechecks passed.
- `npm run build` — passed for contracts, API, and web; Vite retained the existing large-chunk advisory.
- `npm --prefix apps/api run build` — passed.
- `node --test dist/config/__tests__/env.test.js` from `apps/api` — passed, 1/1 tests.
- `npm --prefix apps/web run test -- src/app/__tests__/AppRoutes.test.tsx` — passed, 4/4 tests.
- `../../node_modules/.bin/sequelize-cli db:migrate:status --env production` from `apps/api` — passed; all 45 canonical migrations are `up`.
- Read-only Production database audit — 39 public tables, 45 migration records, and `0|0|0|0` rows for `users|workspaces|tasks|task_attachments`.
- Vercel Production deployment `dpl_9irhHz8n5CRQnNEeZPNbUTCuahFA` — `READY`, aliased to `https://qlickhub.vercel.app`; remote build passed with only the known Vite advisory.
- Production smoke checks — browser navigation from `/` redirects to `/login` and renders the login form; `GET /login`, `/v1`, `/health`, and `/v1/health` returned success; health reports `database=connected` and `service=authentication-api`.
- Production CORS — `OPTIONS /v1/health` from `https://qlickhub.vercel.app` returned `204` with that origin allowed.
- Authorization guard — unauthenticated `GET /v1/notifications` returned `401`.
- Google Drive Production smoke — live create/read/trash passed (`stored_bytes=41`, `read_bytes=41`); temporary artifacts were moved to Trash.

## Risks or follow-up

- No authenticated user session was available for a role-specific browser journey. The unauthenticated protected-route guard passed, but run an Owner/Admin/PO/Developer/QA journey once a production test account is supplied.
- Supabase reported no dashboard backup at the time of audit. No migration was pending or applied, but establish a scheduled recovery/backup policy before future schema-changing releases.
- The Supabase Data API must remain outside the browser contract unless RLS is designed and enabled for direct access.

## TODO update

- `PRODUCTION-RELEASE` → `Done`
