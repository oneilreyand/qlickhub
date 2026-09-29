# Agent Report Template

Use this format at the end of every task.

```md
## Task

<TODO item or concise task name>

## Outcome

<What now works or what was decided.>

## Work assurance

- **Work Readiness Assessment:** <score /16, `Ready` | `Ready after split` | `Blocked`, and reason>
- **User plan approval:** <approved scope/approach, decision date or message reference; or N/A for read-only work>
- **Step approval log:** <for every state-changing step: proposed bounded action, explicit user approval reference, outcome evidence; or N/A for read-only work>
- **Agent capability and access:** <what the executor/verifier could and could not inspect or run>
- **AC-to-evidence matrix:**

| Acceptance Criterion | Required / achieved evidence level (E0–E4) | Primary evidence and environment      | Verification status                                  |
| -------------------- | ------------------------------------------ | ------------------------------------- | ---------------------------------------------------- |
| <AC>                 | <E# / E#>                                  | <command, record, or UAT observation> | <Accepted / Accepted with gaps / Rejected / Blocked> |

- **Evidence outcomes:** <for each executed check, record success/failure/blocked, AC impacted, output or reproduction, environment, and fix/re-plan/Bug/Blocked follow-up>
- **Change Impact Map:** <Function | Module | Feature | Cross-boundary; affected consumers, contract, data, authorization, UI, release, operations, and documentation, or N/A with reason>
- **Decision Snapshot:** <options, pro/con, chosen approach, compatibility, rollout/rollback, or N/A with reason>
- **Agent handoff and independent verification:** <baseline, executor, verifier/CI, primary evidence rechecked, final verification result, and any gaps>
- **Quality review:** <scope and method; reuse/DRY, duplicate/overlap, obsolete/unused code, boundary/best-practice, and regression-evidence findings; each marked resolved, follow-up, blocked, or evidence-backed none found>
- **Cross-layer quality gates:** <responsive phone/tablet/desktop evidence and Atomic decomposition review when UI changes; relation/index/N+1/query-plan evidence when data access changes; FE/BE performance measurement; AI technology/model decision snapshot when applicable; or N/A with reason>

## Source of truth and impact

- **Applicable SSoT:** <links or N/A with reason>
- **Policy IDs:** <IDs from docs/POLICY_REGISTRY.md or N/A with reason>
- **Data/interface impact:** <describe or None>
- **Authorization impact:** <describe or None>
- **Migration risk:** <describe or None>

## Changed files

- `<path>` — <purpose>

## Validation

- `<command or check>` — <pass/fail result>
- Include exact pass/fail counts, skipped tests, warnings, environment, and known gaps.

## Risks or follow-up

- <Known limitation, blocker, migration step, or `None`>

## Human decision summary

<Trusted outcome, AC/evidence gaps, material trade-offs and affected areas, plus any decision that still requires human authority.>

## TODO update

- `<task>` → `Done` | `In progress` | `Blocked`
```

## Example

```md
## Task

Create PostgreSQL and Sequelize connection foundation.

## Outcome

The API now validates its database configuration and exposes a health check that confirms connectivity.

## Work assurance

- **Work Readiness Assessment:** 3/16, `Ready`; the task is a local backend change with a focused integration check.
- **Agent capability and access:** Executor and verifier can inspect the API, run the focused test, and reach the disposable PostgreSQL test database.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                          | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                  | Verification status |
| ------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------- | ------------------- |
| Health endpoint reports an authenticated database connection. | E3 / E3                                    | PostgreSQL integration test performs a read through the endpoint. | Accepted            |

- **Change Impact Map:** Function change; API route and database configuration service are affected. No frontend, authorization, migration, or release impact.
- **Decision Snapshot:** N/A; no material alternative or policy change.
- **Agent handoff and independent verification:** Baseline `abc123`; CI reran the focused integration test and covers the AC.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` for persistence/security and
  `docs/4_AGENT_DEV_GUIDELINES.md` for PostgreSQL evidence requirements.
- **Policy IDs:** `DATA-001`, `DATA-002`, `TEST-001`.
- **Data/interface impact:** Adds database-configuration validation and a health response; no
  application domain schema change.
- **Authorization impact:** None; the health endpoint does not grant access to protected data.
- **Migration risk:** None; no migration is introduced.

## Changed files

- `apps/api/src/db/sequelize.ts` — creates the Sequelize instance.
- `apps/api/src/http/routes/health.ts` — adds health endpoint.

## Validation

- `npm run test -- health` — passed, 1/1 test, 0 failed, 0 skipped, against disposable PostgreSQL.
- `npm run build` — passed, 0 build errors; no warnings requiring follow-up.

## Risks or follow-up

- Local PostgreSQL credentials are still required in `.env`.

## Human decision summary

The health endpoint is verified against PostgreSQL. No outstanding decision is required.

## TODO update

- Configure PostgreSQL, Sequelize connection, migrations, seeders, and health check → In progress
```
