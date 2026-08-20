# Attachment Migration & Storage Recovery Plan

**Created:** 2026-08-21  
**Status:** Active  
**Scope:** Safeguarding `task_attachments` and providing automated recovery for environments affected by legacy migration drift.

---

## 1. Context

In earlier iterations, migration `20260819000048-drop-task-attachments.cjs` was authored to drop the `task_attachments` table. However, per `QA_NATIVE_WORK_HUB_DELIVERY_PLAN.md` and `ADR-001`, persisted evidence and task attachments remain a core requirement of the QA-native Work Hub platform.

## 2. Remediation and Safety Measures

1. **Non-Destructive Migration 48**:
   - `20260819000048-drop-task-attachments.cjs` has been re-architected to be strictly **additive and idempotent**.
   - If executed in an environment where `task_attachments` was previously dropped, migration 48 automatically recreates the complete schema with all required columns, constraints (`fk_task_attachments_workspace_task`), and indexes (`idx_task_attachments_workspace_task`, `idx_task_attachments_task_category`).
   - If executed in an environment where `task_attachments` is already present (e.g. from migrations 29 & 34), it safely performs no-op and preserves all existing records.
   - `down()` in migration 48 is a no-op, preventing any accidental drops upon rollback.

2. **No Data Fabrication**:
   - For environments that previously ran the legacy drop migration, the table structure is restored cleanly.
   - Historical records are not mocked or fabricated; new uploads proceed normally with authenticated, workspace-scoped storage.

3. **Storage Security Model**:
   - Attachments are stored via `StorageService` using either local storage or authenticated Google Drive service-account integration.
   - Credentials and raw storage keys are strictly isolated on the backend. Previews and downloads are streamed through `/v1/workspaces/:workspaceId/tasks/:taskId/attachments/:attachmentId/download` with full Workspace role authorization.
