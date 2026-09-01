## Task

PRODUCTION-ROLE-ACCOUNTS: provision an isolated Production validation Workspace and active Owner, PO, Developer, and QA accounts.

## Outcome

The Production Workspace `qlickhub-production-validation` was created for authenticated role validation. It has four active members with the expected `owner`, `po`, `dev`, and `qa` Workspace membership roles. The Developer has the required `frontend` specialty.

Each account completed a real credential login against `https://qlickhub.vercel.app/v1/auth/login` and then read its authenticated Workspace list. Every login and Workspace lookup returned `200`, and both the global user role and Workspace role matched the intended role.

This is real persisted Production data, isolated in its own Workspace. No task, migration, schema, API contract, or authorization policy was changed. Passwords are intentionally absent from this report and all repository files.

## Changed files

- `TODO.md` — records the completed Production role-account provisioning task.
- `docs/reports/PRODUCTION_ROLE_ACCOUNTS_2026-08-28.md` — records the secret-safe provisioning and validation evidence.

## Validation

- Read-only preflight query against Production — zero matching users and zero matching Workspaces before provisioning.
- Secret-safe parameterized Node + PostgreSQL transaction — created four users, one Workspace, four active memberships, and one Developer `frontend` specialty atomically.
- Authenticated Production login and Workspace lookup — Owner, PO, Developer, and QA each returned login `200` and Workspace lookup `200`; returned roles matched the requested roles.
- Read-only Production post-audit — Workspace slug `qlickhub-production-validation`; `active_members=4`; roles `owner,po,dev,qa`; specialties `frontend`; tasks `0`.
- `git diff --check` — passed.

## Risks or follow-up

- Account passwords are shown only once in the task conversation. Store them in an approved password manager and reset them if shared outside the intended testing team.
- The Workspace intentionally contains no tasks. Create only the minimum persisted test data required for the next role-specific workflow validation, then clean it up with an approved retention plan.

## TODO update

- `PRODUCTION-ROLE-ACCOUNTS` → `Done`
