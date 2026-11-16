# QUICK — TASKHUB-FILTER-RACE Filter Task Hub tidak hilang saat dua filter diubah berdekatan

**Status:** Disetujui
**WRA:** 2/16 — layer 1 (hook + template web), validasi 1 (hook test + CI)

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: di Task Hub Production, mengetik pencarian lalu langsung mengganti filter status membuang
  teks pencarian terakhir (contoh: `UJI F1` kembali menjadi `UJI`, atau pencarian hilang). Ini
  melanggar AC-2.1 UI-WORKSPACE-REFRESH (filter tidak reset kecuali oleh pengguna).
- Bukti: smoke Production 2026-11-16 sebagai Owner, URL berubah dari `?tab=tasks&q=UJI+F1` ke
  `?tab=tasks&q=UJI&status=todo`; test sementara pada `useSearchParams` React Router 7.18.2 memberi
  `?tab=tasks&status=todo` alih-alih `?tab=tasks&q=UJI+F1&status=todo`.
- Penyebab: updater fungsional `setSearchParams` React Router menerima params dari render terakhir
  (`react-router/dist/development/chunk-*.mjs`, `useSearchParams`), sehingga dua update sebelum
  render ulang saling menimpa. `TaskHubDashboardTemplate.updateTaskHubQuery` memakai updater itu.

## Perubahan

- File/path: `apps/web/src/lib/hooks/usePatchSearchParams.ts` (baru),
  `apps/web/src/lib/hooks/__tests__/usePatchSearchParams.test.tsx` (baru),
  `apps/web/src/components/ui/templates/TaskHubDashboardTemplate.tsx`.
- Bukan scope: halaman lain yang memakai `useSearchParams`, struktur query Task Hub, API.

## Acceptance Criteria → bukti

| AC                                                                                    | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                   |
| ------------------------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------- |
| AC-1 Dua patch sebelum render ulang (pencarian lalu status) keduanya tersimpan di URL | E2                              | `npx vitest run src/lib/hooks/__tests__/usePatchSearchParams.test.tsx` |
| AC-2 Patch setelah render ulang tetap dibangun dari URL terbaru                       | E2                              | test yang sama                                                         |
| AC-3 Task Hub memakai hook baru tanpa perubahan perilaku lain                         | E2                              | suite web penuh + typecheck                                            |

## Approval Window

- Task / baseline: TASKHUB-FILTER-RACE @ `84305d3e`
- Path yang diizinkan: tiga file di atas, kartu ini, `docs/features/UI-WORKSPACE-REFRESH/testing.md`
- Urutan aksi: edit → test → commit → PR → auto-merge (tier 1)
- Masa berlaku dan stop condition: sampai PR ini merge, paling lama 2026-11-23; berhenti bila perlu
  mengubah struktur query atau router.

**Disetujui:** Owner (Reyand), 2026-11-16, chat — "jalankan yang belum selesai" (uji UI-WORKSPACE-REFRESH di Production dan tindak lanjut temuannya)

## Hasil

- Hook test 2/2 lulus; test pembanding pada `useSearchParams` lama gagal dengan hasil yang
  ditunjukkan di atas. Suite web, typecheck, lint dan validate dicatat pada deskripsi PR.
- PR dan tier: Tier 1 (tidak ada path Tier 2).
- Gap: belum diverifikasi ulang di Production setelah deploy.
