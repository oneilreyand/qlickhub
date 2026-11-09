# FEAT-PRD-MERMAID-STUDIO — Test & Review

**Status:** Menunggu persetujuan
**Verifier:** Belum ada verifier/CI independen; hasil executable lokal dilaporkan oleh pelaksana.

Evidence lengkap dan quality review: [laporan](../../reports/FEAT_PRD_MERMAID_STUDIO_2026-11-09.md).

| AC     | Evidence lokal                                                                                             | Batas                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| MMD-01 | Studio component + browser aplikasi asli memakai engine Mermaid CDN                                        | Environment lokal                                             |
| MMD-02 | Contract round-trip/replace/no-op, component dan browser edit ulang                                        | Target lama ditolak jika berubah                              |
| MMD-03 | HTTP authenticated Spec → Apply → Brief → save/get; browser simpan/reload/edit/save/reload                 | PostgreSQL disposable, bukan Production                       |
| MMD-04 | 409 stale Spec, 403 Dev/QA, 404 cross-Workspace, 400 applied/metadata invalid                              | Brief belum memiliki expectedVersion parent                   |
| MMD-05 | Legacy contract conversion dan chart render regression                                                     | Tidak ada backfill otomatis                                   |
| MMD-06 | Component: dirty cancel/switch, readonly, source invalid/retry, field limit, stale target/document         | Mermaid syntax validated di preview; server struktur/metadata |
| MMD-07 | 390×844, 820×1180, 1440×1000 Light/Dark; tombol 44px terlihat dan tanpa overflow; Tab dari input ke viewer | Browser desktop emulasi viewport, bukan device native         |
| MMD-08 | docs:check/completeness/validate dan quality review pada laporan                                           | Independent G5 pending                                        |

Hasil audit sebelum implementasi tidak digunakan sebagai evidence perubahan ini.
