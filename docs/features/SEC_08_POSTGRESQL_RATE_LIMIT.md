# SEC-08 PostgreSQL Link-Preview Rate Limit

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-04
**Applicable Policy IDs:** `SEC-001`, `AUTH-002`, `DATA-002`, `TEST-001`, `DOC-002`, `DOC-004`

## 1. Tujuan dan Pengguna

Use existing PostgreSQL infrastructure for cross-instance link-preview rate limiting without a
mandatory Redis subscription. This is not a guarantee of free database usage. No frontend change,
general/login limiter change, Production mutation, or deployment is part of this implementation.

## 2. Requirement dan Acceptance Criteria

- SEC-08-R1: independent connections/instances share at most 30 accepted requests in a rolling 60 seconds.
- SEC-08-R2: request 31 receives the unchanged `429 RATE_LIMITED` and standard retry/rate headers.
- SEC-08-R3: only HMAC identifiers/timestamps/expiry persist; database clocks govern expiry, and
  unexpired markers remain across limiter instance recreation and fixed-minute boundaries.
- SEC-08-R4: bounded cleanup skips locked rows and preserves active counters; client database roles
  have no table/function access, with RLS enabled and no client policies.
- SEC-08-R5: database errors/timeouts roll back before the existing sanitized local fallback runs.
- SEC-08-R6: Production/Preview default to PostgreSQL and require a database URL/identifier secret;
  explicit Upstash remains compatible, and memory cannot be selected in deployed environments.

## 3. Alur Lintas Peran

All authenticated roles consume the same per-user limit after backend authentication. Operators
apply migrations/select environment provider; clients cannot set counters or bypass authorization.

## 4. Data dan Relasi

Migration 65 adds `link_preview_rate_limit_buckets` and an invoker-only consumption function.
Infrastructure counters have no user/Workspace foreign key and are not domain audit history.
The additive table is bounded per key; cleanup follows [Architecture §5](../1_ARCHITECTURE.md#perlindungan-link-preview-terdistribusi).

## 5. API dan Shared Contract

`GET /v1/meta/link-preview` remains authenticated with unchanged success/SSRF/error handling.
No new client endpoint or shared DTO. Counter storage is internal to the existing limiter adapter.

## 6. Authorization

`AUTH-002` and `SEC-001` apply. Backend policy/authentication is unchanged; RLS and grants prevent
exposing infrastructure counters through Supabase public clients. HMAC secret remains backend-only.

## 7. UI dan Interaction States

No UI changes. Existing request error handling consumes the same 429 contract.

## 8. Pengujian dan Evidence

Real PostgreSQL integration covers concurrency, state across instances, window pruning, cleanup,
RLS/access, timeout rollback, real authenticated HTTP, and absence of raw identities in persisted
keys. Configuration/legacy provider tests, full API suite, build, docs, and clean migrations are
required. Results are recorded in the SEC-08 report only after execution.

## 9. Release dan Readiness

Apply migration 65 before selecting `postgres`; pending migration 64 remains independent.
Preview validation, Production recovery, runtime health and scoped smoke remain release gates.
Provider cutover and rollback follow the PostgreSQL decision linked from
[the deployment guide](../DEPLOYMENT_AND_ENVIRONMENTS.md).
Do not run the counter-table down migration or change cloud configuration in this task.

## 10. Traceability

Owner PostgreSQL choice → PostgreSQL decision / SEC-001 → SEC-08-R1..R6 → migration 65 / PostgreSQL adapter /
configuration / real PostgreSQL tests → SEC-08 report → separately approved release validation.
