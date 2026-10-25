## Task

UI-WORKSPACE-REFRESH / P3.2 — audit Light/Dark pada komponen bersama.

## Outcome

Toast global, tooltip grafik Ikhtisar, dan hero login kini mempunyai surface/foreground yang
berpasangan untuk Light dan Dark. Gate tema sekarang memeriksa setiap `className` statis yang
memakai charcoal application surface, sehingga pasangan tema pada elemen lain dalam berkas tidak
lagi dapat menyamarkan defect lokal. `EvidencePreviewModal` mendokumentasikan stage gelap sebagai
pengecualian media yang dibatasi.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** tahap 4 Build, Full path;
  [UI-WORKSPACE-REFRESH](../features/UI-WORKSPACE-REFRESH/README.md), Phase 3.2.
- **Work Readiness Assessment:** 7/16, `Ready`; UI/dokumentasi/test lintas modul tanpa data,
  kontrak, otorisasi, migration, atau dependency baru.
- **User plan approval:** Owner menyetujui Window P3.2 lewat pesan `setuju`, 2026-10-25.
- **Approval Window:** baseline `6009144`, scope atom/molecule, shell/layout, modal/drawer, dan
  autentikasi; perubahan terbatas pada Light/Dark treatment, test, dan dokumentasi. Tidak
  mencakup endpoint, kontrak, database, RBAC, migration, dependency, merge, atau deploy.
- **Agent capability and access:** executor dapat mengaudit source, menjalankan static/component
  checks dan build. Owner login sebagai QA pada aplikasi lokal; browser Chrome membuktikan desktop
  Light/Dark terhadap data persisted. Chrome viewport override kemudian membuktikan Task Hub
  Jadwal pada ukuran tablet dan ponsel tanpa mengubah data aplikasi; viewport dikembalikan ke
  ukuran normal dan mode dikembalikan ke Light.

| Acceptance Criterion                       | Required / achieved evidence level   | Primary evidence and environment                                                              | Verification status                                        |
| ------------------------------------------ | ------------------------------------ | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| AC-1.2: strategi Light/Dark visual UI      | E2/E4 / E2 + E4 desktop/tablet/phone | `theme:check`; checker unit 4/4; tests Snackbar/Login/Overview 18/18; browser QA              | Accepted for audited scope; toast/tooltip visual follow-up |
| AC-3.2: Task Hub dapat dipakai di dua tema | E2/E4 / E2 + E4 desktop/tablet/phone | `theme:check` class-level guard; Daftar/Kanban/Jadwal serta Ringkasan; Jadwal responsif       | Accepted                                                   |
| Tidak ada exception UI biasa               | E2 / E2                              | Audit source Modal/Drawer/layout/auth; `EvidencePreviewModal` diberi alasan `invariant-media` | Accepted                                                   |

- **Evidence outcomes:** focused component tests, theme check/test, docs governance, completeness,
  web typecheck/build, lint, dan diff check lulus. Browser QA desktop memperlihatkan Tugas Saya,
  Task Hub Daftar/Kanban/Jadwal, dan Ringkasan pada kedua tema dengan data QA persisted; Jadwal
  Light memakai surface putih dan foreground gelap. QA viewport Task Hub Jadwal menampilkan menu
  seluler, filter yang membungkus rapi, dan kartu yang terbaca pada 768x1024 serta 390x844 di
  kedua tema. `npm run validate` berhenti di `docsys:test`:
  25/29 lulus, empat portal test timeout karena portal tidak mulai dalam lima detik. Modul docsys
  tidak berubah; test tidak di-skip atau dimodifikasi.
- **Change Impact Map:** molecule `Snackbar` → seluruh notifikasi; organism
  `OverviewStoreDashboard` → tooltip grafik Ikhtisar; page `LoginPage` → hero desktop; theme gate
  → seluruh komponen/halaman produksi. Modal/drawer/layout/auth lain diaudit dan sudah memakai
  pasangan tema. Tidak ada backend, shared contract, persistence, authorization, migration,
  release, atau operations impact.
- **Decision Snapshot:** memperbaiki class lokal dan memperketat checker dipilih dibanding hanya
  mengandalkan keberadaan `dark:` di tingkat berkas. Pendekatan ini menutup penyebab Schedule
  Light yang pernah lolos, tanpa migrasi palette massal. Panggung gelap hanya dipertahankan untuk
  media evidence, dengan alasan eksplisit; rollback adalah revert commit tanpa pemulihan data.
- **Agent handoff and independent verification:** executor Codex; CI/PR menjadi verifier
  independen untuk gate deterministik. Status sebelum CI: `Accepted with gaps` hanya untuk
  visual toast/tooltip dan kegagalan portal test yang tidak terkait.
