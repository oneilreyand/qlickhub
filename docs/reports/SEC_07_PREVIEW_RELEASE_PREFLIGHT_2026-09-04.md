# Agent Report — SEC-07 Preview Release Preflight

Historical preflight record. Subsequent user approval and rollout progress are recorded in
[SEC-07 Preview Release](SEC_07_PREVIEW_RELEASE_2026-09-04.md); blockers below describe earlier stages.

## Task

SEC-07-PREVIEW-RELEASE-VALIDATION: verify Preview readiness for the locally validated credential
security audit implementation at `cc228521e12a58b7110aef7d1f6721ba5ad30352`.

## Outcome

**Connection blocker resolved; awaiting migration-scope approval before remote writes.** The latest
attempt authenticated successfully to the expected Preview Session Pooler with CA and hostname
verification enabled. A read-only transaction found 45 canonical migrations applied, three pending,
and no unknown migration names. Earlier `28P01` failures below are historical; no credential was
rewritten or reset by the agent, and the reason for the earlier failure is not established.

- The local `.env` `DATABASE_URL` matches the known Production project, not Preview. Its value was
  neither printed nor used to connect.
- Vercel Preview has a separate `DATABASE_URL` marked `sensitive`. CLI export supplies an empty
  value; `MIGRATION_DATABASE_URL` is not provided.
- Vercel CLI 51.7.0 `env run` merges local dotenv values over remote values. The first probe from
  the repository therefore stopped with `PREVIEW_IDENTITY_NOT_VERIFIED`. Inspection of the installed
  CLI confirmed this precedence. An isolated temporary directory without `.env` removed that
  ambiguity and confirmed the empty exported Preview credential.
- No migration status or new audit behavior can be inferred from the old deployment's health check.
- The initial direct probe failed with `SELF_SIGNED_CERT_IN_CHAIN`. A retry using the public CA
  linked by the official Supabase dashboard passed certificate verification and then received
  `28P01`. Certificate and hostname verification were never disabled. No credential guessing or
  password rotation was attempted.

### Latest successful connection and pending migration review

- Local format checks passed: expected Preview identity, password present, valid percent decoding,
  no recognized placeholder, no edge whitespace, no URL fragment, and no surrounding square brackets.
- The guarded Node `pg.Client` probe completed `BEGIN READ ONLY`,
  `SELECT name FROM "SequelizeMeta" ORDER BY name`, and `ROLLBACK` successfully.
- Applied count: **45**. Unknown migration names: **0**. Pending migrations:
  - `20260901000062-create-release-record-cancellations.cjs`: adds two cancellation tables and
    triggers; also replaces the release-critical Task soft-deletion function so cancelled release
    records no longer block deletion. This is a behavior change beyond credential audit.
  - `20260901000063-add-workspace-archive-activity-actions.cjs`: expands the existing Workspace
    activity check constraint to accept archive/restore actions.
  - `20260904000064-create-auth-security-events.cjs`: adds the credential audit table, restricted
    foreign keys, metadata/identity checks, indexes, and update-rejection trigger.
- No migration was applied and no remote application records, credentials, settings, or deployments
  were changed. No Production connection was made.
- Before proceeding, obtain approval for all three migrations (not just audit migration 64), record
  the Preview recovery plan, and verify current state again. Do not run destructive down migrations
  automatically; retain the old deployment as the application fallback.

## Source of truth and impact

- **Applicable SSoT:** `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §§4–6,
  `docs/1_ARCHITECTURE.md` §§5–6, `docs/4_AGENT_DEV_GUIDELINES.md`, and
  `docs/features/SEC_07_CREDENTIAL_SECURITY_AUDIT.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-006`, `DATA-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Confirmed facts:** Local SEC-07 implementation is committed and previously verified with
  383 API tests, 60 contract tests, and 48 canonical migrations. Existing Preview remains Ready.
- **Unresolved:** Approval for the two older pending migrations in addition to SEC-07, recovery
  preparation, and authenticated smoke prerequisites for the new release.
- **Data/interface impact:** None in this preflight. No remote records or settings changed.
- **Authorization impact:** None; Production is explicitly excluded.
- **Migration risk:** Migration 64 is additive but must precede new credential handlers. Older pending
  migrations, if any, need review. No destructive rollback or temporary setup endpoint was created.

