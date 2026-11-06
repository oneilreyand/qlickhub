# Production Data Reset Preserving Identity — 2026-11-06

## Task

`PRODUCTION-DATA-RESET-PRESERVE-IDENTITY-2026-11-06`: clear Production work data while
preserving user accounts, workspaces, membership/access, login sessions, workspace settings,
schema, and migration metadata. Google Drive cleanup remains a blocked portion of the original
request and was excluded from the final database execution.

## Outcome

The explicitly approved Production database transaction committed successfully through the
authenticated Supabase SQL Editor. It cleared **395 backed-up records across 58 tables**.
The post-commit query independently inspected all **67 public application tables** and confirmed
all 58 targets empty. Four users, one Workspace (`essential`), three memberships, one Developer
specialty, 37 login-session records, one QA rollout-settings record, and 80 migration records
remain. Task-creation permissions and device-token tables remain unchanged and empty.

The authenticated Production Task Hub was loaded afresh and displayed `WORKSPACE / ESSENTIAL`,
`Semua Task 0`, `0 Feature`, and `Belum ada folder.` The existing login session could be extended
normally. No replacement user, Workspace, membership, fixture, or sample record was created.

Google Drive files were **not deleted**. The active Production root could not be verified because
Vercel required passkey verification that the user could not complete. A locally configured root
was inspected directly: its four old Workspace folders were empty. That inspection does not
prove the current Production root value. The two database evidence links referenced YouTube;
only their application records were cleared, not the externally hosted videos.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** N/A; a one-time maintenance operation, with no Feature,
  endpoint, shared contract, runtime implementation, or normal deletion-policy change.
- **Baseline:** `eba09a5099480844935ca74ab3e6bf7d00964c96`, existing branch
  `chore/post-p5-tidy`; worktree was clean before this operation. No commit, push, merge,
  deployment, or Production migration was performed.
- **Work Readiness Assessment:** database phase **8/16**, Ready after the backup/recovery split:
  requirement 0, layers 0, destructive data 2, authorization 0, shared contract 0,
  cross-feature impact 2, PostgreSQL/runtime verification 2, external service 2. The original
  combined database/storage request remains Blocked on Drive verification.
- **User plan approval:** the user first approved the all-Workspace scope including files,
  then reported inability to complete Vercel verification. A concrete database-only plan and
  tested private review artifact were presented; the final instruction **`hapus`** authorized
  the database execution while Drive remained deferred.
- **Approval Window / high-risk decisions:** task above; baseline above; scope was the 58
  explicit target tables, preserved tables below, private backup/evidence artifacts, this report,
  and the related `TODO.md` status entry. Allowed sequence: verify backup checksum, execute the
  guarded atomic transaction once against Supabase `qlickhub` / `main PRODUCTION`, verify
  persistence and authenticated UI, and record evidence. No scope expansion or recovery was
  needed. This execution window ends with this report and final response; it does not authorize
  future resets, secret retrieval, Drive deletion, or backup removal.
- **Agent capability and access:** read SSoT, code, local repository, authenticated Supabase
  dashboard, connected Drive metadata, and authenticated Production UI. An isolated local
  PostgreSQL 16 instance was available for canonical migration/recovery rehearsals and has
  been stopped. Existing local direct/runtime Production connection probes failed; the browser
  provided the effective database path. Production is PostgreSQL 17.6. Supabase reported the
  database actor as table owner, with 224 foreign keys and 30 application user triggers.

### AC-to-evidence matrix

| Acceptance Criterion                                                       | Required / achieved evidence | Primary evidence and environment                                                                                                                            | Verification status                                                                             |
| -------------------------------------------------------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Retain recoverable pre-change data                                         | E3 / E3                      | Private CSV parsed as 67 tables / 522 rows; local canonical PostgreSQL restore reproduced 67 exact fingerprints                                             | Accepted with gaps: local PostgreSQL 16 vs Production 17.6; no Production restore was attempted |
| Preserve identity, memberships, permissions, configuration, and migrations | E3 / E3                      | Transaction compared all 9 preserved table fingerprints before/after; separate Production readback matched all 8 non-session tables to backup               | Accepted                                                                                        |
| Clear all scoped database work records                                     | E3 / E3                      | Transaction asserted 58 empty targets; independent post-commit query confirmed 58/58 empty across a 67-table inventory                                      | Accepted                                                                                        |
| Reject changed backup or expanded dependency scope                         | E2–E3 / E3                   | Disposable PostgreSQL rehearsal rejected a mismatched manifest and rolled back; Production guards accepted the current snapshot; `RESTRICT` used throughout | Accepted                                                                                        |
| Keep the existing Workspace usable with empty work data                    | E4 / E4                      | Existing Production session extended; fresh Task Hub navigation showed ESSENTIAL, 0 Feature, no folders                                                     | Accepted                                                                                        |
| Delete owned Production attachment/evidence files                          | E3–E4 / E1                   | Current root verification blocked by unavailable Vercel passkey; no provider mutation performed                                                             | Blocked / deferred by database-only execution scope                                             |