- **Quality review:** komponen memakai atom/token yang ada; tidak ada dependency atau palette
  paralel. Tidak ditemukan duplikasi perhitungan bisnis, endpoint, atau state produksi. Guard
  memperkecil celah test sebelumnya dan cakupan regresi mencakup 4 checker test + 18 component
  tests. Tidak ada kode usang baru. Runtime browser dan portal test adalah follow-up yang diblokir.
- **Cross-layer quality gates:** Light/Dark source pair dan keyboard semantics komponen eksisting
  diaudit; Snackbar tetap memakai tombol berlabel `Tutup notifikasi`. Browser evidence tersedia
  untuk Light/Dark pada desktop, tablet, dan phone untuk alur Task Hub; viewport sementara telah
  dikembalikan ke ukuran normal. Visual toast dan tooltip belum dipicu dari data QA aktif karena
  menghindari mutasi workflow saat run ini.
  Tidak ada data access, relasi, query, performa lintas FE/BE, atau keputusan AI berubah.

## Source of truth and impact

- **Applicable SSoT:** [UI Atomic Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md),
  [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md), dan
  [ADR-034](../adr/ADR-034-UI-THEME-CONTRACT-AND-COVERAGE-GATE.md).
- **Policy IDs:** `UI-001`, `UI-002`, `UI-003`, `UI-004`, `UI-005`, `SDLC-001`, `SDLC-002`,
  `AI-002`, `AI-009`, `AI-010`.
- **Data/interface impact:** None.
- **Authorization impact:** None.
- **Migration risk:** None.

## Changed files

- `apps/web/src/components/ui/molecules/Snackbar.tsx` — toast Light/Dark pair untuk surface,
  status code, dan close state.
- `apps/web/src/components/ui/organisms/OverviewStoreDashboard.tsx` — tooltip grafik Light/Dark
  pair yang dapat dibaca pada kedua tema.
- `apps/web/src/pages/LoginPage.tsx` — hero menggunakan token `bg-sidebar` yang disetujui.
- `apps/web/src/components/ui/organisms/EvidencePreviewModal.tsx` — alasan invariant media stage.
- `scripts/checkTheme.mjs` dan test — guard class-level untuk charcoal app surface.
- Focused tests, Feature card/phase record, TODO, dan report ini — evidence P3.2.

## Validation

- `npm --prefix apps/web test -- --run ...GlobalSnackbarHost ...OverviewStoreDashboard ...LoginPage`
  — passed: 3 files, 18/18 tests; 0 failed/skipped.
- `npm run theme:test` — passed: 4/4; 0 failed/skipped.
- `npm run theme:check` — passed.
- `npm run docs:check` — passed: 10/10; 0 failed/skipped.
- `npm run docs:completeness` — passed: 91 pre-existing baseline gaps; 0 new, 0 fixed.
- `npm --prefix apps/web run typecheck` and `build` — passed.
- `npm run lint` — passed: 0 errors, 15 pre-existing warnings outside P3.2 scope.
- `git diff --check` — passed.
- `npm run validate` — failed only at `docsys:test`: 25/29 passed, 4 portal startup timeouts.
- Browser Chrome, authenticated QA — desktop Light/Dark passed untuk Tugas Saya, Task Hub
  Daftar/Kanban/Jadwal, dan Ringkasan memakai data persisted; mode dikembalikan ke Light.
- Browser Chrome, authenticated QA — Task Hub Jadwal passed pada 768x1024 (tablet) dan 390x844
  (phone), masing-masing pada Light/Dark; menu seluler, kontrol filter, tab view, dan kartu
  Feature tidak overflow atau bertumpuk. Viewport dikembalikan ke default dan mode ke Light.
- `GET /v1/health` dengan Origin `http://localhost:3000` — passed `200`; PostgreSQL `connected`
  dan CORS mengembalikan origin serta credentials yang diizinkan.

## Risks or follow-up

- Verifikasi toast dan Overview tooltip secara visual dalam run yang tidak memutasi workflow QA.
- Investigate the independent docsys portal startup failures; they are outside changed paths.

## Human decision summary

The shared surfaces that could repeat the Light-mode failure are now paired and the validation
guard detects a local charcoal surface even when the surrounding module already uses Dark classes.
Desktop, tablet, dan phone E4 browser evidence kini tersedia untuk Task Hub. Feature lebih luas
tetap in progress sampai P4, validasi visual toast/tooltip, dan independent CI evidence selesai.

## TODO update

- `UI-WORKSPACE-REFRESH` → In progress.