## Changed files

- `TODO.md` — record the blocked release and exact next prerequisite.
- This report — preserve sanitized observations and release boundaries.

## Validation

- `git status --short` before work — clean; HEAD `cc22852`.
- `vercel list qlickhub --environment preview --status READY --scope oneilreyands-projects` —
  succeeded; existing Preview `qlickhub-38mo7cnkk-oneilreyands-projects.vercel.app` is Ready.
- `vercel env ls preview --scope oneilreyands-projects` — succeeded; names and encrypted status
  only. A captured `vercel env ls preview --format json --scope oneilreyands-projects` response was
  filtered in memory to the database variable's name/type/target: `sensitive`, Preview only.
- `vercel env run -e preview --scope oneilreyands-projects -- node -e '<read-only database probe>'`
  — stopped before connection. The probe requires an exact known Preview hostname/user reference,
  TLS certificate verification, bounded timeouts, and `BEGIN READ ONLY`; it only intends to compare
  `SequelizeMeta` names with canonical migration filenames. It emits allowlisted error codes only.
  From the repository the identity guard failed; from the isolated folder URL validation failed.
- The same isolated `env run` with a presence-only probe reported `DATABASE_URL: empty` and
  `MIGRATION_DATABASE_URL: not-provided`. No secret values or lengths were output or written.
- `vercel curl /v1/health --deployment https://qlickhub-38mo7cnkk-oneilreyands-projects.vercel.app --scope oneilreyands-projects -- --silent --show-error --max-time 30`
  — returned `status: ok` and database `connected` on 2026-09-04.
- `vercel curl /v1/auth/security-events --deployment https://qlickhub-38mo7cnkk-oneilreyands-projects.vercel.app --scope oneilreyands-projects -- --silent --show-error --max-time 30`
  — returned `UNAUTHORIZED` / `Authentication is required.` No HTTP status was captured. This
  proves the old deployment's unauthenticated guard only, not availability of the SEC-07 endpoint.
- `npm run env:check` — passed with zero warnings and no values printed. This validates local
  configuration syntax, not Preview identity or release readiness.
- `npm run docs:check` — 5/5 passed, zero failures/skips; documentation governance passed.
- `git diff --check` — passed with no whitespace errors.
- No application tests were rerun: only status/evidence documentation changed. Existing SEC-07
  test results are linked, not represented as new execution.

### Follow-up after the local Preview connection was saved

- Presence/identity-only Node check using `dotenv.parse` on `.env` — variable present, exact known
  Preview target matched, Session Pooler selected. No secret value printed.
- Read-only Node `pg.Client` probe using only `PREVIEW_MIGRATION_DATABASE_URL`, 10-second
  connection/query timeouts, and `ssl.rejectUnauthorized: true` — failed TLS trust before queries.
- Verified the provider CA URL against the official dashboard
  [custom-content configuration](https://github.com/supabase/supabase/blob/master/apps/studio/hooks/custom-content/custom-content.json).
  Downloaded `https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt`
  over verified HTTPS into memory; validated it as an X.509 CA and supplied it only to the Preview
  client. This public provider certificate filename does not imply access to the application's
  Production database.
- The same guarded `pg.Client` probe with that CA — authentication rejected with `28P01`;
  no SQL queries ran. The intended read-only transaction and migration inspection were not reached.
- Secret-free password-format checks — password is present, no recognized placeholder or edge
  whitespace, and no URL fragment. These checks do not establish password correctness or rule out
  every encoding problem.

## Risks or follow-up

- The supplied Preview credential now works; no password reset is needed. Do not replace or reuse
  the local Production `DATABASE_URL`, and do not paste secrets into chat/reports.
- Repeat target and read-only migration checks, review pending migrations/recovery, then deploy only
  to Preview and run authenticated credential/audit smoke checks on explicitly scoped temporary data.
- No Preview secrets were written to disk by the agent; the user supplied the ignored local `.env`
  variable. The provider CA was held only in memory. The temporary project-link file contained only public
  project/team identifiers and was removed; no temporary endpoint or deployment exists to clean up.
- Production was not accessed or changed. No release success is claimed.

## TODO update

- `SEC-07-PREVIEW-RELEASE-VALIDATION` → `Blocked` pending approval for the complete migration scope.
