# QUICK — MY-WORK-REPORT-SLICING Slicing UI Laporan Saya (galeri saja)

**Status:** Selesai
**WRA:** 3/16 — requirement dari desain yang sudah ada (1), satu lapisan frontend (1), komponen baru tanpa mengubah halaman produksi (1); tanpa data/otorisasi/kontrak/migrasi (0), tanpa ketergantungan eksternal (0).

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: Desain Laporan Saya (`docs/plans/work-visibility/design/01-laporan-saya*.webp`) belum punya komponen UI, sehingga integrasi API nanti harus sekaligus membangun tampilan.
- Bukti: `apps/web/src/components/ui` belum memiliki kartu ketepatan, grafik beban harian per workspace, daftar butuh perhatian, kartu irisan lintas workspace, atau tabel semua kerjaan; README desain mencatat state Loading/Empty/Error/Permission denied dan varian Dark belum didesain.
- Penyebab: Program WORK-VISIBILITY masih di tahap plan; data effort, kapasitas, kalender kerja, hambatan, dan tautan antar-task belum ada di API.

## Perubahan

- File/path:
  - `apps/web/src/components/ui/organisms/myWorkReport/` — `types.ts` (view-model, belum kontrak bersama), `labels.ts`, `dailyLoad.ts`, `MyWorkReportHeader.tsx`, `PunctualityPill.tsx`, `PunctualitySummaryGrid.tsx`, `DailyLoadChart.tsx`, `AttentionList.tsx`, `CrossWorkspaceLinks.tsx`, `WorkItemsTable.tsx` (filter ketepatan dan kelompok per workspace di sisi klien), `MyWorkReportView.tsx` (state memuat/kosong/gagal/akses ditolak), `index.ts`.
  - `apps/web/src/components/ui/organisms/myWorkReport/__fixtures__/myWorkReport.fixture.ts` — data contoh berlabel FIXTURE, hanya untuk galeri dan unit test.
  - `apps/web/src/components/ui/organisms/myWorkReport/__tests__/MyWorkReportView.test.tsx`.
  - `apps/web/src/pages/gallery/MyWorkReportGalleryDemo.tsx` dan satu Section baru di `apps/web/src/pages/ComponentGalleryPage.tsx`.
- Bukan scope: route/menu Laporan Saya, `ReportPage`, API, kontrak `@qlick/contracts`, migrasi, ekspor CSV sungguhan. Tombol Export CSV, "Lihat penyebab", dan judul kerjaan hanya callback; di galeri tidak memanggil server.

## Acceptance Criteria → bukti

| AC                                                                                                                                                                                                                                                                        | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                                                                                                          |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1: Komponen merender header, 6 kartu ketepatan, grafik beban harian bertumpuk per workspace dengan garis 100% dan tanda Bentrok, Butuh perhatian, Irisan lintas workspace (bentrok/bergantung/terkait), dan tabel Semua kerjaan sesuai desain desktop 1440 dan HP 390. | E2, E1                          | `npm --prefix apps/web run test -- src/components/ui/organisms/myWorkReport`; screenshot Playwright desktop, dark, dan HP 390 tanpa scroll horizontal halaman |
| AC-2: Grafik dan tabel dapat dibaca pembaca layar (label per hari berisi total, bentrok, dan porsi per workspace); filter status dan kelompok per workspace bekerja.                                                                                                      | E2                              | test yang sama                                                                                                                                                |
| AC-3: State memuat, kosong, gagal (dengan Coba lagi), dan akses ditolak tersedia.                                                                                                                                                                                         | E2                              | test yang sama                                                                                                                                                |
| AC-4: Data contoh hanya ada di file berlabel FIXTURE dan hanya diimpor oleh galeri/test; galeri menandai "Data contoh (fixture)".                                                                                                                                         | E1                              | `grep -rn myWorkReport.fixture apps/web/src`                                                                                                                  |
| AC-5: Typecheck, lint, theme check, dan suite web tetap lulus.                                                                                                                                                                                                            | E2, E4                          | `npm run validate`, `npm --prefix apps/web run test`                                                                                                          |

## Approval Window

- Task / baseline: MY-WORK-REPORT-SLICING @ 9734fbe9
- Path yang diizinkan: path di bagian Perubahan dan kartu ini
- Urutan aksi: edit → test → commit → PR → auto-merge (tier 1)
- Masa berlaku dan stop condition: hanya slicing Laporan Saya di Component Gallery; berhenti bila perlu menambah route, mengubah kontrak, API, atau file yang sedang dikerjakan Codex.

**Disetujui:** Owner melalui chat, 2026-11-17 — "ok slicing leader hub lebih dulu baru laporan saya" (usulan slicing ke Component Gallery dengan data contoh, tanpa route).

## Hasil

- `npm --prefix apps/web run test -- src/components/ui/organisms/myWorkReport` — exit 0 — 9/9 lulus.
- Suite web penuh (`vitest run`) — exit 0 — 147 file, 887 test lulus.
- `npm run validate` (docs, theme, lint, typecheck) — exit 0; tidak ada warning lint dari file slice ini.
- Screenshot Playwright pada harness lokal sementara (tidak di-commit): desktop 1440 terang dan gelap, HP 390 tanpa scroll horizontal halaman (grafik dan tabel bergulir di dalam kartunya), serta state memuat/kosong/gagal/akses ditolak.
- PR dan tier: Tier 1 (tidak menyentuh path `quality/tier2-paths.txt`).
- Gap: belum terhubung ke API (sengaja); kartu ringkasan fixture menghitung 22 kerjaan sedangkan tabel fixture hanya memuat 7 contoh; ilustrasi AccessRestricted dimuat dari CDN sehingga tidak tampil di harness offline.
