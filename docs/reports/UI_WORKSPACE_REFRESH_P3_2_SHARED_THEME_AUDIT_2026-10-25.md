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
  checks dan build. Kedua service lokal tidak tersedia saat runtime check (`curl` ke port 3000 dan
  4000 mengembalikan `000`), sehingga browser terautentikasi dan viewport E4 tidak dapat dijalankan.

| Acceptance Criterion                       | Required / achieved evidence level | Primary evidence and environment                                                              | Verification status                                  |
| ------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| AC-1.2: strategi Light/Dark visual UI      | E2/E4 / E2                         | `theme:check`; checker unit 4/4; tests Snackbar/Login/Overview 18/18; web typecheck/build     | Accepted with gaps: runtime Light/Dark E4 diperlukan |
| AC-3.2: Task Hub dapat dipakai di dua tema | E2/E4 / E2                         | `theme:check` class-level guard; Overview tooltip regression treatment dan component suite    | Accepted with gaps: runtime E4 diperlukan            |
| Tidak ada exception UI biasa               | E2 / E2                            | Audit source Modal/Drawer/layout/auth; `EvidencePreviewModal` diberi alasan `invariant-media` | Accepted                                             |

- **Evidence outcomes:** focused component tests, theme check/test, docs governance, completeness,
  web typecheck/build, lint, dan diff check lulus. `npm run validate` berhenti di `docsys:test`:
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
  independen untuk gate deterministik. Status sebelum CI: `Accepted with gaps` karena local runtime
  dan viewport QA tidak tersedia.
- **Quality review:** komponen memakai atom/token yang ada; tidak ada dependency atau palette
  paralel. Tidak ditemukan duplikasi perhitungan bisnis, endpoint, atau state produksi. Guard
  memperkecil celah test sebelumnya dan cakupan regresi mencakup 4 checker test + 18 component
  tests. Tidak ada kode usang baru. Runtime browser dan portal test adalah follow-up yang diblokir.
- **Cross-layer quality gates:** Light/Dark source pair dan keyboard semantics komponen eksisting
  diaudit; Snackbar tetap memakai tombol berlabel `Tutup notifikasi`. Phone/tablet/desktop browser
  evidence tidak dapat dibuat karena server lokal berhenti. Tidak ada data access, relasi, query,
  performa lintas FE/BE, atau keputusan AI berubah.

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
- `curl http://localhost:3000/login` and `curl http://localhost:4000/v1/health` — unavailable
  (`000`), so no browser runtime/viewport claim is made.

## Risks or follow-up

- Start frontend and backend, then perform authenticated Light/Dark browser checks at phone,
  tablet, and desktop before G5. Verify toast and Overview tooltip visually as part of that run.
- Investigate the independent docsys portal startup failures; they are outside changed paths.

## Human decision summary

The shared surfaces that could repeat the Light-mode failure are now paired and the validation
guard detects a local charcoal surface even when the surrounding module already uses Dark classes.
The wider feature remains in progress: browser E4 and independent CI evidence are still required.

## TODO update

- `UI-WORKSPACE-REFRESH` → In progress.
