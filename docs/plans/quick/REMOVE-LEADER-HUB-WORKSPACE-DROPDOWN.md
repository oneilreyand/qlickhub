# QUICK — REMOVE-LEADER-HUB-WORKSPACE-DROPDOWN Hapus Executive Leader Hub dari Dropdown Workspace

**Status:** Selesai
**WRA:** 2/16 — requirement jelas (0), satu lapisan frontend (1), tanpa data/otorisasi/kontrak/migrasi (0), komponen dropdown switcher (1), unit/layout test dan build bersih (0), tanpa ketergantungan eksternal (0).

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: Menu shortcut "Executive Leader Hub" di dalam dropdown switcher workspace tidak lagi diinginkan karena redundan dengan menu navigasi utama Leader Hub di sidebar.
- Bukti: `apps/web/src/components/layout/WorkspaceSwitcher.tsx` merender opsi `Executive Leader Hub` dengan ikon `Crown` untuk role owner dan admin.
- Penyebab: Terkonfirmasi. Shortcut navigasi multi-workspace ditempatkan di dropdown pemilih workspace pada rilis awal, kini diputuskan dihapus dari dropdown workspace.

## Perubahan

- File/path: `apps/web/src/components/layout/WorkspaceSwitcher.tsx`, `apps/web/src/components/layout/__tests__/WorkspaceSwitcher.test.tsx`, `docs/plans/quick/REMOVE-LEADER-HUB-WORKSPACE-DROPDOWN.md`.
- Bukan scope: Halaman `/leader-hub`, navigasi Leader Hub di sidebar utama, backend Leader API, kontrak, data, atau skema migrasi.

## Acceptance Criteria → bukti

| AC                                                                                                          | Bukti yang dibutuhkan (E-level) | Perintah / observasi                                                                    |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------------------- |
| AC-1: Menu "Executive Leader Hub" tidak lagi dirender di dropdown Workspace Switcher untuk role apa pun.     | E2                              | `npm --prefix apps/web run test -- src/components/layout/__tests__/WorkspaceSwitcher.test.tsx` |
| AC-2: Suite tes layout tetap lulus dan build web sukses tanpa error tipe atau lint.                         | E2, E4                          | `npm --prefix apps/web run test -- src/components/layout/`, `npm --prefix apps/web run typecheck`, `npm --prefix apps/web run build` |

## Approval Window

- Task / baseline: REMOVE-LEADER-HUB-WORKSPACE-DROPDOWN @ 86638592
- Path yang diizinkan: `apps/web/src/components/layout/WorkspaceSwitcher.tsx`, `apps/web/src/components/layout/__tests__/WorkspaceSwitcher.test.tsx`, `docs/plans/quick/REMOVE-LEADER-HUB-WORKSPACE-DROPDOWN.md`
- Urutan aksi: edit → test → commit → PR → auto-merge (tier 1)
- Masa berlaku dan stop condition: hanya penghapusan opsi Executive Leader Hub dari dropdown switcher; berhenti bila perlu mengubah navigasi halaman `/leader-hub` atau data backend.

**Disetujui:** Owner, 2026-11-09, instruksi "hapus menu yang executive leader hub yang ada di menu dropdown di work space" dan "ko jalankan".

## Hasil

- Unit test: `WorkspaceSwitcher.test.tsx` — exit 0 — 3/3 lulus.
- Layout tests: `AppLayout.test.tsx`, `Header.test.tsx`, `Sidebar.test.tsx`, `WorkspaceSwitcher.test.tsx` — exit 0 — 25/25 lulus.
- Typecheck & Build: `tsc --noEmit` dan `vite build` — exit 0 — 1.774 modul transformed.
- PR dan tier: Tier 1 (tidak menyentuh path `quality/tier2-paths.txt`).
- Gap: Tidak ada.
