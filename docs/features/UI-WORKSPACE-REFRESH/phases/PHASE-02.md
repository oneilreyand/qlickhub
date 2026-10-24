# UI-WORKSPACE-REFRESH — Tahap 4: Build Phase 02 — Task Hub dan Detail

**Status:** Kandidat teruji E2; E4 runtime masih menunggu sesi lokal terautentikasi
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-2.1, AC-2.2
**Applicable Policy IDs:** AI-002, AI-003, AI-008, AI-009, AI-010, AI-013, AI-014, UI-001, UI-002, UI-003, UI-004, AUTH-001, AUTH-002, CONTRACT-001, DATA-001, TEST-001

## 1. Approval Window

| Item                       | Isi                                                                                                                                                                                                                                                   |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                    | UI-WORKSPACE-REFRESH / P2                                                                                                                                                                                                                             |
| Branch / baseline commit   | `docs/doc-portal-close` @ `9ea712f55ea7bb4e5df1acacaf6fa65b11b09676`; kandidat perubahan P1 lokal dipertahankan.                                                                                                                                      |
| Tujuan dan AC              | AC-2.1: filter Task Hub tetap saat Table/Jadwal Feature ditukar. AC-2.2: kontrol Task Hub dan detail tidak menutup konteks/aksi pada phone, tablet, atau desktop.                                                                                     |
| File/path yang diizinkan   | `apps/web/src/components/ui/templates/TaskHubDashboardTemplate.tsx`, `apps/web/src/components/ui/organisms/taskHub/TaskHubControlsBar.tsx`, helper/test P2 terarah di `apps/web/src/lib/utils/` atau path test terkait; folder Feature dan `TODO.md`. |
| Urutan aksi yang diizinkan | implementasi → Vitest terarah → typecheck/build/lint → docs check/completeness → audit diff/quality → E4 browser bila sesi tersedia. Commit, push, PR, merge, dan deploy tidak termasuk.                                                              |
| Risiko & recovery          | Query URL berisi filter presentasional non-sensitif saja. Revert berkas P2 memulihkan state lokal sebelumnya; tidak ada data, API, kontrak, atau rollback migrasi.                                                                                    |
| Masa berlaku               | Berakhir saat hasil P2 dilaporkan atau scope/path berubah.                                                                                                                                                                                            |
| Disetujui                  | User, 2026-10-24, pesan `setuju` setelah window P2 dipaparkan.                                                                                                                                                                                        |

## 2. Log perubahan

| Task    | File berubah                                               | Ringkasan                                                                                                                                                                                                                                          | Commit       |
| ------- | ---------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P2-FE-1 | `TaskHubDashboardTemplate.tsx`, `taskHubQueryState.ts`     | URL menjadi sumber state untuk filter search, status, keterlibatan, rentang tanggal, folder, preset tanggal, view, dan detail Task. Nilai deep-link invalid kembali ke default aman dan parameter rute lain dipertahankan.                         | Belum dibuat |
| P2-FE-2 | `TaskHubControlsBar.tsx`                                   | Control bar membungkus pada lebar tablet sebelum layout dua kolom aktif; toggle view/keterlibatan menyatakan `aria-pressed`. Drawer detail existing diaudit sebagai overlay fullscreen; tidak ada perubahan karena belum ada defect baru teramati. | Belum dibuat |
| P2-TEST | `taskHubQueryState.test.ts`, `TaskHubControlsBar.test.tsx` | Menguji filter tidak hilang saat view berubah, reset selektif, fallback deep-link invalid, serta state view aksesibel.                                                                                                                             | Belum dibuat |

## 3. Pemeriksaan yang dijalankan

| Perintah / observasi                                                                                                                                            | Environment                 | Exit code | Pass / fail / skip / warn                                                                                                               | AC                              |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `npm --prefix apps/web run test -- src/lib/utils/__tests__/taskHubQueryState.test.ts src/components/ui/organisms/taskHub/__tests__/TaskHubControlsBar.test.tsx` | local Vitest                | 0         | 6 / 0 / 0                                                                                                                               | AC-2.1; state aksesibel AC-2.2  |
| `npm --prefix apps/web run typecheck`                                                                                                                           | local TypeScript            | 0         | pass                                                                                                                                    | AC-2.1, AC-2.2                  |
| `npm --prefix apps/web run build`                                                                                                                               | local Vite production build | 0         | pass                                                                                                                                    | AC-2.1, AC-2.2                  |
| `npm run lint` (percobaan awal)                                                                                                                                 | local repository lint       | 1         | 4 error baru `no-unused-expressions` pada helper query; 15 warning existing di luar P2. Ternary expression diperbaiki, tidak diabaikan. | quality gate failure remediated |
| `npm run lint` (ulang)                                                                                                                                          | local repository lint       | 0         | 0 error; 15 warning existing di luar P2.                                                                                                | AC-2.1, AC-2.2                  |
| `npm run docs:check` + `npm run docs:completeness` + `git diff --check`                                                                                         | local documentation / git   | 0         | docs 10/10 pass; 91 baseline gap, 0 gap baru/selesai; diff check pass.                                                                  | documentation                   |
| Browser lokal terautentikasi `/work?tab=tasks` pada 390×844, 768×1024, 1440×900 dalam Light/Dark                                                                | local runtime               | pending   | sesi IAB tidak dapat dipakai untuk autentikasi; tidak diganti data contoh                                                               | AC-2.1, AC-2.2 gap E4           |

## 4. Deviasi dari rencana

| Deviasi                                   | Alasan                                                                            | Masih dalam scope? | Persetujuan baru?                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------- |
| E4 browser lintas viewport belum selesai. | Sesi terautentikasi lokal belum tersedia pada browser yang dapat digunakan agent. | Ya                 | Tidak untuk mencatat gap; diperlukan sebelum penerimaan G5. |

## 5. Quality review awal

| Dimensi                     | Metode / scope                                                                     | Temuan                                                                                                                                              | Status   |
| --------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Reuse / DRY                 | Katalog UI dan `TaskHubControlsBar`/`DateRangePicker`/`Drawer` existing diperiksa. | Tidak ada komponen baru untuk presentation; helper query mencegah serialisasi URL tersebar di template.                                             | Kandidat |
| Duplikasi / tumpang tindih  | Pencarian `useSearchParams`, Task Hub, dan helper filter.                          | Tidak ada state filter paralel yang tersisa di template untuk field P2.                                                                             | Kandidat |
| Kode usang / tidak terpakai | Diff, import, typecheck, lint, dan `git diff --check`.                             | Tidak ada import/export P2 tidak terpakai; satu lint failure P2 diperbaiki lalu lint 0 error.                                                       | Kandidat |
| Boundary / best practice    | Kontrak, authorization, dan route inspected.                                       | Hanya state presentasi URL; tidak ada kalkulasi readiness, API, atau policy baru.                                                                   | Kandidat |
| Bukti regresi               | Vitest terarah, typecheck, build; E4 rencana.                                      | E2 tersedia; E4 masih gap.                                                                                                                          | Partial  |
| Performa                    | Output build production untuk Task Hub diperiksa.                                  | Chunk `TaskHubDashboardTemplate` 247.81 kB / 58.92 kB gzip; baseline sebelum P2 tidak tersedia, sehingga dampak runtime tetap unverified sampai E4. | Partial  |

## 6. Hasil sementara

- P2 memenuhi evidence E2 kandidat untuk filter lintas view dan kontrol aksesibel.
- Tidak ada API, persistence, migration, authorization, shared contract, atau mutation baru.
- P2 belum `Accepted`: E4 pada tiga viewport dan Light/Dark tetap diperlukan sebelum G5.
