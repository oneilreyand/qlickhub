# Agent Report — Fix QA Work Queue Connection Pool Deadlock

## Task

Perbaiki error 500 Internal Server Error saat anggota dengan peran QA mengakses antrean Tugas Saya (`/workspaces/:workspaceId/my-work-queue`).

## Outcome

Memperbaiki kebuntuan transaksi (*connection pool deadlock*) pada `workQueueService.getRoleAwareQueue`. Method `bugService.listBugs` kini menerima parameter opsional `transaction?: Transaction` dan meneruskannya ke seluruh query internal (`requireActiveMember`, `BugModel.findAll`, `TaskModel.findAll`, `BugResolutionEventModel.findAll`, dan `BugRetestAttemptModel.findAll`). Di `workQueueService.qaBuckets`, pemanggilan `bugService.listBugs` kini menyertakan objek `transaction` aktif, sehingga seluruh query di dalam antrean QA menggunakan kembali satu koneksi yang sama dan tidak mengalami deadlock pada runtime serverless dengan `max: 1` koneksi pool.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow & Roles](../2_WORKFLOW_AND_ROLES.md), dan [Agent guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tidak ada perubahan kontrak API, response schema, atau data persisten.
- **Authorization impact:** Otorisasi peran QA tetap terjaga; `requireActiveMember` tetap dieksekusi di dalam transaksi.
- **Migration risk:** Tidak ada perubahan schema atau migrasi baru.

## Changed files

- `apps/api/src/modules/bugs/bugService.ts` — menambahkan dukungan parameter `transaction?: Transaction` pada `listBugs` dan meneruskannya ke query internal.
- `apps/api/src/modules/workQueue/workQueueService.ts` — meneruskan `transaction` saat memanggil `bugService.listBugs` di `qaBuckets`.

## Validation

- `NODE_ENV=test node --test apps/api/dist/modules/workQueue/__tests__/workQueueApiIntegration.test.js` — 4/4 lulus.
- `NODE_ENV=test node --test apps/api/dist/modules/bugs/__tests__/bugApiIntegration.test.js` — 6/6 lulus.
- `npm run validate` — lulus: docs 5/5, lint 0 error (21 warning lama di luar cakupan), typecheck (contracts, api, web) 0 error.
- `git diff --check` — lulus tanpa whitespace error.

## Risks or follow-up

- Perubahan bersifat backward-compatible karena parameter `transaction` bersifat opsional.
- Siap dideploy ke Production melalui Vercel.

## TODO update

- `FIX-QA-WORK-QUEUE-TRANSACTION-DEADLOCK` → `Done`; perubahan telah divalidasi dan siap dideploy ke Production.
