# ADR-006 — PostgreSQL link-preview rate limiting

- **Status:** Accepted
- **Date:** 2026-09-04
- **Decision owner:** Product / infrastructure owner
- **Scope:** SEC-08-POSTGRESQL-LINK-PREVIEW-RATE-LIMIT; `SEC-001`
- **Supersedes:** ADR-003's mandatory Upstash provider choice, not its exact-window, privacy,
  authentication, response, or availability-oriented fallback policy.

## Context and owner decision

The owner explicitly selected PostgreSQL after discussing the option of avoiding a separate Redis
subscription. PostgreSQL already stores application data. This avoids an additional provider, not
database usage costs: hot counter writes share the constrained Sequelize pool with application work.
Preview and Production remain separate databases. No claim of unlimited or guaranteed free hosting
is made. No remote release is authorized by this local implementation task.

## Decision

- PostgreSQL becomes the default distributed provider for Production/Preview. Explicit `upstash`
  remains supported for existing deployments and rollback; `memory` remains local/test only.
- Preserve the canonical limits and failure policy in Architecture §5. Do not modify the API,
  login, or notification limiters. Require the dedicated identifier secret for either distributed
  provider; PostgreSQL does not require Redis credentials.
- Add an infrastructure table keyed only by a 64-character HMAC digest, with accepted-request
  timestamps and expiry. No raw user/IP, URL, credential, or Workspace relationship is stored.
  Counters are ephemeral infrastructure state, not product audit events.
- Use one short PostgreSQL function call inside a Sequelize transaction. A transaction-level
  advisory lock serializes the same opaque key across connections, and database wall-clock time
  is read after acquiring the lock. Never use session advisory locks with Transaction Pooler.
- Prune timestamps outside the exact rolling window before conditionally appending one; rejected
  requests do not add markers. SQL validates bounds; each bucket stores no more than its configured
  limit (30 in Production, capped at 500 for internal test/development configurations).
- Opportunistic indexed cleanup deletes at most 100 expired buckets per call, using row locks with
  `SKIP LOCKED`. It must not delete refreshed/active counters or create a cross-key deadlock.
  Idle expired rows may remain until another request; no always-running serverless timer is assumed.
- Reuse the existing Sequelize pool, with transaction-local SQL/lock timeouts. Do not create a
  second pool or abandon a still-running SQL mutation via a JavaScript timeout race. Pool acquisition
  retains the existing application timeout; this is not a promise of a 750 ms end-to-end latency.
- Enable RLS without client policies and revoke public/anon/authenticated access to the table and
  function. Execute as invoker, never SECURITY DEFINER. Backend migration/runtime grants must be
  reviewed if a non-owner database role is introduced.

## Rollout and recovery

Migration 65 is additive and must precede selecting `postgres` in the environment. Keep migration
64's independent audit release prerequisite. Apply only to disposable local PostgreSQL in this task.
Existing deployed Upstash settings remain unchanged until a separate Preview validation/release.
Switch providers coherently: mixed providers do not share counters, and switching grants a fresh
window. Pause link-preview traffic/drain old deployment traffic for at least 60 seconds during
cutover or rollback; never advertise aggregate enforcement across a mixed-provider rollout.
Rotating `RATE_LIMIT_KEY_SECRET` also creates new opaque bucket identifiers and therefore requires
the same 60-second pause/drain treatment.
Preserve the additive table during application rollback. Down migration discards infrastructure
counters and requires explicit approval; do not drop tables automatically.

## Validation

Require clean canonical migration application, real PostgreSQL concurrent clients, rolling-window
expiry and retained markers, per-user and IP-key separation, bounded cleanup races, secret-free
storage and RLS, SQL timeout rollback, and real authenticated HTTP `429`/headers. Test a fresh limiter
instance against existing persisted counters. Preserve existing Upstash tests and verify its explicit
configuration remains supported. Record exact execution evidence in a task report, not in this ADR.

References: [PostgreSQL locking](https://www.postgresql.org/docs/current/explicit-locking.html),
[database clocks](https://www.postgresql.org/docs/current/functions-datetime.html),
[SKIP LOCKED](https://www.postgresql.org/docs/current/sql-select.html).
