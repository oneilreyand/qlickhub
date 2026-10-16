# QUICK — CI-ENV-MIGRATION-GUARD Pengaman file contoh env dan migrasi Production

**Status:** Disetujui
**WRA:** 3/16 — lapisan 1 (CI + script), validasi 1 (test baru), ketersinggungan 1 (`validate` dipakai semua PR)

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala 1: `.env.production.example` di folder kerja agent sempat ditimpa nilai `.env` asli
  (URL database, JWT secret, SMTP password, Gemini key). Tidak ada pengecekan yang akan menolaknya bila
  ter-commit.
- Gejala 2: migrasi 085 dan 086 sudah ada di `main` sejak 25 Sep/1 Okt, tetapi baru dijalankan di
  Production pada 14 Okt; merge ke `main` langsung deploy Production.
- Bukti: [report rilis QA-DESK-SIMPLIFY](../../reports/QA_DESK_SIMPLIFY_RELEASE_2026-10-14.md);
  output `git diff` yang disamarkan dari folder AGY (2026-10-14).
- Penyebab: tidak ada gate untuk isi file contoh env; tidak ada pengingat migrasi di PR.

## Perubahan

- File/path: `scripts/checkEnvExamples.mjs` + test, `package.json` (`validate`, dua script baru),
  `.github/workflows/ci.yml` (langkah peringatan migrasi), Quick Card ini.
- Bukan scope: mengecek status migrasi Production dari CI (butuh kredensial database di CI dan
  keputusan Owner), memblokir merge karena migrasi.

## Acceptance Criteria → bukti

| AC                                                                                 | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                  |
| ---------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------- |
| AC-1 File contoh dengan URL database remote berpassword asli / secret asli ditolak | E2                              | `npm run env:examples:test` (5 test)                  |
| AC-2 Lima file contoh di repo saat ini lulus                                       | E2                              | `npm run env:examples:check`                          |
| AC-3 Pesan error tidak pernah menampilkan nilai                                    | E2                              | test "never echoes values"                            |
| AC-4 PR yang menambah migrasi mendapat peringatan + daftar di ringkasan CI         | E2                              | simulasi langkah CI pada `221fa0a..de50b69` (087/088) |

## Approval Window

- Task / baseline: CI-ENV-MIGRATION-GUARD @ `de50b69`
- Path yang diizinkan: daftar pada bagian Perubahan
- Urutan aksi: edit → test → commit → patch → Owner publish → PR → auto-merge (tier 2)
- Masa berlaku dan stop condition: sampai PR dibuat; berhenti bila ada file contoh di repo yang gagal

**Disetujui:** reyand (Owner), 2026-10-14, chat "setuju"

## Hasil

- Perintah — exit code — pass/fail/skip: `npm run env:examples:test` — 0 — 5/0/0;
  `npm run env:examples:check` — 0 — 5 file lulus; simulasi langkah CI — 0 — 2 migrasi terdaftar.
- PR dan tier: belum dibuat; Tier 2 (`.github/**`, `scripts/check*.mjs`, `package.json`).
- Gap: tidak mengecek status migrasi Production secara langsung.
