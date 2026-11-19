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

### Beban tim (P3)

`GET /v1/leader/pipeline` mengembalikan `teamLoad` (`LeaderTeamLoadSchema`): `weekFrom`/`weekTo`, `areas`
(persen gabungan per spesialisasi), `members` (persen per anggota dari semua Workspace aktifnya,
kapasitas mingguan, jumlah Subtask tanpa effort). Hanya angka; judul kerjaan dari Workspace lain tidak dikirim.

### Ping PIC (P4)

`POST /v1/workspaces/:workspaceId/tasks/:taskId/blockers/:blockerId/ping`, hanya Owner/Admin Workspace itu.
Tanpa body; respons `{ data: { blockerId, pingedAt, nextPingAvailableAt } }` (`TaskBlockerPingResultSchema`
di `blocker.ts`). Setiap ping mencatat aktivitas `subtask.blocker_pinged` / `task.blocker_pinged`
(`metadata_json.blockerId`) dan satu notifikasi `blocker` ke PIC lewat outbox. Batas
`BLOCKER_PING_COOLDOWN_MINUTES` = 60 per hambatan (bukan per leader), dihitung dari aktivitas terakhir;
lebih cepat → 429 dengan jam berikutnya. Hambatan tertutup → 409; leader yang juga PIC → 400; id tidak
dikenal → 404. Tanpa migrasi. `GET /v1/leader/pipeline` menambah `lastPingedAt` dan `nextPingAvailableAt`
(null bila boleh ping sekarang) pada setiap `openBlockers`.

### Pembaruan langsung (P5)

`GET /v1/leader/stream` (SSE, Owner/Admin minimal satu Workspace aktif; selain itu 403) berlangganan semua
Workspace yang dipimpin dalam satu koneksi. Event: `leader:ready` (`{ workspaceIds }`) lalu
`leader:pipeline_changed` (`{ workspaceId }` saja) setiap ada aktivitas task yang di-commit di Workspace itu
(status, penugasan, jadwal, hambatan, ping…), digabung per Workspace dalam 1,5 detik. Tidak ada data task di
stream; klien memuat ulang `GET /v1/leader/pipeline`. Kanal leader terpisah dari stream Workspace biasa,
sehingga anggota non-leader tidak menerimanya. Di klien: debounce 2 detik; bila stream putus atau tidak
tersedia, ringkasan dimuat ulang tiap 2 menit selama tab terlihat.

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
