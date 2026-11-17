# LEADER-PIPELINE-HUB — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-005

## Data and relations

Tidak ada tabel baru. Membaca `tasks`, `task_activities`, `task_blockers`, requirement/AC, baseline
kesiapan, `qa_sign_offs`, `release_decisions`, `bugs`, kalender/kapasitas. Pemetaan tahap ditetapkan di P1
dan ditulis di dokumen ini sebelum UI dibuat; tahap tanpa data ditampilkan "belum dilacak" (`DATA-005`).

## API and executable contract

Contract: `packages/contracts/src/leaderPipeline.ts` (file terpisah dari `leader.ts` agar tidak bentrok
dengan pekerjaan LEADER-SDLC-HUB). Endpoint P1: `GET /v1/leader/pipeline` dengan query opsional
`workspaceIds=<uuid,uuid>`; P4: `POST /v1/workspaces/:workspaceId/tasks/:taskId/blockers/:blockerId/ping`.
View-model UI di `organisms/leaderHub/types.ts` dipetakan dari contract.

### Pemetaan tahap (P1)

| Tahap                   | Aktif bila                                                                                          | Umur dihitung dari                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Plan / PRD / Task       | Status Feature Spec `plan` / `prd` / `task`; Feature lama tanpa Spec: `plan` bila belum ada Subtask | Plan: Feature dibuat; PRD/Task: perubahan Spec terakhir |
| Task (lanjutan)         | Spec `applied` tetapi belum ada Subtask Development                                                 | perubahan Spec terakhir                                 |
| Dev                     | Ada Subtask Development `todo` / `in_progress` / `changes_requested`                                | Subtask terbuka paling awal dibuat                      |
| Review                  | Semua Subtask Development terbuka berstatus `in_review`                                             | perubahan terakhir Subtask `in_review`                  |
| QA                      | Semua Subtask Development selesai, belum ada QA sign-off disetujui yang tidak dibatalkan            | Subtask Development terakhir selesai                    |
| Rilis                   | Ada sign-off disetujui, belum ada keputusan rilis disetujui yang tidak dibatalkan                   | sign-off                                                |
| Verif. Prod, Monitoring | Belum dilacak (`untracked`), tidak pernah `done` (`DATA-005`); diisi di P7                          | —                                                       |

Feature yang termasuk: Feature (task induk) di Workspace yang dipimpin dan tidak diarsipkan, status
bukan `canceled`, dan bukan `done` kecuali punya keputusan rilis disetujui dalam 14 hari terakhir.
Ambang hari per tahap: `LEADER_STAGE_HELD_THRESHOLD_DAYS` di contract.

## Boundary notes

Terdampak: modul `leader`, `tasks` (ping), `realtime` (konsumsi), `LeaderHubPage`. Tidak terdampak:
tab Aktivitas periode (LEADER-SDLC-HUB), alur status task.
