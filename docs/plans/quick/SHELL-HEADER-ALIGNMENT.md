# QUICK — SHELL-HEADER-ALIGNMENT

**Status:** Selesai
**WRA:** 4/16 — requirement jelas (0), satu lapisan frontend (1), tanpa data/otorisasi/kontrak/migrasi (0), dua konsumen shell (1), unit/build/theme serta UAT lokal (2), tanpa ketergantungan eksternal (0).

Status yang diizinkan: Draft, Menunggu persetujuan, Disetujui, Selesai, Blocked.

## Problem

- Gejala: garis pembatas di bawah logo Qlick Hub pada sidebar tidak sejajar dengan garis bawah header aplikasi.
- Bukti: `Header.tsx` memakai `h-20` (80px), sedangkan header brand `Sidebar.tsx` memakai `h-16` (64px). Test regresi yang menuntut `h-20` gagal sebelum perbaikan dan menangkap class `h-16`.
- Penyebab: terkonfirmasi. Kedua bagian shell memakai tinggi berbeda; bukan persoalan data, route, atau tema.

## Perubahan

- File/path: tinggi header brand Sidebar, test Sidebar, Quick Card, laporan evidence, dan `TODO.md`.
- Bukan scope: struktur logo, ukuran ikon/teks, Header utama, API, data, RBAC, kontrak, migrasi, atau perubahan fungsi navigasi.

## Acceptance Criteria → bukti

| AC                                                                                                  | Bukti yang dibutuhkan (E-level) | Perintah / observasi                             |
| --------------------------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| AC-1: Garis bawah header brand Sidebar sejajar dengan header aplikasi pada desktop.                 | E2, E4                          | Test class layout; UAT `localhost:3000` desktop. |
| AC-2: Sidebar seluler tetap memiliki header brand yang utuh tanpa overflow atau perubahan navigasi. | E2, E4                          | Test Sidebar; UAT 390×844.                       |
| AC-3: Tidak ada warna/komponen/kontrak baru dan strategi Light/Dark tetap berlaku.                  | E2, E4                          | typecheck, build, theme check, UAT Light/Dark.   |

## Approval Window

- Task / baseline: SHELL-HEADER-ALIGNMENT @ `f19bab6`
- Path yang diizinkan: `apps/web/src/components/layout/Sidebar.tsx`, test Sidebar, `docs/plans/quick/`, `docs/reports/`, dan `TODO.md`.
- Urutan aksi: test regresi → edit → test/typecheck/build/theme → UAT lokal baca-saja → quality review → commit → push ke PR #58. Tier diperiksa; tidak ada merge `main` atau deploy.
- Masa berlaku dan stop condition: hanya perubahan alignment 80px pada shell ini; berhenti bila perlu mengubah struktur Header, responsivitas lebih luas, token, API, data, atau RBAC.

**Disetujui:** Owner, 2026-10-27, pesan “ok” sebagai persetujuan rencana dan Approval Window.

## Hasil

- Test regresi awal — exit 1 — 1/7 gagal seperti diharapkan: header brand menerima `h-16`, bukan `h-20`.
- `npm --prefix apps/web run test -- --run src/components/layout/__tests__/Sidebar.test.tsx src/components/layout/__tests__/Header.test.tsx src/components/layout/__tests__/AppLayout.test.tsx` — exit 0 — 3 file, 18/18 test lulus. Ada peringatan `act(...)` Header yang telah ada; tidak terkait slice ini.
- `npm --prefix apps/web run typecheck`, `npm --prefix apps/web run build`, dan `npm run theme:check` — exit 0 — tanpa error build/tipe; theme coverage lulus.
- E4 2026-10-27 — UAT lokal `localhost:3000`: desktop 1440×960 menunjukkan garis di bawah logo Qlick Hub sejajar tepat dengan border Header; sidebar ponsel 390×844 terbuka utuh tanpa overflow. Tinggi `h-20` tidak memakai breakpoint sehingga kontrak yang sama diterapkan pada tablet.
- PR dan tier: [PR #58](https://github.com/oneilreyand/qlickhub/pull/58), dicatat setelah commit diperiksa.
- Gap: tidak ada dalam scope; pemeriksaan visual mode terang tidak diulang karena perubahan hanya tinggi, `theme:check` lulus, dan tidak ada class warna/theme yang diubah.
