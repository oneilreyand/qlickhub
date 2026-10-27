# QUICK — KANBAN-SCOPE-RESET

**Status:** Selesai
**WRA:** 4/16 — blast radius frontend pada navigasi Task Hub (1), validasi unit dan UAT lokal (2), serta browser terautentikasi untuk E4 (1). Tidak ada perubahan API, kontrak, data, otorisasi, atau migrasi.

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: Setelah memilih folder lain saat view Kanban aktif, Kanban tidak menampilkan data karena URL masih menunjuk Feature dari scope sebelumnya.
- Bukti: Harness baca-saja menjalankan `patchTaskHubQueryState` dari URL dengan `kanbanFeatureId=feature-outside`; setelah patch folder, output tetap memuat ID tersebut. UAT sebelumnya menunjukkan Feature scope baru tidak menyediakan ID lama.
- Penyebab: Terkonfirmasi. Patch scope folder dan handler Sidebar mempertahankan `kanbanFeatureId`; Kanban secara benar menolak Feature yang tidak ada dalam props `features` lalu menampilkan empty state.

## Perubahan

- File/path: `taskHubQueryState`, `Sidebar`, test URL terkait, Quick Card, TODO, dan laporan evidence.
- Bukan scope: API/backend/kontrak/data/RBAC/migrasi; pemilihan Feature Kanban; drag/drop/status/assignment Kanban; deployment atau merge `main`.

## Acceptance Criteria → bukti

| AC                                                                                                                                  | Bukti yang dibutuhkan (E-level) | Perintah / observasi                             |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| AC-1: Setiap perubahan scope folder atau Tanpa Folder menghapus `kanbanFeatureId` lama, tetapi mempertahankan view dan filter lain. | E2, E4                          | Unit test query state; UAT local.                |
| AC-2: Sidebar desktop/mobile memakai normalisasi URL yang sama.                                                                     | E2, E4                          | Unit query state dan UAT navigasi folder.        |
| AC-3: Tidak ada visual/theme atau kontrak baru, dan UI tetap responsif Light/Dark.                                                  | E2, E4                          | typecheck/theme check, UAT phone/tablet/desktop. |

## Approval Window

- Task / baseline: KANBAN-SCOPE-RESET @ `067c04f`
- Path yang diizinkan: `apps/web/src/lib/utils/taskHubQueryState.ts`, `apps/web/src/components/layout/Sidebar.tsx`, test terkait, `docs/plans/quick/`, `docs/reports/`, dan `TODO.md`.
- Urutan aksi: edit → test → docs/theme/typecheck → UAT lokal read-only → quality review → commit → push ke PR #58. Periksa Tier; tidak ada merge `main`/deploy.
- Masa berlaku dan stop condition: hanya slice reset scope ini sampai validasi menemukan konflik kontrak, data, RBAC, atau kebutuhan perubahan perilaku Kanban lain.

**Disetujui:** Owner, 2026-10-27, pesan "ok setuju" setelah rencana G3 disajikan.

## Hasil

- `npm --prefix apps/web run test -- --run src/lib/utils/__tests__/taskHubQueryState.test.ts src/components/ui/organisms/taskHub/__tests__/TaskHubViews.test.tsx` — exit 0 — 2 file, 17/17 test lulus, 0 gagal/skipped.
- `npm --prefix apps/web run typecheck` dan `npm --prefix apps/web run build` — exit 0 — tanpa error tipe atau build.
- `npm run theme:check`, `npm run docs:check`, `npm run docs:completeness`, dan `git diff --check` — exit 0; theme coverage lulus, dokumentasi diverifikasi, dan tidak ada whitespace error.
- E4 2026-10-27 — UAT PO pada `localhost:3000`: Kanban unfiled dengan Feature `46252677-4581-4cdc-971d-7934c53a7ca7` dipindahkan ke folder Oktober; URL menjadi `view=kanban&folderId=…` tanpa `kanbanFeatureId`; selector menawarkan satu Feature Oktober, lalu menampilkan 4 subtask miliknya. Responsif diverifikasi di 390×844, 768×1024, dan 1440×960 dalam mode gelap; `theme:check` memverifikasi cakupan strategi Light/Dark.
- PR dan tier: [PR #58](https://github.com/oneilreyand/qlickhub/pull/58), tier dicatat setelah commit diperiksa.
- Gap: tidak ada dalam scope; URL stale yang diketik manual tetap menampilkan state pemilihan aman sampai Feature dipilih, bukan data lintas-folder.
