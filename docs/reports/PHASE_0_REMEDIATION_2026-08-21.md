# Phase 0 Remediation Report — 2026-08-21

## Task

AGY-0.1 repository/database reconciliation and AGY-0.2 policy/contract baseline restoration.

## Outcome

- Migration 48 is now a compatibility no-op and cannot delete attachment data.
- New additive migration 49 repairs the attachment schema even when an environment already recorded the old migration 48.
- Clean migration from 17 through 49 succeeds on a disposable PostgreSQL database; development and test databases are up to date.
- Real PostgreSQL integration coverage proves Mobile and Fullstack task persistence.
- Attachment verification now crosses the real HTTP boundary with authentication, Workspace authorization, persistence, download, deletion, and audit assertions.
- Assigned QA executors cannot skip directly from `todo` to `done`; the full E2E scenario follows `todo -> in_progress -> done`.
- The My Tasks QA desk no longer creates or certifies browser-only test scenarios. Sign-off remains disabled until persisted Test Case/execution evidence is implemented.
- The frontend test runtime is pinned to a Node 20-compatible `jsdom` version.
- Contract, backend, frontend, typecheck, and production build baselines are green.

## Changed files

- `TODO.md` — records verified Phase 0 status and the remaining owner-decision blocker.
- `apps/api/src/db/migrations/20260819000048-drop-task-attachments.cjs` — converts the canceled destructive migration to a compatibility no-op.
- `apps/api/src/db/migrations/20260821000049-recover-task-attachments.cjs` — adds idempotent attachment-schema recovery under a new migration identifier.
- `apps/api/scripts/verifyAttachmentRecovery.cjs` — verifies the missing-table recovery path while restoring the original test table in `finally`.
- `apps/api/scripts/verifyCleanMigrations.cjs` — validates all migrations on a disposable PostgreSQL database and drops only that database afterward.
- `apps/api/package.json` — exposes both database verification commands.
- `apps/api/src/modules/attachments/__tests__/attachmentApiIntegration.test.ts` — verifies attachment behavior through authenticated HTTP routes and PostgreSQL.
- `apps/api/src/modules/tasks/__tests__/taskStateMachine.test.ts` — proves Mobile/Fullstack persistence and rejects QA `todo -> done`.
- `apps/api/src/modules/tasks/__tests__/e2eDemonstration.test.ts` — uses the valid QA execution lifecycle.
- `apps/api/src/policies/taskPolicy.ts` and `apps/api/src/policies/__tests__/taskPolicy.test.ts` — enforce and test the QA transition guard.
- `apps/api/src/http/middleware/rateLimit.ts` — uses the IPv6-safe IP key helper and compatible inferred request type.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — removes browser-only verification scenarios and local sign-off.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — verifies the persisted-evidence empty/disabled state.
- `apps/web/src/components/ui/organisms/__tests__/TaskTimelineView.test.tsx` — isolates the API boundary so the frontend suite does not attempt an unconfigured live request.
- `package.json`, `apps/web/package.json`, and `package-lock.json` — pin `jsdom` 24.1.3 for the repository's Node 20 runtime.
- `docs/plans/ATTACHMENT_RECOVERY_PLAN.md` — documents the actual migration 48/49 recovery behavior and validation.
- `docs/adr/ADR-001-CORE-DOMAIN-AND-COLLABORATION-DECISIONS.md` — corrects the migration-history statement and marks unresolved QA permissions as pending.

## Validation

- `npm run db:verify:attachment-recovery` — passed; recovery schema validated and original test table restored without data loss.
- `npm run db:verify:clean-migrations` — passed; migrations 17–49 applied on a disposable PostgreSQL database.
- `npm run db:migrate:test -- --debug` — passed; test schema already up to date.
- `npm run db:migrate -- --debug` — passed; development schema already up to date.
- Phase 0 targeted policy/task/attachment suite — 20/20 passed against real PostgreSQL and HTTP routes.
- `npm test` in `apps/api` — 161/161 passed across 49 suites.
- `npm test` in `packages/contracts` — 33/33 passed.
- `npm test` in `apps/web` — 171/171 passed across 41 files.
- `npm run typecheck` and `npm run build` in Contracts, API, and Web — passed.
- `npm audit --omit=dev --json` — no High or Critical findings; six Moderate transitive findings remain in the Firebase/Google Storage dependency chain.

## Risks or follow-up

- AGY-0.3 still requires explicit owner decisions. The repository must not start Phase 1 from an unstated permission or coverage assumption.
- Migration 49 restores schema, not attachment rows previously deleted by an already-executed destructive migration. Historical rows require a real database backup.
- QA sign-off is intentionally disabled in My Tasks until persisted Test Case/Test Run evidence and the explicit sign-off record are implemented in later phases.
- The six Moderate production dependency findings should be assessed separately; the advertised automatic fix changes the `firebase-admin` major version and was not applied implicitly.

## TODO update

- `AGY-0.1` → `Done`
- `AGY-0.2` → `Done`
- `AGY-0.3` → `Blocked` pending owner decisions
