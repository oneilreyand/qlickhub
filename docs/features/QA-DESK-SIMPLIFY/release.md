# QA-DESK-SIMPLIFY — Tahap 6: Release & Close

**Status:** Released
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003

## 1. Merge dan deploy

| Phase | PR  | Tier | File Tier 2                                | Merge commit | Memicu deploy Production? | Deployment ID / waktu                      |
| ----- | --- | ---- | ------------------------------------------ | ------------ | ------------------------- | ------------------------------------------ |
| P1    | #37 | 2    | `testManagementPolicy.ts`, migrasi 087/088 | `de50b69`    | ya (Vercel auto-deploy)   | Tidak dicatat; merge 2026-10-13 oleh Owner |

Merge ke `main` otomatis men-deploy Production (keputusan Owner 2026-10-13). Migrasi dijalankan Owner
**setelah** merge, sehingga ada jeda singkat kode baru tanpa trigger 088; lihat report rilis.

## 2. Verifikasi di environment target

| AC             | Environment | Observasi / perintah                                                                    | Level | Hasil           |
| -------------- | ----------- | --------------------------------------------------------------------------------------- | ----- | --------------- |
| AC-2.1         | Production  | Query audit read-only sebelum migrasi: `content_eligible` 0, `will_backfill` 0          | E4    | Pass            |
| AC-2.1, AC-5.1 | Production  | `SequelizeMeta` teratas: 088, 087, 086, 085, 084 (SQL Editor, 2026-10-14)               | E4    | Pass            |
| Migrasi 086    | Production  | `information_schema.columns` → `bugs.environment` ada                                   | E4    | Pass            |
| AC-2           | Lokal       | Brief disetujui → baseline otomatis; QA tetapkan Versi Uji dan jalankan TC (2026-10-19) | E3    | Pass            |
| AC-3.1, AC-4.1 | Production  | Smoke test QA (buat test case → jalankan; hapus test case 0 run)                        | E4    | Belum dilakukan |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| QA sign-off        | N/A — perubahan backend tata kelola; bukti test integrasi di [testing.md](testing.md)                                                           |
| Keputusan rilis PO | approved — Owner merge PR #37, 2026-10-13                                                                                                       |
| Gap yang diterima  | Smoke test lokal E3 lulus ([report smoke test lokal](../../reports/LOCAL_SMOKE_TEST_2026-10-19.md)); AC-3.1/4.1 dan smoke test Production belum |
| Rollback plan      | Alihkan alias Vercel ke deployment sebelumnya; tanpa `db:migrate:undo` di Production                                                            |

## 4. Metrik sukses (dari problem.md)

| Metrik                                            | Baseline        | Target                    | Hasil setelah rilis                 | Kapan diukur ulang            |
| ------------------------------------------------- | --------------- | ------------------------- | ----------------------------------- | ----------------------------- |
| QA membuat test case lalu langsung menjalankannya | Gagal (403)     | Berhasil tanpa langkah PO | Lulus di test integrasi; Prod belum | Saat smoke test               |
| Baseline otomatis                                 | Hanya manual PO | Otomatis                  | Lulus di test integrasi             | Feature Production berikutnya |
| Hapus test case 0 run                             | Tidak mungkin   | 204; 409 setelah run      | Lulus di test integrasi; Prod belum | Saat smoke test               |

## 5. Checklist penutupan

- [x] Report di `docs/reports/QA_DESK_SIMPLIFY_RELEASE_2026-10-14.md`
- [x] Stage Tracker di [README.md](README.md) diperbarui
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui (follow-up)
- [x] SSoT/ADR terdampak sudah sesuai implementasi
- [ ] `TODO.md` → Done dan dipindah ke arsip
- [x] Smoke test lokal E3 dicatat di [report smoke test lokal](../../reports/LOCAL_SMOKE_TEST_2026-10-19.md); dua bug yang ditemukan diperbaiki di PR #51 dan #52
- [ ] Smoke test Production E4 dan AC-3.1/4.1 (follow-up)
- [x] Follow-up dicatat di report (smoke test, refactor `ensureAutoBaseline`, pemicu baseline di luar transaksi, cek migrasi Production di CI)
