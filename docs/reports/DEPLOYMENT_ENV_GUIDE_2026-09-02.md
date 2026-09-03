## Task

DEPLOYMENT-ENV-GUIDE: consolidate Local, Preview, and Production environment setup, URL routing,
secret boundaries, migration safety, and deployment verification.

## Outcome

Qlick Hub now has one active operational guide for Local, Vercel Preview, and Vercel Production.
It documents the current canonical Production URL, same-origin `/v1` routing, exact ownership of
each environment file/provider scope, browser/backend secret boundaries, safe database connection
roles, Preview and Production release flows, custom-domain changes, smoke checks, and rollback.

Local onboarding is reduced to `npm run env:setup:local`. The command creates the root `.env` and
`apps/web/.env.local` from their canonical templates only when absent. It never overwrites existing
configuration or prints values. Production migration and test database URLs are explicitly kept
out of the Vercel runtime.

No Vercel variable, secret, deployment, database record, schema, migration, API contract, product
workflow, or authorization behavior was changed.

## Source of truth and impact

- **Applicable SSoT:** `docs/0_PRODUCT_KNOWLEDGE_MAP.md`, `docs/1_ARCHITECTURE.md`, and
  `docs/4_AGENT_DEV_GUIDELINES.md`; the new deployment document is the operational entry point.
- **Policy IDs:** `DOC-001`, `DOC-004`, `DATA-001`.
- **Data/interface impact:** None. The existing local `VITE_API_URL` and Production same-origin
  `/v1` interface are documented, not changed.
- **Authorization impact:** None.
- **Migration risk:** None. No migration or database command ran. The guide requires read-only
  audit, recovery planning, and explicit Production approval before canonical migrations.

## Changed files

- `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` — canonical operational deployment/environment guide.
- `README.md` and `docs/0_PRODUCT_KNOWLEDGE_MAP.md` — link the guide and simplify local onboarding.
- `.env.example` and `apps/web/.env.example` — identify the two canonical local templates.
- `.env.development.example` — marks the legacy development template as reference-only.
- `.env.production.example` and `apps/web/.env.production.example` — clarify Vercel ownership,
  browser exposure, and release-only/test-only database boundaries.
- `scripts/setupLocalEnv.mjs` and `scripts/setupLocalEnv.test.mjs` — add and verify the
  non-destructive local setup command.
- `scripts/checkDocs.mjs` — requires the operational guide and validates its local links.
- `package.json` — exposes `npm run env:setup:local`.
- `TODO.md` — records the claimed and completed work.

## Validation

- `node --test scripts/setupLocalEnv.test.mjs` — passed 2/2, 0 failed, 0 skipped.
- `npm run env:setup:local` — passed; preserved both existing ignored files and printed no values.
- `npm run env:check` — passed with 0 warnings; no values printed.
- `npm run docs:check` — passed 5/5 tests, 0 failed, 0 skipped; documentation governance passed.
- Targeted `npx prettier --check ...` — passed for all changed Markdown, JavaScript, and JSON files.
- Read-only Production HTTP checks on 2026-09-02 — root returned `200`; `/v1/health` returned `200`
  with service status `ok` and database status `connected`.
- `npm run validate` — documentation 5/5 passed; lint completed with 0 errors and 28 existing
  warnings; contracts typecheck passed. API typecheck then failed on the unrelated, unchanged
  `apps/api/src/services/__tests__/emailService.test.ts:21` boolean-to-string argument mismatch;
  web typecheck was not reached by the chained command.
- `git diff --check` — passed before the final report/TODO update and rerun afterward.

## Risks or follow-up

- No custom domain is configured by this task; the canonical URL remains
  `https://qlickhub.vercel.app`. The guide documents the no-code same-origin transition when a
  custom domain is approved.
- Repository-wide validation remains blocked by the pre-existing email test type mismatch. This
  task did not weaken or edit that unrelated test.
- Production configuration values remain provider-managed and were not independently listed or
  mutated in this documentation-only/configuration-onboarding task.

## TODO update

- `DEPLOYMENT-ENV-GUIDE` → `Done`
