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
| P7    | PR P7 (dibuat Owner)                                     | 1    | tidak ada (tanpa migrasi)               | —                                | ya                        | —                                                                 |

P7 tidak membawa migrasi, ADR, atau file Tier 2 lain, jadi PR-nya Tier 1 dan tidak butuh gerbang
migrasi Production. Setelah merge, ulang singkat di Production (P7-QA-1).

## 2. Verifikasi di environment target

| AC    | Environment | Observasi / perintah                                                                                                                                                                                                                                                                                                                                                                                                    | Level | Hasil                                                           |
| ----- | ----------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----- | --------------------------------------------------------------- |
| —     | Production  | `GET /v1/health` → `status: ok`, database `connected`, `migrations.latest` = `20261105000096-add-notification-bug-id.cjs` (80)                                                                                                                                                                                                                                                                                          | E4    | Passed                                                          |
| AC-8  | Production  | Supabase SQL Editor: `SELECT count(*) FROM requirement_code_renames` = 5; `SequelizeMeta` sampai `20261105000096`                                                                                                                                                                                                                                                                                                       | E4    | Passed (UI menampilkan `REQ-006` setelah Apply pada uji manual) |
| AC-10 | Production  | Backfill `bug_notifications_linked` = 0; uji manual 2026-11-05: Developer mengklik notifikasi Bug di lonceng → `/work/bugs/:id` terbuka                                                                                                                                                                                                                                                                                 | E4    | Passed                                                          |
| AC-9  | Production  | Uji manual 2026-11-05, Feature uji `[UJI E2E]` di Workspace essential, login bergantian: Apply (`REQ-006`) → Brief disetujui → Developer Kirim ke QA → gerbang QA 1/2 lalu 2/2 → siklus uji ditolak saat Brief draf lalu jalan → Gagal + Bug → retest Lulus (Bug `verified` satu penulisan) → setujui Developer → Selesaikan Eksekusi QA → QA Sign-off → QA tanpa panel rilis → Owner "Catat Keputusan Rilis" Disetujui | E4    | Passed                                                          |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QA sign-off        | Tercatat 2026-11-05 di Production untuk Feature uji `[UJI E2E]` (alur AC-9)                                                                                       |
| Keputusan rilis PO | Disetujui 2026-11-05 oleh reyand (Owner) dari kartu "Catat Keputusan Rilis" untuk Feature uji                                                                     |
| Gap yang diterima  | Tidak ada untuk P1–P6. Temuan UX uji manual dikerjakan di P7 (AC-11 – AC-15). Persetujuan Brief "Fitur Pendaftaran Pasien" adalah aksi PO produk, bukan gap rilis |
| Rollback plan      | Revert PR; bila perlu `down` migrasi `20261105000096` lalu `20261105000095` (kode lama dipulihkan)                                                                |

## 4. Metrik sukses (dari problem.md)

| Metrik                                                  | Baseline | Target | Hasil setelah rilis       | Kapan diukur ulang   |
| ------------------------------------------------------- | -------- | ------ | ------------------------- | -------------------- |
| Langkah alur yang bisa lewat UI                         | 0 dari 9 | 9      | 9 (uji manual 2026-11-05) | Hari rilis           |
| Kartu Tugas Saya yang berujung 403/"tidak dapat dibuka" | ada      | 0      | 0 (uji manual 2026-11-05) | Hari rilis           |
| Retest macet                                            | mungkin  | 0      | —                         | 7 hari setelah rilis |

## 5. Checklist penutupan

- [x] Report di `docs/reports/` memakai `AGENT_REPORT_TEMPLATE.md` ([laporan rilis](../../reports/E2E_SDLC_FLOW_RELEASE_2026-11-05.md))
- [x] Stage Tracker di [README.md](README.md) diperbarui
- [x] `docs/features/FEATURE_CATALOG.md` diperbarui
- [x] SSoT/ADR terdampak sudah sesuai implementasi (ADR-041, Workflow §5–§6, `QA-010`)
- [ ] `TODO.md` → Done dan dipindah ke arsip
- [x] Follow-up/Bug tertaut, tidak dibiarkan di catatan bebas (temuan UX → P7 di [breakdown.md](breakdown.md))
