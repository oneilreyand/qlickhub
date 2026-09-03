# Agent Report Template

Use this format at the end of every task.

```md
## Task

<TODO item or concise task name>

## Outcome

<What now works or what was decided.>

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

## TODO update

- `<task>` → `Done` | `In progress` | `Blocked`
```

## Example

```md
## Task

Create PostgreSQL and Sequelize connection foundation.

## Outcome

The API now validates its database configuration and exposes a health check that confirms connectivity.

## Changed files

- `apps/api/src/db/sequelize.ts` — creates the Sequelize instance.
- `apps/api/src/http/routes/health.ts` — adds health endpoint.

## Validation

- `npm run test -- health` — passed.
- `npm run build` — passed.

## Risks or follow-up

- Local PostgreSQL credentials are still required in `.env`.

## TODO update

- Configure PostgreSQL, Sequelize connection, migrations, seeders, and health check → In progress
```
