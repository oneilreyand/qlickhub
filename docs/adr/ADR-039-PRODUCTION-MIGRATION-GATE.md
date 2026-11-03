# ADR-039 — Production migration gate via the public health check

- **Status:** Accepted
- **Date:** 2026-11-03
- **Decision owner:** Owner, chat 2026-11-03: chose "Health + cek CI tanpa akses DB" over a
  read-only database credential in CI and over a manual checklist.
- **Refines:** [ADR-028](ADR-028-TIERED-AUTO-MERGE.md); replaces the warning-only CI notice from
  [CI-ENV-MIGRATION-GUARD](../plans/quick/CI-ENV-MIGRATION-GUARD.md).

## Context

Merge to `main` deploys Production automatically, while Production migrations are run manually by
the Owner. Twice (085/086 on 2026-10-14, 089–093 on 2026-11-03) code reached Production before its
migrations, and the existing CI step only warned. See
[SIMPLE_UI_P5EFG_RELEASE_2026-11-03](../reports/SIMPLE_UI_P5EFG_RELEASE_2026-11-03.md).

## Decision

1. `GET /health` and `GET /v1/health` add `database.migrations: { latest, applied }` — the newest
   `SequelizeMeta` file name and the row count — when the database is connected. No data, schema
   contents, connection details, or error text are exposed in Production.
2. CI (`verify`, pull requests into `main`) runs `npm run migrations:prod:check` as its last step. It
   reads the public Production health check and **fails** when the checked-out tree contains canonical
   migrations newer than Production's latest. The Owner runs those migrations in Production, then
   re-runs CI before merging.
3. When Production health is unreachable or does not report migration status, the check passes with
   a warning (`unverified`) instead of blocking unrelated pull requests.
4. CI holds no Production database credential.

## Alternatives

- **Read-only database user in CI:** exact, but stores a Production credential in GitHub. Rejected.
- **Manual checklist:** no code, but already failed twice. Rejected as the only control.

## Consequences

A pull request that adds a migration stays red until Production has it, so "migrate before merge"
is enforced, not remembered. A migration applied out of order (older timestamp after a newer one) is
not detected because only the latest name is compared; canonical migrations are timestamp-ordered.
The latest migration file name becomes public; it describes schema intent only and carries no
secret.
