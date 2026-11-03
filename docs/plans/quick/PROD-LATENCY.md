# QUICK — PROD-LATENCY Hapus N+1 pada timeline Leader Hub dan cek deadline notifikasi

**Status:** Selesai
**WRA:** 3/16 — ketersinggungan 1 (dua modul API: `leader`, `notifications`), validasi 2 (test integrasi PostgreSQL yang menghitung query). Satu layer (API), tanpa migrasi, kontrak bersama, perubahan authorization, atau perubahan perilaku yang terlihat pengguna.

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: Production terasa lambat (laporan Owner 2026-11-03).
- Bukti (diukur dari browser di Jakarta ke Production, 2026-11-03):
  - `/v1` tanpa DB ±290 ms; `/v1/health` dengan 2 query ±590 ms → ±150 ms per query, karena fungsi API berjalan di `iad1` (header `x-vercel-id: sin1::iad1…`) sedangkan database di Supabase `ap-northeast-1`. Region ditangani terpisah di branch `perf/api-region-hnd1` (Tier 2, `vercel.json`).
  - Dengan biaya per query sebesar itu, setiap query berulang dalam loop berlipat:
    - `leaderService.getLeaderTimeline` menjalankan `TaskModel.findAll` sekali per anggota tim.
    - `checkAndDispatchApproachingDeadlineNotifications` menjalankan `NotificationModel.findOne` sekali per task × penerima. Endpoint `POST /v1/notifications/check-deadlines` dipicu otomatis dari browser Admin/Owner (`useNotifications.ts`, jeda 1 menit).
- Penyebab: terkonfirmasi di kode dan oleh test yang menghitung query (lihat Hasil). Besaran dampak di Production belum diukur karena data Production tidak dapat dibaca dari sesi ini.

## Perubahan

- File/path: `apps/api/src/modules/leader/leaderService.ts`, `apps/api/src/modules/notifications/notificationService.ts`, `apps/api/src/db/__tests__/captureSql.ts` (test support), `apps/api/src/modules/leader/__tests__/leaderApiIntegration.test.ts`, `apps/api/src/modules/notifications/__tests__/notificationApiIntegration.test.ts`, `TODO.md`, Quick Card ini.
- Bukan scope (keputusan terpisah, lihat Gap): region fungsi (branch terpisah), batas bawah jendela due date di cek deadline, wajib `workspaceId` atau memindahkan cek deadline ke cron, polling notifikasi 15 detik, realtime SSE antar-instance, penggabungan query auth middleware, `idle` pool, pemindahan database.

## Acceptance Criteria → bukti

| AC                                                                                                     | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                   |
| ------------------------------------------------------------------------------------------------------ | ------------------------------- | ---------------------------------------------------------------------- |
| AC-1: Timeline Leader memuat subtask semua anggota dengan satu query, hasil per anggota tetap terpisah | E3                              | `leaderApiIntegration.test.ts` test 4 (PostgreSQL disposable)          |
| AC-2: Cek deadline memeriksa anti-spam semua task × penerima dengan satu query, perilaku tetap         | E3                              | `notificationApiIntegration.test.ts` §6 test 2                         |
| AC-3: Perilaku lama tidak berubah                                                                      | E3                              | Seluruh test leader (7) dan notifications (17) lulus                   |
| AC-4: Test baru gagal pada kode lama                                                                   | E3                              | Jalankan test baru terhadap `leaderService`/`notificationService` lama |

## Approval Window

- Task / baseline: PROD-LATENCY @ `6e4e4c3`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → validate → commit → push branch → Owner membuat PR dan memutuskan merge.
- Masa berlaku dan stop condition: sampai branch dipush; tidak ada merge ke `main` dan tidak ada auto-merge tanpa keputusan Owner (merge ke `main` = deploy Production).

**Disetujui:** Owner, 2026-11-03, "ok kerjakan" di chat untuk perbaikan region, cek deadline, dan N+1 Leader Hub sebagai branch + PR tanpa merge.

## Hasil

- PostgreSQL 16 disposable dengan 78 migrasi kanonikal (jumlah dan migrasi terakhir sama dengan Production menurut `/v1/health`).
- `NODE_ENV=test node --test dist/modules/leader/__tests__/leaderApiIntegration.test.js dist/modules/notifications/__tests__/notificationApiIntegration.test.js` — exit 0 — **24/24 pass**, 0 skip.
- Bukti red, kode lama + test baru: leader test 4 gagal `2 !== 1` (2 anggota = 2 query); notifications §6 test 2 gagal `8 !== 1` (8 lookup anti-spam).
- Seluruh test integrasi API (`node --test` atas semua `dist/**/__tests__/*.test.js`, PostgreSQL disposable yang sama) — exit 0 — **636/636 pass**, 0 skip.
- `npm run validate` — exit 0 (docs governance pass, docs:completeness 0 gap baru, lint 0 error/15 warning lama, typecheck); `sdlc:check --base origin/main` lulus dengan Quick Card ini; `quality:check` lengkap (scope dataAccess, performance).
- PR dan tier: Tier 1 (tidak menyentuh path Tier 2). Belum di-merge.
- Gap:
  - Cek deadline tetap memindai semua task belum `done` dengan `dueDate <= besok` (termasuk yang sudah lama overdue) dan tetap boleh dipanggil tanpa `workspaceId`; perlu keputusan produk apakah overdue lama tetap diberi pengingat.
  - Pengiriman notifikasi yang lolos anti-spam tetap berurutan per penerima, sama seperti sebelumnya.
