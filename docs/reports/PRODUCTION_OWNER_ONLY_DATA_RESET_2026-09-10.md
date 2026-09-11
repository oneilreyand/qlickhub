# Agent Report — Production Owner-Only Data Reset 2026-09-10

## Task

Delete all Qlick Hub Production database data except the persisted Owner user account.

## Outcome

The explicitly targeted Production PostgreSQL database was reset transactionally. Exactly one
active Owner user remains. Three non-Owner users and all 97 rows across the 41 non-user application
tables were deleted. The 50 canonical migration records were retained. External attachment storage
was not changed because the request was limited to database data.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md` §§5–6,
  `docs/4_AGENT_DEV_GUIDELINES.md` §3, and `docs/DEPLOYMENT_AND_ENVIRONMENTS.md` §§4, 6, and 8.
- **Policy IDs:** `AUTH-001`, `DATA-001`, `DATA-002`, `DATA-003`, `AI-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Production Workspaces, memberships, folders, Tasks, Requirements,
  activities, comments, notifications, sessions, security events, and all other non-user application
  records were deleted. Three non-Owner user records were deleted. No API contract changed.
- **Authorization impact:** The action was performed only after the user's explicit Production data
  deletion instruction. All persisted sessions were removed; the retained Owner must authenticate
  again.
- **Migration risk:** No schema migration was run or changed. All 50 migration-history rows remain.
  A current, validated pre-reset backup is retained in a private temporary location for recovery.

## Changed files

- `docs/reports/PRODUCTION_OWNER_ONLY_DATA_RESET_2026-09-10.md` — sanitized execution evidence.
- `TODO.md` — completed operational task and evidence link.

## Validation

- Pre-reset read-only audit against the explicit Production database alias — PostgreSQL 17,
  50 migrations, 43 base tables, four users including exactly one active Owner, and 97 rows across
  14 populated non-user tables.
- PostgreSQL 17.11 custom-format backup — passed `pg_restore --list`; mode `600`, 416,977 bytes,
  753 catalog entries, and SHA-256
  `2f461b93131b8304d010f8313625e0972559350deb2ab8649b05ab8f68176267`.
- Transactional reset under a dedicated advisory lock — committed; 41 non-user application tables
  truncated and three non-Owner users deleted. Preconditions required exactly one active Owner,
  exactly 50 migrations, and exactly 41 target application tables.
- Independent post-commit read-only audit — one user, one active Owner, zero non-Owner users,
  zero rows in all 41 application tables, zero nonempty application tables, and 50 migrations.
- Production `GET /v1/health` — HTTP 200 with `database.status=connected`.
- External attachment storage — not contacted or modified.

## Risks or follow-up

- The private pre-reset backup remains the recovery path and contains sensitive Production data.
  Do not delete it unless loss of this recovery path is explicitly accepted.
- Google Drive attachment objects were intentionally left unchanged and may now be orphaned from
  database records. Removing them requires a separate explicit storage-cleanup request and target
  audit.

## TODO update

- `PRODUCTION-OWNER-ONLY-DATA-RESET-2026-09-10` → `Done`
