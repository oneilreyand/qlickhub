# LEADER-PIPELINE-HUB — Data, API, and Shared Contracts

**Applicable Policy IDs:** DOC-005, CONTRACT-001, DATA-005

## Data and relations

Tidak ada tabel baru. Membaca `tasks`, `task_activities`, `task_blockers`, requirement/AC, baseline
kesiapan, `qa_sign_offs`, `release_decisions`, `bugs`, kalender/kapasitas. Pemetaan tahap ditetapkan di P1
dan ditulis di dokumen ini sebelum UI dibuat; tahap tanpa data ditampilkan "belum dilacak" (`DATA-005`).

## API and executable contract

Tambahan di `packages/contracts/src/leader.ts`: ringkasan pipeline dan kesehatan. Endpoint:
`GET /v1/leader/summary?workspaceIds&from&to`, `POST /v1/workspaces/:workspaceId/tasks/:taskId/blockers/:blockerId/ping`.
View-model UI di `organisms/leaderHub/types.ts` dipetakan dari contract.

## Boundary notes

Terdampak: modul `leader`, `tasks` (ping), `realtime` (konsumsi), `LeaderHubPage`. Tidak terdampak:
tab Aktivitas periode (LEADER-SDLC-HUB), alur status task.
