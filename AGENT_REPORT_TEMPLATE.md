# Agent Report Template

Use this format at the end of every task.

```md
## Task

<TODO item or concise task name>

## Outcome

<What now works or what was decided.>

## Changed files

- `<path>` — <purpose>

## Validation

- `<command or check>` — <pass/fail result>

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

