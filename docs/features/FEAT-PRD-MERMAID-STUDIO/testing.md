# FEAT-PRD-MERMAID-STUDIO — Test & Review

**Status:** Disetujui
**Disetujui:** Verifier Standards dan Spec independen, 2026-11-10, kandidat `52c4cad5`; temuan P1 telah diperbaiki dan evidence primer diperiksa. CI dan Production smoke tetap gerbang terpisah.

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

## Temuan Production 2026-11-11 — pintu masuk Studio ganda

Ditemukan Owner pada sesi Production terautentikasi (halaman Feature sederhana, tahap PRD), setelah
rilis PR #119. Perbaikan disetujui Owner lewat chat 2026-11-11 (`boleh kerjakan`) dan berada dalam
scope MMD-07 (pintu masuk Studio); tanpa perubahan kontrak, data, authorization, atau migrasi.

| Temuan                                                                                            | Sumber                                            | Perbaikan                                       |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| Tombol `Tambah Diagram` di ringkasan PRD memakai handler yang sama dengan `Edit` (`onEditBrief`)  | `FeatureStagePanels.tsx`                          | Tombol dihapus; `Edit` tetap membuka form Brief |
| Form Brief sederhana menampilkan dua tombol `Tambah Diagram` yang membuka dialog Studio yang sama | `TaskDetailProductBriefTab.tsx` (cabang `simple`) | Tombol kepala kartu dihapus; tersisa satu       |

Evidence (clone `main` @ `0c236cf2` + perubahan, Node 22, dependensi `npm ci`):

- Regression test baru `shows a single Tambah Diagram entry in the simple Feature page editor`:
  gagal pada kode lama (`expected … to have a length of 1 but got 2`), lulus setelah perbaikan.
- `vitest run src/components/ui/organisms/taskDetail`: 10 file, 80/80 lulus, 0 skip.
- `apps/web` `tsc --noEmit` lulus; ESLint pada tiga file yang berubah tanpa temuan.

Batas: suite frontend penuh, E2E, dan pemeriksaan visual tiga viewport belum dijalankan lokal; CI PR
menjadi buktinya. Tampilan Brief non-sederhana (tombol kepala + toolbar editor) tidak diubah.
Verifikasi Production setelah deploy masih terbuka dan dicatat di [release.md](release.md).
