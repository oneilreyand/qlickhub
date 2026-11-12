# TASK-READ-ACCESS — Authorization Matrix

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, AUTH-013

Aturan kanonikal: [Architecture §5](../../1_ARCHITECTURE.md#akses-baca-data-task) dan
[ADR-043](../../adr/ADR-043-TASK-SCOPED-READ-ACCESS.md).

| Baca task-scoped (Phase 1)                                                      | Owner/Admin/PO | Dev/QA dengan akses task | Dev/QA tanpa akses task |
| ------------------------------------------------------------------------------- | -------------- | ------------------------ | ----------------------- |
| links, product-brief, documents, activity, acceptance-checks, attachments (GET) | 200            | 200                      | 403                     |
| comments (GET)                                                                  | 200            | 200                      | 200 (pengecualian)      |

"Akses task" = ditugaskan pada task, pelapor task, atau memegang Subtask di Feature yang sama.
Non-anggota Workspace tetap ditolak `requireWorkspaceMember`. Mutasi tidak berubah.
