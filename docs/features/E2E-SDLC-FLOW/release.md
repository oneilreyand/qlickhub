# E2E-SDLC-FLOW — Tahap 6: Release & Close

**Status:** Released
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003, QA-010

## 1. Merge dan deploy

Urutan wajib, karena merge langsung men-deploy Production:

1. Owner push branch `feat/e2e-sdlc-flow` dan membuat PR (Tier 2: migrasi, ADR, SSoT, Policy Registry).
2. Terapkan kedua migrasi ke Production **sebelum** merge (gerbang migrasi Production, ADR-039),
   berurutan dalam satu `npm run db:migrate:prod`: `20261105000095-shorten-applied-requirement-codes`
   lalu `20261105000096-add-notification-bug-id`. Periksa `requirement_code_renames` terisi dan
   kolom `notifications.bug_id` ada.
3. Beri label `owner-approved`, merge, tunggu deploy selesai.

Pelaksanaan 2026-11-05: `npm run db:migrate:prod` tidak dipakai (connection string belum tersedia
di Terminal). Owner menerapkan 095 dan 096 lewat Supabase SQL Editor dengan satu script transaksi
("Run and enable RLS") yang skemanya diuji identik dengan migrasi kanonis. Percobaan pertama ditolak
editor karena tanda `$` di pola regex; versi kedua memakai `\Z` dan berhasil. Setelah itu CI
`verify` di-re-run dan PR di-merge.

| Phase | PR                                                       | Tier | File Tier 2                             | Merge commit                     | Memicu deploy Production? | Deployment ID / waktu                                             |
| ----- | -------------------------------------------------------- | ---- | --------------------------------------- | -------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| P1–P6 | [#105](https://github.com/oneilreyand/qlickhub/pull/105) | 2    | lihat [PHASE-01](phases/PHASE-01.md) §5 | `f521444` (2026-11-05 15:54 WIB) | ya                        | Vercel otomatis dari `f521444`; health dicek 2026-11-05 08:55 UTC |

## 2. Verifikasi di environment target

| AC    | Environment | Observasi / perintah                                                                                                             | Level | Hasil                                                       |
| ----- | ----------- | -------------------------------------------------------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------- |
| —     | Production  | `GET /v1/health` → `status: ok`, database `connected`, `migrations.latest` = `20261105000096-add-notification-bug-id.cjs` (80)   | E4    | Passed                                                      |
| AC-8  | Production  | Supabase SQL Editor: `SELECT count(*) FROM requirement_code_renames` = 5; `SequelizeMeta` sampai `20261105000096`                | E4    | Passed (data); tampilan `REQ-00x` di UI menyusul uji manual |
| AC-10 | Production  | Backfill `bug_notifications_linked` = 0 (belum ada notifikasi Bug lama yang bisa ditautkan); klik lonceng → halaman Bug          | E4    | Menunggu uji manual                                         |
| AC-9  | Production  | Bundle Production memuat UI baru (chunk `SubtaskWorkPage` berisi "Selesaikan Eksekusi QA"); skenario E2E manual satu Feature uji | E4    | Menunggu uji manual                                         |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------- |
| QA sign-off        | Belum                                                                                                       |
| Keputusan rilis PO | Belum                                                                                                       |
| Gap yang diterima  | Uji manual Production (AC-9, AC-10) dilakukan setelah rilis; PO "Fitur Pendaftaran Pasien" menyetujui Brief |
| Rollback plan      | Revert PR; bila perlu `down` migrasi `20261105000096` lalu `20261105000095` (kode lama dipulihkan)          |

## 4. Metrik sukses (dari problem.md)

| Metrik                                                  | Baseline | Target | Hasil setelah rilis | Kapan diukur ulang   |
| ------------------------------------------------------- | -------- | ------ | ------------------- | -------------------- |
| Langkah alur yang bisa lewat UI                         | 0 dari 9 | 9      | —                   | Hari rilis           |
| Kartu Tugas Saya yang berujung 403/"tidak dapat dibuka" | ada      | 0      | —                   | Hari rilis           |
| Retest macet                                            | mungkin  | 0      | —                   | 7 hari setelah rilis |

## 5. Checklist penutupan

- [x] Report di `docs/reports/` memakai `AGENT_REPORT_TEMPLATE.md` ([laporan rilis](../../reports/E2E_SDLC_FLOW_RELEASE_2026-11-05.md))
- [x] Stage Tracker di [README.md](README.md) diperbarui
- [x] `docs/features/FEATURE_CATALOG.md` diperbarui
- [x] SSoT/ADR terdampak sudah sesuai implementasi (ADR-041, Workflow §5–§6, `QA-010`)
- [ ] `TODO.md` → Done dan dipindah ke arsip
- [ ] Follow-up/Bug tertaut, tidak dibiarkan di catatan bebas