- **Change Impact Map:** Cross-boundary operational data change affecting Planning, Delivery,
  QA Evidence, Release, task discussion/activity, and notifications. Identity/RBAC and Workspace
  configuration remained intact. API/shared contracts, frontend code, dependencies, persisted
  schema, migrations, deployment, and external videos were not changed.
- **Decision Snapshot:** chose explicit `TRUNCATE ... CONTINUE IDENTITY RESTRICT` inside a
  guarded transaction: bounded deletion and atomic rollback, at the cost of brief write blocking
  and permanent clearing after commit. Rejected `clearAllExceptUsers.ts`, which also clears
  workspaces and uses `CASCADE`. Row-by-row deletes would encounter immutable history and
  restrictive/cyclic relations. Doing nothing would preserve all data but miss the requested reset.
- **Handoff and separate verification:** no AI-to-AI handoff or independent-human acceptance
  is claimed. The executor separately re-read all tables after commit through a read-only query
  and loaded the authenticated application afresh. Database evidence is verified; the combined
  request remains Blocked on Drive. Local rehearsal alone was not used as Production proof.

### Quality review

| Dimension                        | Finding and evidence                                                                                                                                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse / DRY                      | Reused all 80 canonical migrations and the established identity/storage model. Existing broad reset script inspected and rejected; no parallel runtime endpoint or permanent reset utility added.                                                                                           |
| Duplicate / overlapping behavior | No product code added; repository changes are one report and one linked status entry. Other historical reset records remain historical and were not overwritten.                                                                                                                            |
| Obsolete / unused code           | No runtime code, export, import, dependency, or configuration was added or removed. No new obsolete runtime path found in the change scope.                                                                                                                                                 |
| Boundary / best practice         | Explicit human action, private backup, verified target, complete table allowlist, exclusive transaction locks, 5-second lock timeout, 25-second statement timeout, UTC fingerprints, drift guards, and `RESTRICT`; no cascading expansion, credential export, deployment, or schema change. |
| Regression evidence              | Exact transaction rehearsal, stale-manifest rollback, full restore, owner-privilege restore, independent Production readback, and fresh authenticated UI. Provider deletion and independent external review remain unverified.                                                              |

Cross-layer responsive/performance/AI-technology gates are N/A: no UI, query implementation,
database design, model selection, or product code changed. The data-preservation relation gate
was covered by live FK inspection and 224 FK checks in the restore rehearsal.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md),
  [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md),
  [Agent Guidelines §2A](../4_AGENT_DEV_GUIDELINES.md),
  [Deployment and Environments](../DEPLOYMENT_AND_ENVIRONMENTS.md).
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `DATA-002`, `QA-002`, `AI-001`,
  `AI-002`, `AI-003`, `AI-005`, `AI-006`, `AI-008`, `AI-009`, `AI-010`, `AI-013`,
  `AI-014`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** all 58 scoped work-data tables emptied; no interface change.
  The one-time explicit maintenance instruction does not create a normal mutable-history policy.
- **Authorization impact:** Workspace memberships, roles, specialties, permission grants,
  login sessions, devices, and account data preserved; no new capability granted.
- **Migration risk:** no Production schema/migration operation; `SequelizeMeta` remained 80
  exact records, latest `20261105000096-add-notification-bug-id.cjs`.

Preserved tables: `users`, `workspaces`, `workspace_members`, `workspace_member_specialties`,
`task_creation_permissions`, `qa_assurance_rollout_settings`, `auth_sessions`, `user_fcm_tokens`,
and `SequelizeMeta`. All other tables in the 67-table application inventory were explicit targets.

## Changed files

- This report — scope, primary observations, backup/recovery evidence, and remaining gap.
- [`TODO.md`](../../TODO.md) — database portion verified; Drive portion Blocked under the same task.

Operational SQL, manifests, private backup, and local verification scripts reside outside Git in
`/private/tmp/qlickhub-reset-20261106-srhndo6h`. No row payload, `.env` value, connection string,
password, token, key, or service-account material was copied into repository documentation.

## Validation

### Backup and disposable PostgreSQL

- Supabase read-only XML-row backup exported to CSV; downloaded CSV independently parsed:
  **67 tables, 522 rows**, 369,779 bytes. File mode 600; containing directory mode 700.
  SHA-256 rechecked immediately before execution:
  `0461513f41376637e16f72b55f9f1359e452cb4b6670a0c24f16260d6c954baf`.
- Isolated PostgreSQL 16 initialization and canonical
  `sequelize-cli db:migrate --env test`: **80/80 migrations applied**, exit 0.
- `node /private/tmp/qlickhub-reset-20261106-srhndo6h/verify-recovery.cjs`:
  **67 exact table fingerprints / 522 rows, 224 FK checks**, exit 0, 0 skipped.
  An earlier catalog `name[]` decoding error was fixed by selecting `text[]`; no test was skipped.
