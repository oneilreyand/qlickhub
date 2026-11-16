# TASK-READ-ACCESS — Authorization Matrix

**Applicable Policy IDs:** DOC-005, AUTH-001, AUTH-002, AUTH-013

Aturan kanonikal: [Architecture §5](../../1_ARCHITECTURE.md#akses-baca-data-task) dan
[ADR-043](../../adr/ADR-043-TASK-SCOPED-READ-ACCESS.md).

| Baca task-scoped (Phase 1)                                                      | Owner/Admin/PO | Dev/QA dengan akses task | Dev/QA tanpa akses task |
| ------------------------------------------------------------------------------- | -------------- | ------------------------ | ----------------------- |
| links, product-brief, documents, activity, acceptance-checks, attachments (GET) | 200            | 200                      | 403                     |
| comments (GET), sejak keputusan Owner 2026-11-16                                | 200            | 200                      | 403                     |

| Baca task-scoped (Phase 2)                                                                                                | Owner/Admin/PO | Dev/QA dengan akses task | Dev/QA tanpa akses task |
| ------------------------------------------------------------------------------------------------------------------------- | -------------- | ------------------------ | ----------------------- |
| requirements, delivery-trace, test-executions, release-records, readiness, readiness/findings, handoffs (GET)             | 200            | 200                      | 403                     |
| qa-workflow-summary (GET, role QA; tetap hanya QA yang ditugaskan pada Subtask QA), developer-readiness (GET, Subtask QA) | sesuai aturan  | 200                      | 403                     |

"Akses task" = ditugaskan pada task, pelapor task, atau memegang Subtask di Feature yang sama.
Non-anggota Workspace tetap ditolak `requireWorkspaceMember`. Mutasi tidak berubah.
