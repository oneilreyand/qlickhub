# QUICK — CI-RUN-WEB-CONTRACT-E2E-TESTS CI menjalankan test web, kontrak, dan e2e browser

**Status:** Menunggu persetujuan
**WRA:** 4/16 — lapisan 1 (workflow CI), ketersinggungan 1 (semua PR), validasi 1, eksternal 1 (browser di runner)

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: CI `verify` hanya menjalankan test API; 664 test web (vitest), 84 test kontrak, dan 22 skenario
  e2e browser tidak pernah dijalankan di PR.
- Bukti: `.github/workflows/ci.yml` (main `b0bb86f`) tidak memuat `apps/web run test`,
  `packages/contracts run test`, atau `test:e2e`. Temuan audit E1.
- Penyebab: workflow CI awal hanya menyiapkan PostgreSQL untuk API.

## Perubahan

- File/path: `.github/workflows/ci.yml` (dua langkah di `verify`, job baru `e2e`),
  `apps/web/e2e/support/qaDeskFlowSeed.ts` (batas tunggu 30 detik untuk heading pertama setelah login,
  sama dengan budget `goto`; assertion tidak berubah), Quick Card ini.
- Job `e2e`: PostgreSQL 16 disposable, `playwright install --with-deps chromium`, `npm run test:e2e`,
  laporan Playwright diunggah sebagai artifact bila gagal.
- Bukan scope: menambah spec e2e baru, menjadikan `e2e` required check di ruleset GitHub (keputusan Owner).

## Acceptance Criteria → bukti

| AC                                                                      | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                                                                    |
| ----------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AC-1 Test kontrak dan web berjalan di `verify`                          | E2                              | `npm --prefix packages/contracts run test` 84/84; `npm --prefix apps/web run test` 664/664                              |
| AC-2 Seluruh e2e lulus di PostgreSQL disposable                         | E3                              | `npm --prefix apps/web run test:e2e` lokal: 22/22                                                                       |
| AC-3 Kegagalan awal "Tugas Saya" terbukti masalah cold start, bukan bug | E2                              | sebelum: 1 gagal (tes pertama, kompilasi Vite pertama); spec yang sama lulus di run berikutnya; sesudah perbaikan 22/22 |
| AC-4 Workflow valid                                                     | E1                              | YAML parse; job `verify` + `e2e`                                                                                        |

## Approval Window

- Task / baseline: CI-RUN-WEB-CONTRACT-E2E-TESTS @ `b0bb86f`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → merge (tier 2, `.github/**`)
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila job `e2e` gagal di CI

**Disetujui:** —

## Hasil

- Perintah — exit code — pass/fail/skip: kontrak 0 — 84/0/0; web 0 — 664/0/0; e2e 0 — 22/0/0 (lokal,
  Chromium headless, PostgreSQL 16).
- PR dan tier: belum dibuat; Tier 2 (`.github/**`).
- Gap: run e2e menimpa screenshot di `docs/screenshots/` (perilaku spec yang sudah ada); di CI tidak
  berdampak karena tidak di-commit. Durasi CI bertambah sekitar 4–6 menit untuk job `e2e`.
