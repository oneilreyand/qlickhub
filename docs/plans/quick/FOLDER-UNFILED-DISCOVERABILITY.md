# QUICK — FOLDER-UNFILED-DISCOVERABILITY

**Status:** Selesai
**WRA:** 4/16 — blast radius frontend (1), validasi komponen dan UAT lokal (2), serta akses browser terautentikasi untuk E4 (1). Tidak ada perubahan backend, kontrak bersama, otorisasi, data, atau migrasi.

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: `Semua Task Workspace` memuat dua Feature, sedangkan folder Oktober hanya memuat satu. Feature tanpa `folderId` tidak mempunyai lokasi navigasi yang jelas. Saat membuat Feature, pilihan tanpa folder belum menjelaskan di mana hasilnya akan muncul.
- Bukti: UAT lokal terautentikasi 2026-10-26 membuktikan Feature fixture `46252677-4581-4cdc-971d-7934c53a7ca7` memiliki `folderId: null`; daftar Semua Task menampilkan dua Feature, sedangkan folder Oktober menampilkan satu.
- Penyebab: Terbukti. Kontrak task telah mendukung query `unfiledOnly`, tetapi state URL Task Hub dan organisme `FolderTree` belum mengekspos scope tersebut; label modal memakai istilah teknis "Root Workspace" tanpa konsekuensi navigasi.

## Perubahan

- File/path: state URL Task Hub, `TaskHubDashboardTemplate`, `Sidebar`, `FolderTree`, komponen pemilih lokasi folder yang dipakai modal Feature dan AI, test terkait, `TODO.md`, dan laporan evidence.
- Bukan scope: backend/API/kontrak/migrasi/RBAC/data fixture; perbaikan pemilihan Feature Kanban yang stale ketika scope folder berubah; drag/drop Kanban; deployment atau merge ke `main`.

## Acceptance Criteria → bukti

| AC                                                                                                                                                                  | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------- |
| AC-1: Navigasi menampilkan `Tanpa Folder`; pemilihannya memuat hanya root Feature tanpa folder, mempertahankan filter URL lain, dan menandai scope dengan jelas.    | E2, E4                          | Unit test state/FolderTree; UAT lokal terautentikasi.            |
| AC-2: Memilih folder atau Semua Task menghapus scope `Tanpa Folder` secara deterministik.                                                                           | E2, E4                          | Unit test state URL; UAT lokal terautentikasi.                   |
| AC-3: Modal Feature biasa dan AI menjelaskan bahwa `Tanpa Folder` muncul di Semua Task serta kategori Tanpa Folder, dan pemilih folder aktif tetap menjadi default. | E2, E4                          | Render test modal; UAT tanpa submit.                             |
| AC-4: Perubahan memenuhi token Light/Dark, responsif phone/tablet/desktop, akses keyboard, dan tidak menambah kontrak/data baru.                                    | E2, E4                          | `theme:check`, build/typecheck, inspeksi UAT enam mode/viewport. |

## Approval Window

- Task / baseline: FOLDER-UNFILED-DISCOVERABILITY @ `54867ee`
- Path yang diizinkan: `apps/web/src/lib/utils/taskHubQueryState.ts`, Task Hub/Sidebar/FolderTree/modal folder UI dan test terkait, `docs/plans/quick/`, `docs/reports/`, `TODO.md`.
- Urutan aksi: edit → test → validasi dokumen → UAT lokal baca-saja → quality review → commit → push ke branch PR #58. Tier diperiksa sebelum push; tidak ada merge `main` atau deploy.
- Masa berlaku dan stop condition: hanya untuk slice ini sampai validasi atau quality review menemukan konflik scope/kontrak/otorisasi. Berhenti dan minta keputusan bila backend, schema, data, RBAC, atau perilaku Kanban stale-scope harus berubah.

**Disetujui:** Owner, 2026-10-26, pesan "ok jalankan" setelah rencana dan Approval Window dipresentasikan.

## Hasil

- `npm --prefix apps/web run test -- --run …` — exit 0 — 4 file, 30/30 test lulus.
- `npm --prefix apps/web run typecheck` dan `npm --prefix apps/web run build` — exit 0 — tanpa error build.
- `npm run theme:check`, `npm run docs:check`, `npm run docs:completeness`, `git diff --check` — exit 0; tema lulus, dokumentasi 10/10, dan 0 gap dokumentasi baru.
- `npm run sdlc:check` — exit 0 — pemeriksaan diff otomatis dilewati karena baseline pembanding tidak tersedia; Quick Card ini diperiksa manual terhadap template dan lint dokumentasi.
- E4 2026-10-27 — UAT pada `localhost:3000` sebagai PO: scope `unfiledOnly=true` memuat satu Feature fixture tanpa folder; Semua Task kembali ke dua Feature; modal Feature biasa dan AI menyebutkan lokasi baru; diuji Light/Dark pada 390×844, 768×1024, dan 1440×900 tanpa submit/mutasi data.
- PR dan tier: PR #58, tier dicatat setelah commit.
- Gap: tidak ada dalam scope; perbaikan pemilihan Kanban stale-scope tetap di luar scope.
