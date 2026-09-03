## Task

SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT: plan consistent link-preview rate limiting across Vercel serverless instances.

## Outcome

The current per-process limitation and Production topology were confirmed. ADR-003 records the evaluated options and selects single-region Upstash Redis REST while preserving the existing authenticated 30 requests/minute contract. On 2026-09-03 the owner approved the provider/cost direction and local-memory fallback during transient provider failure. No Production resource, credential, or deployment has been created by this decision update.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, and `docs/DEPLOYMENT_AND_ENVIRONMENTS.md`.
- **Policy IDs:** `SEC-001`, `AUTH-002`, `DATA-001`, `TEST-001`, `DOC-002`.
- **Data/interface impact:** None at this decision stage. The proposal uses short-lived opaque Redis counters and preserves the existing HTTP contract.
- **Authorization impact:** None; authenticated identity remains the primary limiter key.
- **Migration risk:** No PostgreSQL migration proposed; Production would require a new external datastore and backend-only credentials after approval.

## Changed files

- `docs/adr/ADR-003-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT.md` — records facts, alternatives, proposed decision, risks, likely files, and required evidence.
- `TODO.md` — records the blocked implementation decision.
- `docs/reports/SEC_02_DISTRIBUTED_RATE_LIMIT_DECISION_2026-09-03.md` — records this planning outcome.

## Validation

- Inspected the active limiter: it uses the default process-local `express-rate-limit` memory store and keys link preview by authenticated user with IP fallback.
- Inspected Production topology: Vercel serverless with Supabase Transaction Pooler and `DATABASE_POOL_MAX=1`.
- Inspected environment schema/templates and API dependencies: no Redis provider or credentials are currently defined.
- Compared official Vercel WAF, Vercel Marketplace storage, and Upstash serverless rate-limit documentation; references are linked from ADR-003.
- `npm run docs:check` — **5 passed, 0 failed, 0 skipped**; documentation governance passed.
- Targeted Prettier and `git diff --check` — passed.

## Risks or follow-up

- Upstash introduces an external service, credentials, and possible usage-based cost; this direction is now owner-approved, but provisioning remains a separate external mutation.
- The owner-approved local fallback favors availability but temporarily weakens global enforcement during provider failure. The implementation must expose only a sanitized warning and must not claim healthy distributed enforcement while degraded.

## TODO update

- `SEC-02-DISTRIBUTED-LINK-PREVIEW-RATE-LIMIT` → `In progress` after owner approval of ADR-003; implementation and verification remain.
