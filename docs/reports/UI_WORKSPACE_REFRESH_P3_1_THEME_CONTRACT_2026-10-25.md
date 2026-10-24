## Task

UI-WORKSPACE-REFRESH / P3.1 — kontrak Light/Dark wajib dan perbaikan Jadwal pada mode Light.

## Outcome

Task Hub Schedule kini memakai surface terang dan teks gelap pada mode Light, serta mempertahankan
surface dark pada mode Dark. `npm run theme:check` kini mengaudit semua `.tsx` produksi di
`apps/web/src/components` dan `apps/web/src/pages`; command tersebut masuk ke `npm run validate`.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** tahap 4 Build, Full path;
  [UI-WORKSPACE-REFRESH](../features/UI-WORKSPACE-REFRESH/README.md), Phase 3.1.
- **Work Readiness Assessment:** 7/16, `Ready after split`; perubahan frontend/dokumentasi lintas
  modul, tanpa data, kontrak, otorisasi, atau dependency baru.
- **User plan approval:** Owner menyetujui Window P3.1 lewat pesan `setuju` pada 2026-10-25.
- **Approval Window:** baseline `5165544`, scope Task Hub Schedule, kontrak/gate tema, layar
  password, test, dokumentasi, commit, dan push pada branch non-protected; berlaku sampai
  2026-11-01. Tidak mencakup merge/deploy/backend/data/RBAC.
- **Agent capability and access:** executor dapat membaca SSoT, mengubah path yang disetujui,
  menjalankan test/build/lint dan browser lokal terautentikasi. Browser automation tidak
  memberikan bukti viewport phone/tablet yang dapat diandalkan pada run ini.

| Acceptance Criterion                             | Required / achieved evidence level | Primary evidence and environment                                                                                                              | Verification status                             |
| ------------------------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| AC-1.2: strategi Light/Dark pada visual UI       | E2/E4 / E2 + desktop E4            | `npm run theme:check`; `npm run theme:test` 3/3; browser lokal `http://localhost:3000/work?tab=tasks&view=timeline`                           | Accepted with gaps: phone/tablet masih perlu E4 |
| AC-3.2: Jadwal tetap dapat dipakai di kedua tema | E2/E4 / E2 + desktop E4            | `TaskHubViews.test.tsx` 3/3; Light background `rgb(255,255,255)`/foreground `rgb(28,25,23)`; Dark background `rgb(21,26,32)`/foreground putih | Accepted with gaps: phone/tablet masih perlu E4 |
| Gate regresi tema                                | E2 / E2                            | `npm run theme:check` pass pada seluruh source scope; `npm run validate` menjalankan gate                                                     | Accepted                                        |

- **Evidence outcomes:** theme check, theme test, focused web tests, docs check, completeness,
  typecheck, build, lint, dan diff check lulus. `npm run validate` berhenti di
  `docsys:test`: 25/29 lulus, empat portal test gagal karena server portal tidak mulai dalam 5
  detik. Modul portal tidak berubah dalam P3.1; kegagalan dicatat, tidak di-skip atau diubah.
- **Change Impact Map:** Module/Feature change. `TaskHubSchedule` dan password pages berubah
  presentasi; `checkTheme` dan `package.json` menambah gate; UI SSoT/registry/ADR/Feature docs
  menjelaskan policy. Backend, shared contract, persistence, authorization, migration, release,
  dan operations tidak terdampak.
- **Decision Snapshot:** checker + remediation bertahap dipilih atas audit manual saja (tidak
  mencegah regresi) dan konversi massal palette (berisiko mengubah semantik). Invariant media
  diberi pengecualian beralasan; rollback adalah revert commit tanpa pemulihan data.
- **Agent handoff and independent verification:** executor adalah Codex; CI pada PR menjadi
  verifier independen untuk gate deterministik. Status sebelum CI: `Accepted with gaps` untuk
  browser viewport dan kegagalan portal test yang tidak terkait.
- **Quality review:** reuse/DRY menggunakan ThemeProvider, token, dan atom yang ada; tidak ada
  dependency/palette paralel. Tidak ada endpoint/state bisnis duplikat atau kode usang yang
  dihasilkan. Exception media hanya di `MediaLightboxModal` dan diberi alasan. Regression coverage
  mencakup checker 3/3, Schedule 3/3, ResetPassword 3/3, typecheck/build; viewport phone/tablet
  dan CI tetap follow-up.
- **Cross-layer quality gates:** desktop Light/Dark Task Hub diamati dan switch tema memiliki label
  aksesibel. Phone/tablet tidak dapat dibuktikan pada automation browser ini; status tetap
  unverified. Tidak ada relasi database, query, atau teknologi AI yang berubah.

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

- `apps/web/src/components/ui/organisms/taskHub/TaskHubSchedule.tsx` — paired Light/Dark schedule
  treatment.
- `apps/web/src/pages/ForgotPasswordPage.tsx` and `ResetPasswordPage.tsx` — paired theme treatment.
- `scripts/checkTheme.mjs` and test — production source coverage gate.
- `package.json` — validation integration.
- UI SSoT, policy registry, ADR, Feature, TODO, and this report — approved policy/evidence record.

## Validation

- `npm run theme:check` — passed.
- `npm run theme:test` — passed, 3/3; 0 failed/skipped.
- `npm --prefix apps/web run test -- ...TaskHubViews... ...ResetPasswordPage...` — passed, 6/6;
  0 failed/skipped.
- `npm run docs:check` — passed, 10/10; 0 failed/skipped.
- `npm run docs:completeness` — passed: 91 pre-existing baseline gaps, 0 new, 0 fixed.
- `npm --prefix apps/web run typecheck` and `build` — passed.
- `npm run lint` — passed: 0 errors, 15 pre-existing warnings outside P3.1 scope.
- `git diff --check` — passed.
- `npm run validate` — failed only at `docsys:test`: 25/29 passed, 4 portal startup timeouts.

## Risks or follow-up

- P3 remains in progress. Run desktop/tablet/phone E4 Light/Dark checks when reliable viewport
  automation or manual QA is available.
- Investigate the docsys portal startup failure separately; it is outside this Phase's code paths.

## Human decision summary

The reported Light-mode defect is fixed and a mandatory source gate now prevents visual modules
without a declared theme strategy from entering validation. The guard does not replace visual QA;
phone/tablet evidence and independent CI verification remain required before the wider feature can
close.

## TODO update

- `UI-WORKSPACE-REFRESH` → In progress.
