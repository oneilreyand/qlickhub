## Task

SHELL-HEADER-ALIGNMENT — sejajarkan divider header brand Qlick Hub dengan Header aplikasi.

## Outcome

Header brand Sidebar sekarang memakai `h-20` (80px), sama dengan Header aplikasi. Garis divider horizontal di kedua bagian shell kini berada pada tinggi yang sama pada desktop; sidebar tetap utuh saat dibuka pada viewport ponsel.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** Quick path; [Quick Card](../plans/quick/SHELL-HEADER-ALIGNMENT.md) selesai (`SDLC-002`).
- **Work Readiness Assessment:** 4/16, `Ready`; satu perubahan frontend lokal dengan unit test, static checks, dan UAT lokal, tanpa data/otorisasi/kontrak/migrasi.
- **User plan approval:** Owner menyetujui rencana dan Approval Window melalui pesan “ok” pada 2026-10-27.
- **Approval Window / high-risk decisions:** `SHELL-HEADER-ALIGNMENT @ f19bab6`; path Sidebar/test/Quick Card/TODO/laporan; test regresi → edit → test/build/theme → UAT baca-saja → review → commit/push PR #58; tidak ada merge `main`, deploy, atau mutasi data. Jendela selesai tanpa stop condition.
- **Agent capability and access:** Executor dapat membaca shell dan test, menjalankan build lokal, serta melihat UAT terautentikasi sebelum tab IAB ditutup. Tidak ada akses database atau form mutasi yang digunakan.
- **AC-to-evidence matrix:**

| Acceptance Criterion                                             | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                     | Verification status           |
| ---------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------- | ----------------------------- |
| Divider brand Sidebar sejajar dengan Header aplikasi di desktop. | E2 / E4                                    | Test `h-20`; UAT `localhost:3000` pada 1440×960.                     | Accepted                      |
| Header brand tetap utuh di sidebar seluler.                      | E2 / E4                                    | Test Sidebar; UAT sidebar terbuka pada 390×844.                      | Accepted                      |
| Tidak ada warna/kontrak baru dan Light/Dark tetap tercakup.      | E2 / E2                                    | `theme:check`, typecheck, build; tidak ada class warna/theme diubah. | Accepted with static evidence |

- **Evidence outcomes:** Test awal gagal secara terkontrol (1/7) karena `h-16`, lalu sesudah perbaikan test shell 3/3 file dan 18/18 lulus. Header test mengeluarkan warning React `act(...)` yang telah ada dan tidak ditambah oleh slice ini. Typecheck, build, theme, docs, completeness, `sdlc:check`, dan `git diff --check` lulus. UAT tidak menjalankan submit atau mutasi data.
- **Change Impact Map:** Function/UI: tinggi satu header brand Sidebar dan divider visual. Module: `Sidebar`; consumer: shell desktop dan drawer sidebar mobile. Contract/data/authorization/release/operations: none.
- **Decision Snapshot:** Opsi A, mengecilkan Header utama ke 64px, berisiko mengubah tata letak global. Opsi B (dipilih), menaikkan header brand Sidebar ke 80px sesuai Header yang sudah menjadi acuan shell. Opsi B menyelesaikan mismatch tanpa mengubah struktur/logo/header utama. Rollback satu class; tanpa data recovery.
- **Agent handoff and independent verification:** Baseline `f19bab6`; executor menjalankan bukti primer E2/E4. Tidak ada handoff verifier tambahan; hasil berdasarkan test dan UAT yang dapat diulang.
- **Quality review:** Reuse/DRY accepted: memakai tinggi shell yang sudah ada (`h-20`), tidak menambah token atau komponen. Duplicate/overlap none found. Obsolete/unused resolved: komentar `h-16` diperbarui agar sesuai kontrak aktual. Boundary/best practice accepted: tidak ada data/state/API. Regression evidence accepted: test gagal sebelum fix lalu 18/18 setelah fix, typecheck/build/theme dan UAT.
- **Cross-layer quality gates:** Atomic decomposition N/A: tidak ada responsibility baru, hanya ukuran pada layout shell yang ada. Responsif: `h-20` tanpa prefix breakpoint berlaku pada ponsel/tablet/desktop; UAT menunjukkan 390×844 dan 1440×960, sementara test mengunci class yang sama lintas viewport. Data/performance/AI gate N/A.

## Source of truth and impact

- **Applicable SSoT:** [UI Atomic Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md) dan [Agent Development Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `UI-001`, `UI-003`, `UI-004`, `UI-005`, `SDLC-001`, `SDLC-002`, `DOC-004`.
- **Data/interface impact:** None.
- **Authorization impact:** None.
- **Migration risk:** None.

## Changed files

- `apps/web/src/components/layout/Sidebar.tsx` — menyamakan tinggi header brand menjadi 80px.
- `apps/web/src/components/layout/__tests__/Sidebar.test.tsx` — regresi alignment tinggi shell.
- `docs/plans/quick/SHELL-HEADER-ALIGNMENT.md`, `TODO.md`, dan laporan ini — approval, evidence, dan traceability.

## Validation

- `npm --prefix apps/web run test -- --run src/components/layout/__tests__/Sidebar.test.tsx` (sebelum fix) — exit 1; 1/7 gagal karena class `h-16`.
- `npm --prefix apps/web run test -- --run src/components/layout/__tests__/Sidebar.test.tsx src/components/layout/__tests__/Header.test.tsx src/components/layout/__tests__/AppLayout.test.tsx` — exit 0; 3/3 file, 18/18 test, 0 failed/skipped; warning `act(...)` Header existing.
- `npm --prefix apps/web run typecheck` — exit 0.
- `npm --prefix apps/web run build` — exit 0; Vite production build sukses, tanpa error/warning baru yang perlu tindak lanjut.
- `npm run theme:check` — exit 0; theme coverage passed.
- `npm run docs:check` — exit 0; 10/10 test lulus, 0 gagal/skipped; Documentation governance passed.
- `npm run docs:completeness` — exit 0; 91 gap baseline, 0 gap baru, 0 gap selesai.
- `npm run sdlc:check` — exit 0; skipped karena tidak ada baseline pembanding.
- `git diff --check` — exit 0.
- `node scripts/checkTier.mjs HEAD~1 HEAD` — exit 0; Tier 1, tidak ada path Tier 2; commit `e6f9324` dipush ke [PR #58](https://github.com/oneilreyand/qlickhub/pull/58).
- UAT PO `localhost:3000` — desktop 1440×960 dan mobile 390×844 accepted; tanpa submit/mutasi data.

## Risks or follow-up

Tidak ada risiko data atau migrasi. Warning `act(...)` pada Header test sudah ada sebelum slice ini dan tidak diubah; dapat ditangani sebagai pekerjaan test hygiene terpisah.

## Human decision summary

Owner menyetujui penyamaan tinggi header Sidebar terhadap Header yang sudah ada, bukan perubahan ukuran Header utama. Perbaikan visual bersifat lokal, dapat dibalik, dan tidak memengaruhi alur kerja atau data.

## TODO update

- `UI-WORKSPACE-REFRESH` → In progress; P3.6 selesai, sementara AC hard refresh/filter/detail drawer tetap terbuka.
