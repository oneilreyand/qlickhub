# SIMPLE-UI-DELIVERY-FLOW — Tahap 4: Build Phase 01 — Shell sederhana

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1, AC-1.2
**Applicable Policy IDs:** AI-009, AI-013, AI-014, UI-001, UI-002, UI-003, UI-004, UI-005

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                            |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P1-FE-1, P1-FE-2, P1-FE-3, P1-FE-4, P1-QA-1                                                                                                                                                                                                                    |
| Branch / baseline commit         | `feat/simple-ui-p1-shell` dari `docs/doc-portal-close` @ `ffecc93` (PR #59)                                                                                                                                                                                    |
| File/path yang diizinkan         | `apps/web/src/components/layout/` (Sidebar, Header, AppLayout dan test-nya), molecule/atom yang sudah ada bila hanya dipakai ulang, `docs/features/SIMPLE-UI-DELIVERY-FLOW/` (phases, testing, README), `docs/reports/` (laporan P1), `TODO.md` (entri fitur)  |
| Urutan aksi yang diizinkan       | edit → test terarah → typecheck → build → `theme:check` → `docs:check` → UAT lokal → commit → push branch → PR ke `docs/doc-portal-close` (bukan `main`). **Tanpa merge, tanpa auto-merge, tanpa deploy.**                                                     |
| Pemeriksaan yang akan dijalankan | `npm --prefix apps/web run test -- --run src/components/layout`, `npm run typecheck:web`, `npm run build:web`, `npm run theme:check`, `npm run docs:check`; UAT Light/Dark di 1440, 1024, 768, 390 dibandingkan dengan `design/01-task-hub*.png`               |
| Risiko & recovery                | Shell dipakai semua halaman; recovery = revert commit di branch. Aturan visibilitas peran tidak boleh berubah (test Sidebar yang ada wajib lulus).                                                                                                             |
| Masa berlaku                     | Sampai PR P1 dibuat, atau berhenti bila perlu mengubah token, route, dependency, API, data, atau authorization                                                                                                                                                 |
| Pelaksana                        | Claude: seluruh edit, test, commit, push, dan PR. Test dan build dijalankan di salinan repo Linux di VM Mac (`$HOME/work/qlickhub`, `npm ci` terpisah) karena `node_modules` di folder repo khusus macOS; UAT lokal lewat browser di Mac pada `localhost:3000` |
| Disetujui                        | Owner (Reyand), 2026-10-27, pesan "setuju"                                                                                                                                                                                                                     |

## 2. Log perubahan

| Task    | File berubah                                                                         | Ringkasan                                                                                                                                                               | Commit          |
| ------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| P1-FE-1 | `components/layout/WorkspaceSwitcher.tsx` (baru), `Sidebar.tsx`, `Header.tsx`        | Pemilih workspace (daftar, Leader Hub, Buat Workspace) dipindah ke atas Sidebar; kartu dan badge "Workspace Aktif v2.0" dihapus                                         | lihat commit P1 |
| P1-FE-2 | `Sidebar.tsx`                                                                        | 4 menu utama di atas; Leader Hub, Panduan, Pengaturan Workspace, Galeri Komponen di bawah "Lainnya" dengan aturan peran yang sama; navigasi dan folder satu area scroll | lihat commit P1 |
| P1-FE-3 | `Header.tsx`, `lib/utils/sectionLabel.ts` (baru)                                     | Header 80px: tombol menu dan logo hanya di layar kecil, nama bagian aktif, tema, notifikasi, profil; navigasi tersembunyi dan logo ganda dihapus                        | lihat commit P1 |
| P1-FE-4 | —                                                                                    | Menu seluler memakai drawer yang ada; kini ikut memuat pemilih workspace                                                                                                | —               |
| Test    | `__tests__/Header.test.tsx`, `Sidebar.test.tsx`, `WorkspaceSwitcher.test.tsx` (baru) | Test navigasi tersembunyi diganti test perilaku nyata; test pemilih workspace dan pengelompokan menu                                                                    | lihat commit P1 |

## 3. Pemeriksaan yang dijalankan

Rincian dan kegagalan awal di [testing.md](../testing.md) §2. Ringkasan akhir:

| Perintah                                                                           | Environment                                  | Exit code | Pass / fail / skip            | AC                       |
| ---------------------------------------------------------------------------------- | -------------------------------------------- | --------- | ----------------------------- | ------------------------ |
| `npm --prefix apps/web run test -- --run`                                          | Salinan Linux VM                             | 0         | 717 / 0 / 0                   | AC-1.1, AC-1.2 + regresi |
| `npm run typecheck:web`, `npm run build:web`, `npm run theme:check`, eslint layout | Salinan Linux VM                             | 0         | pass                          | AC-1.1                   |
| UAT 1440, 1024, 768, 390; Light dan Dark                                           | Playwright Chromium di Mac, `localhost:3000` | —         | pass setelah perbaikan scroll | AC-1.1, AC-1.2           |

## 4. Deviasi dari rencana

| Deviasi                                                                      | Alasan                                                                                | Masih dalam scope? | Persetujuan baru? |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| UAT memakai browser Playwright, bukan browser bawaan Claude                  | Browser bawaan memblokir permintaan ke API `localhost:4000` (`ERR_BLOCKED_BY_CLIENT`) | Ya                 | Tidak             |
| Folder tetap hanya tampil di Task Hub, belum di semua halaman seperti desain | Mengubah perilaku folder di luar shell; dicatat untuk P2a                             | Ya                 | Tidak             |
| Tabel Task Hub terpotong di kiri pada 1440/1024                              | Sudah ada sebelum P1 (tabel bergeser horizontal); bukan bagian shell                  | Di luar P1         | Dicatat untuk P2a |

## 5. Hasil

- PR: [#60](https://github.com/oneilreyand/qlickhub/pull/60) dari `feat/simple-ui-p1-shell` ke `docs/doc-portal-close` (bukan `main`) — Tier 1 — tidak ada file Tier 2. Belum di-merge.
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
