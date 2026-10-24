# UI-WORKSPACE-REFRESH — Tahap 4: Build Phase 01 — Shell dan Theme Foundation

**Status:** Kandidat teruji dengan gap E4 lintas sesi
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1, AC-1.2
**Applicable Policy IDs:** AI-009, AI-013, AI-014, UI-001, UI-002, UI-003, UI-004, TEST-001

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                               |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | UI-WORKSPACE-REFRESH / P1                                                                                                                                                                         |
| Branch / baseline commit         | `docs/doc-portal-close` @ `9ea712f55ea7bb4e5df1acacaf6fa65b11b09676`                                                                                                                              |
| File/path yang diizinkan         | `apps/web/index.html`, `apps/web/src/lib/theme/`, `apps/web/src/index.css`, `apps/web/tailwind.config.js`, `apps/web/src/components/layout/`, dan tes terarahnya; Feature documentation dan TODO. |
| Urutan aksi yang diizinkan       | edit → UI/unit test → typecheck/build → docs check; tidak termasuk commit, push, PR, merge, atau deploy.                                                                                          |
| Pemeriksaan yang akan dijalankan | Vitest terarah, `typecheck`, `build`, `docs:check`, `docs:completeness`, diff check, dan audit browser bila sesi tersedia.                                                                        |
| Risiko & recovery                | Perubahan hanya presentasi/preferensi browser; revert file P1 mengembalikan perilaku tanpa data rollback.                                                                                         |
| Masa berlaku                     | Berakhir saat laporan P1 dikirim; tidak berlaku untuk P2–P4.                                                                                                                                      |
| Disetujui                        | User, 2026-10-23, pesan `ok kerjakan` setelah permintaan window P1.                                                                                                                               |

## 2. Log perubahan

| Task    | File berubah                                                                                   | Ringkasan                                                                                                                                                      | Commit       |
| ------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P1-FE-1 | `apps/web/index.html`, `src/lib/theme/ThemeContext.tsx`, `src/index.css`, `tailwind.config.js` | Bootstrap dan provider menyamakan fallback dark untuk storage invalid; Plus Jakarta Sans dihapus; token semantic canvas/surface/foreground/border ditambahkan. | Belum dibuat |
| P1-FE-2 | `AppLayout.tsx`, `Header.tsx`                                                                  | Shell menggunakan token semantic; nav dibatasi agar tidak memperlebar halaman; state aktif dan theme toggle mendapat semantik aksesibel.                       | Belum dibuat |
| P1-TEST | `ThemeContext.test.ts`, `Header.test.tsx`                                                      | Menambah test fallback, root theme application, dan pressed state toggle.                                                                                      | Belum dibuat |

## 3. Pemeriksaan yang dijalankan

| Perintah / observasi                                                                                                                                                                | Environment                 | Exit code | Pass / fail / skip / warn                                                                                                                                   | AC                 |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| `npm --prefix apps/web run test -- src/lib/theme/__tests__/ThemeContext.test.ts src/components/layout/__tests__/Header.test.tsx src/components/layout/__tests__/AppLayout.test.tsx` | local Vitest                | 0         | 14 / 0 / 0; warning React `act` existing pada Header tests                                                                                                  | AC-1.1, AC-1.2     |
| `npm --prefix apps/web run typecheck`                                                                                                                                               | local                       | 0         | pass                                                                                                                                                        | AC-1.1, AC-1.2     |
| `npm --prefix apps/web run build`                                                                                                                                                   | local Vite production build | 0         | pass                                                                                                                                                        | AC-1.1, AC-1.2     |
| `npm run lint`                                                                                                                                                                      | local repository lint       | 0         | 0 error, 15 warning existing di luar file P1; satu warning Fast Refresh tetap ada pada export hook `useTheme` yang sudah ada.                               | AC-1.1, AC-1.2     |
| `npm --prefix apps/web run lint`                                                                                                                                                    | local                       | 1         | Script tidak tersedia; digantikan `npm run lint` tingkat repository.                                                                                        | validation note    |
| `npm run docs:check` + `npm run docs:completeness` + `git diff --check`                                                                                                             | local                       | 0         | docs 10/10 pass; 0 gap baru; diff check pass                                                                                                                | documentation      |
| Browser lokal `http://localhost:3000/login?reason=idle_timeout`                                                                                                                     | local IAB                   | N/A       | Dark default tampak; sesi aplikasi telah timeout, sehingga Light dan route terautentikasi belum dapat diuji E4. Vite HMR websocket warning tampak pada IAB. | AC-1.1, AC-1.2 gap |

## 4. Deviasi dari rencana

| Deviasi                                                   | Alasan                                                                                     | Masih dalam scope? | Persetujuan baru?                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ | --------------------------------------------------------- |
| Audit E4 lintas tiga viewport dan dua tema tidak selesai. | Sesi lokal berakhir otomatis sebelum audit. Tidak menggunakan kredensial atau data buatan. | Ya                 | Tidak untuk catatan gap; sesi role diperlukan sebelum G5. |

## 5. Hasil

- Kandidat P1 lolos evidence E2 dan build, tetapi belum `Accepted` karena AC-1.1/AC-1.2 masih
  membutuhkan observasi E4 Light/Dark pada aplikasi terautentikasi dan viewport yang direncanakan.
- Tidak ada API, persistence, migration, authorization, atau mutation data.
- Lanjut ke [testing.md](../testing.md) setelah E4 tersedia; P2 memiliki window terpisah di [PHASE-02.md](PHASE-02.md).
