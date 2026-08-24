## Task

ATT-8.1 — Protect immutable evidence attachment deletion.

## Outcome

Formal `qa_evidence` and attachments linked to an immutable Test Result now return HTTP 409 `IMMUTABLE_EVIDENCE` for every Workspace role. Ordinary attachments remain deletable by Owner/Admin/PO or their original uploader. The database transaction now locks and validates the attachment, persists deletion metadata and Activity, and commits before external storage cleanup begins, so a database rejection can no longer remove the physical evidence first. The success response includes `storageCleanupPending` when an external provider still needs cleanup.

## Changed files

- `apps/api/src/policies/attachmentPolicy.ts` — enforces immutable evidence before role-based ordinary attachment deletion.
- `apps/api/src/modules/attachments/attachmentService.ts` — locks and validates persisted evidence, commits database deletion before storage cleanup, and reports pending cleanup.
- `apps/api/src/modules/attachments/attachmentController.ts` — returns HTTP 409 Problem Details and the storage cleanup result.
- `apps/api/src/policies/__tests__/attachmentPolicy.test.ts` — covers all planner, uploader, non-uploader, category, and linked-evidence policy branches.
- `apps/api/src/modules/attachments/__tests__/attachmentApiIntegration.test.ts` — proves role boundaries and immutable file preservation through authenticated HTTP and PostgreSQL.
- `TODO.md` and `docs/archive/TODO_COMPLETED_2026-08-24.md` — claim and archive the completed item.

## Validation

- `npm --prefix apps/api run typecheck` — passed.
- `npm --prefix apps/api run build` — passed.
- `NODE_ENV=test node --test apps/api/dist/policies/__tests__/attachmentPolicy.test.js` — passed 3/3, 0 skipped.
- `pg_isready -h localhost -p 5432 -d qa_management_test` — no response; the default local test database was unavailable.
- Initial sandboxed disposable PostgreSQL startup — failed because shared memory was restricted; rerun in the approved local environment succeeded.
- `TEST_DATABASE_URL=postgres://mac@127.0.0.1:55432/qa_management_test NODE_ENV=test npm --prefix apps/api run db:migrate:test` — passed all canonical migrations 17–54 on a clean disposable PostgreSQL database.
- First targeted HTTP run — cancelled because inherited `DATABASE_SSL=true` attempted SSL against disposable PostgreSQL; rerun with `DATABASE_SSL=false` passed.
- `DATABASE_SSL=false TEST_DATABASE_URL=postgres://mac@127.0.0.1:55432/qa_management_test NODE_ENV=test node --test apps/api/dist/modules/attachments/__tests__/attachmentApiIntegration.test.js` — passed 7/7, 0 skipped.
- `DATABASE_SSL=false TEST_DATABASE_URL=postgres://mac@127.0.0.1:55432/qa_management_test NODE_ENV=test npm --prefix apps/api test` — passed 213/213 in 61 suites, 0 skipped.
- `git diff --check -- <ATT-8.1 files>` — passed.
- Disposable PostgreSQL was stopped and its temporary directory removed after validation.

## Risks or follow-up

- A failed Google Drive cleanup now preserves database integrity and returns `storageCleanupPending: true`, but automatic background retry is not part of ATT-8.1. A durable storage-cleanup outbox remains a separate operational-hardening task.
- The frontend attachment API helper is not currently connected to a product surface, so no frontend behavior changed.

## TODO update

- ATT-8.1 — Protect immutable evidence attachment deletion → `Done` and archived.
