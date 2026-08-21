# Attachment Migration & Storage Recovery Plan

**Created:** 2026-08-21  
**Status:** Active  
**Scope:** Safeguarding `task_attachments` and providing automated recovery for environments affected by legacy migration drift.

---

## 1. Context

In earlier iterations, migration `20260819000048-drop-task-attachments.cjs` was authored to drop the `task_attachments` table. However, per `QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` and `ADR-001`, persisted evidence and task attachments remain a core requirement of the QA-native Work Hub platform.

## 2. Remediation and Safety Measures

1. **Canceled Migration 48 Is a True No-op**:
   - `20260819000048-drop-task-attachments.cjs` remains in the migration sequence only so clean environments and environments that have already recorded its identifier stay compatible.
   - Both `up()` and `down()` are no-ops. It never drops, recreates, or mutates attachment records.
   - Rewriting migration 48 alone cannot repair an environment where its old destructive form is already present in `SequelizeMeta`, because Sequelize will not execute the same identifier twice.

2. **Recovery Uses a New Additive Migration**:
   - `20260821000049-recover-task-attachments.cjs` is the canonical repair and therefore runs in environments that already recorded migration 48.
   - If `task_attachments` is missing, migration 49 recreates the complete schema, composite Workspace/Task foreign key, and required indexes.
   - If the table exists, migration 49 adds only missing columns, constraints, or indexes and preserves existing rows.
   - `down()` is intentionally a no-op; rollback must not delete evidence.

3. **No Data Fabrication**:
   - A previously dropped table can be structurally restored, but deleted historical rows cannot be invented. They must be recovered from a real backup if available.
   - No mock attachment or fabricated evidence is inserted by the migration or verification scripts.

4. **Storage Security Model**:
   - Attachments are stored via `StorageService` using either local storage or authenticated Google Drive service-account integration.
   - Credentials and raw storage keys are strictly isolated on the backend. Previews and downloads are streamed through `/v1/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId/download` with full Workspace role authorization.

## 3. Verification

- `npm run db:verify:attachment-recovery` temporarily renames the empty attachment table in the test database, runs migration 49 against the missing-table state, validates columns/constraints/indexes, and restores the original table in `finally`.
- `npm run db:verify:clean-migrations` creates a disposable PostgreSQL database, runs every migration from 17 through 49, validates attachment and delivery-area schema, then drops only that disposable database.
- `npm run db:migrate:test -- --debug` and `npm run db:migrate -- --debug` must both report the expected migration state before release.
