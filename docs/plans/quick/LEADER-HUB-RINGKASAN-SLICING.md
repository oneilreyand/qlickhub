# QUICK — LEADER-HUB-RINGKASAN-SLICING Slicing UI Leader Hub tab Ringkasan (galeri saja)

**Status:** Selesai
**WRA:** 3/16 — requirement dari desain yang sudah ada (1), satu lapisan frontend (1), komponen baru tanpa mengubah halaman produksi (1); tanpa data/otorisasi/kontrak/migrasi (0), tanpa ketergantungan eksternal (0).

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: Desain Leader Hub tab Ringkasan (`docs/plans/work-visibility/design/02-leader-hub-ringkasan*.webp`) belum punya komponen UI, sehingga integrasi API nanti harus sekaligus membangun tampilan.
- Bukti: `apps/web/src/components/ui` belum memiliki kartu ringkasan, tabel pipeline SDLC, panel hambatan, atau panel beban tim; README desain mencatat state Loading/Empty/Error/Permission denied dan varian Dark belum didesain.
- Penyebab: Program WORK-VISIBILITY masih di tahap plan; API ringkasan Leader (pipeline, hambatan, kapasitas) belum ada.

## Perubahan

- File/path:
  - `apps/web/src/components/ui/organisms/leaderHub/` — `types.ts` (view-model, belum kontrak bersama), `LeaderHubHeader.tsx`, `LeaderSummaryStatGrid.tsx`, `SdlcPipelineTable.tsx`, `OpenBlockersPanel.tsx`, `TeamLoadPanel.tsx`, `LeaderHubSummaryView.tsx` (state memuat/kosong/gagal/akses ditolak), `index.ts`.
  - `apps/web/src/components/ui/organisms/leaderHub/__fixtures__/leaderHubSummary.fixture.ts` — data contoh berlabel FIXTURE, hanya untuk galeri dan unit test.
  - `apps/web/src/components/ui/organisms/leaderHub/__tests__/LeaderHubSummaryView.test.tsx`.
  - `apps/web/src/pages/gallery/LeaderHubSummaryGalleryDemo.tsx` dan satu Section baru di `apps/web/src/pages/ComponentGalleryPage.tsx`.
- Bukan scope: `LeaderHubPage.tsx`, `features/leader/*`, route/menu baru, API, kontrak `@qlick/contracts`, migrasi. Pekerjaan LEADER-SDLC-HUB P1 "Aktivitas periode" (Codex, belum di-commit) tidak disentuh. Tab Beban kerja, Hambatan, Kualitas, dan Laporan berkala belum didesain. Aksi "Ping PIC" dan "Buka" hanya callback; di galeri tidak memanggil server.

## Acceptance Criteria → bukti

| AC                                                                                                                                                                                                   | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1: Komponen merender header, 6 kartu ringkasan, pipeline 9 tahap (selesai/berjalan/tertahan/belum dengan label aksesibel), hambatan terbuka, dan beban tim sesuai desain desktop 1440 dan HP 390. | E2, E1                          | `npm --prefix apps/web run test -- src/components/ui/organisms/leaderHub`; screenshot Playwright desktop, dark, dan HP 390 tanpa scroll horizontal halaman |
| AC-2: State memuat, kosong, gagal (dengan Coba lagi), dan akses ditolak tersedia.                                                                                                                    | E2                              | test yang sama                                                                                                                                             |
| AC-3: Data contoh hanya ada di file berlabel FIXTURE dan hanya diimpor oleh galeri/test; galeri menandai "Data contoh (fixture)".                                                                    | E1                              | `grep -rn leaderHubSummary.fixture apps/web/src`                                                                                                           |
| AC-4: Typecheck, lint, theme check, dan suite web tetap lulus.                                                                                                                                       | E2, E4                          | `npm run validate`, `npm --prefix apps/web run test`                                                                                                       |

## Approval Window

- Task / baseline: LEADER-HUB-RINGKASAN-SLICING @ cab5fffe
- Path yang diizinkan: path di bagian Perubahan dan kartu ini
- Urutan aksi: edit → test → commit → PR → auto-merge (tier 1)
- Masa berlaku dan stop condition: hanya slicing tab Ringkasan di Component Gallery; berhenti bila perlu mengubah `LeaderHubPage.tsx`, kontrak, API, atau file yang sedang dikerjakan Codex.

**Disetujui:** Owner melalui chat, 2026-11-17 — "ok slicing leader hub lebih dulu baru laporan saya" (setelah usulan slicing ke Component Gallery dengan data contoh, tanpa route).

## Hasil

- `npm --prefix apps/web run test -- src/components/ui/organisms/leaderHub` — exit 0 — 8/8 lulus.
- Suite web penuh (`vitest run`) — exit 0 — 146 file, 877 test lulus.
- `npm run validate` (docs, theme, lint, typecheck) — exit 0; tidak ada warning lint baru dari file slice ini.
- Screenshot Playwright pada harness lokal sementara (tidak di-commit): desktop 1440 terang dan gelap, HP 390 tanpa scroll horizontal halaman (tabel pipeline bergulir di dalam kartunya), serta state memuat/kosong/gagal/akses ditolak.
- PR dan tier: Tier 1 (tidak menyentuh path `quality/tier2-paths.txt`).
- Gap: belum terhubung ke API (sengaja); tab selain Ringkasan belum didesain; ilustrasi AccessRestricted dimuat dari CDN sehingga tidak tampil di harness offline.
