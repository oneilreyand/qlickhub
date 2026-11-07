# SUBTASK-SCHEDULE-WITHIN-FEATURE — Authorization Matrix

**Status:** Disetujui
**Disetujui oleh:** Owner, 2026-11-07 (`ok`, G0–G3 dan K1/L1/L2)

**Applicable Policy IDs:** AUTH-002, DOMAIN-002, DOC-005

| Action                                 | Owner/Admin                       | PO                                | Developer                           | QA                                  | Enforcement / bukti                                                      |
| -------------------------------------- | --------------------------------- | --------------------------------- | ----------------------------------- | ----------------------------------- | ------------------------------------------------------------------------ |
| Baca root/child dalam Workspace        | Ya sebagai member                 | Ya sebagai member                 | Ya sebagai member                   | Ya sebagai member                   | authenticate, requireWorkspaceMember, assertCanAccessTask; E3            |
| Create child dan edit tanggal planning | Ya                                | Ya                                | Tidak                               | Tidak                               | assertCanCreateTask/assertCanMutateTask; 200/201 vs 403 E3               |
| Baca detail konflik                    | Setelah lolos mutation permission | Setelah lolos mutation permission | Tidak dari percobaan edit terlarang | Tidak dari percobaan edit terlarang | Permission sebelum range validation; tidak bocor judul/tanggal           |
| Ubah status/reopen                     | Policy existing                   | Policy existing                   | Policy existing                     | Policy existing                     | Jangan membuat bypass; L2 menambahkan range guard sesuai keputusan Owner |
| Akses lintas Workspace/nonmember       | Ditolak tanpa membership target   | Ditolak                           | Ditolak                             | Ditolak                             | 403/404 existing, isolasi parent/child, E3                               |

Sumber: [taskPolicy.ts](../../../apps/api/src/policies/taskPolicy.ts),
[taskRoutes.ts](../../../apps/api/src/modules/tasks/taskRoutes.ts),
[Workflow §4](../../2_WORKFLOW_AND_ROLES.md#aturan-transisi-subtask).
Planner tidak otomatis boleh mengubah status QA Subtask; aturan executor/reviewer tetap berlaku.
Kartu ini tidak memberikan izin baru dan perubahan file policy tidak direncanakan.