- `node /private/tmp/qlickhub-reset-20261106-srhndo6h/verify-reset.cjs`:
  **58 cleared-table and 9 preserved-table assertions**, mismatched-manifest rollback passed,
  exit 0, 0 skipped.
- `node /private/tmp/qlickhub-reset-20261106-srhndo6h/verify-owner-recovery.cjs`:
  **67 fingerprints, 224 FKs, 30 trigger settings**, original constraint definitions restored,
  exit 0, 0 skipped, using a non-superuser table owner without replication-role privilege.
  An earlier session-timezone comparison mismatch was corrected by explicitly using UTC.
- Local recovery temporarily deferred FK enforcement and suspended only application user
  triggers on cleared tables, then validated FKs and restored original settings in the isolated
  database. This recovery procedure was not executed against Production.
- `/opt/homebrew/opt/postgresql@16/bin/pg_ctl -D /private/tmp/qlickhub-reset-20261106-srhndo6h/postgres stop -m fast`:
  exit 0; isolated test server stopped and backup retained.

### Production operation and readback

- Authenticated SQL Editor target: Supabase `qlickhub`, `main PRODUCTION`; distinct Preview
  project was not touched. The pasted 16,242-character SQL exactly matched the reviewed text.
- `reset-reviewed.sql` SHA-256:
  `e57998a23d8d2757132da9c7f106b2b68fc0e3e2fe757e3dcb2a193999fb047d`.
  One execution, after the user's `hapus` instruction and the provider's destructive-query warning.
- Primary transaction result: `reset_verified`, **58 cleared tables, 9 preserved tables,
  4 users, 1 Workspace, 3 memberships, 0 tasks, 80 applied migrations**.
- Independent read-only post-commit count/fingerprint query: **67/67 tables read**, **58/58
  targets empty**, and **8/8 non-session preserved table fingerprints** equal the backup.
  All 9 preserved tables were already compared before/after inside the successful transaction.
  Auth-session fingerprint differed from the older backup while its 37 records remained; sessions
  can update normally, so the backup fingerprint is not claimed as an invariant for that table.
- Production UI: existing idle-session extension succeeded; fresh navigation to
  `https://qlickhub.vercel.app/work?tab=tasks` showed Workspace ESSENTIAL, 0 Feature, no folders,
  and the empty Task Hub state. No source-code change or production-data fixture was used.
- `npm run docs:check`: **12/12 passed**, 0 failed, 0 skipped; documentation governance passed,
  exit 0.
- `npm run docs:completeness`: exit 0; **85 existing baseline gaps** (DS-R01=75, DS-R03=10),
  **0 new gaps**. These pre-existing gaps were not changed by the reset evidence.
- `git diff --check`: passed, exit 0. No runtime build/test rerun was needed for the two
  documentation-only repository changes; operational PostgreSQL checks are listed above.

### Failed or blocked preparation

- Existing local direct/runtime database probes: `ENOTFOUND`; an official pooler probe timed out.
  No mutation was made through those paths.
- Bulk `vercel env pull`: automatic approval review rejected exporting all Production values
  because that would copy database and Google service-account credentials. The command did not
  execute; no alternative channel was used to obtain those secrets.
- Vercel reveal of the non-secret Drive-root identifier requested passkey verification. The
  user could not complete it; the verification was canceled and Drive changes were deferred.
- Connector Drive search returned no folders, but direct root fetch found four empty folders.
  Direct folder reads, not empty search results, informed the qualified storage observation.
- Browser download-event tracking timed out, but the actual downloaded CSV was located,
  moved into private storage, and fully parsed and verified before execution.
- An editor text-replacement attempt produced a read-only SQL syntax error during preparation.
  Replacing the full editor selection corrected it; successful preflight confirmed table ownership
  and 224 FK / 30 trigger counts before any deletion.

## Risks or follow-up

- Retain the private backup. No backup deletion is authorized; temporary-directory retention is
  subject to the host's cleanup policy. No claim of managed durable off-host backup is made.
- Production Google Drive cleanup remains blocked on verified current-root access; no folder,
  file, external video, or service credential was changed.
- A separate independent-human verification was not performed. Recorded database and UI
  evidence support the executed database outcome, not completion of the deferred storage portion.
- Repository evidence is local until reviewed and committed; no PR/merge is claimed.

## Human decision summary

Database work data is now cleared and independently read back as empty. The existing accounts,
Workspace, memberships, roles, settings, and login access remain usable. The private backup is
retained and its recovery was rehearsed. Drive cleanup is the sole deferred scope and requires
verified storage access before any provider deletion.

## TODO update

`PRODUCTION-DATA-RESET-PRESERVE-IDENTITY-2026-11-06` → **Blocked** overall: database portion
verified, Google Drive portion deferred. No unrelated historical reset item is marked complete.
