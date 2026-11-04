# DEADLINE-REMINDER-CRON — Owner / Admin Path

**Applicable Policy IDs:** AUTH-012, DOC-005

## Inputs and preconditions

- Owner can set Vercel Production environment variables and run SQL in the Supabase Production project.
- `CRON_SECRET` (≥ 32 random characters) exists only in Vercel and Supabase Vault.

## Permitted actions and decisions

- Before merge: set `CRON_SECRET` in Vercel Production. After deploy: enable `pg_cron`/`pg_net`, store the URL and secret in Vault, schedule the job, and run it once manually ([runbook](../../../DEPLOYMENT_AND_ENVIRONMENTS.md)).
- Workspace Owner/Admin may still run `POST /v1/notifications/check-deadlines?workspaceId=` for their own Workspace. Rules: [authorization.md](../authorization.md); this document does not grant permission.
- Rotate the secret in Vercel and Vault together; disable with `cron.unschedule`.

## Outputs and handoff

- `net._http_response.status_code = 200` and the API log event `cron.deadline_reminders` recorded in [release.md](../release.md) (AC-8).
