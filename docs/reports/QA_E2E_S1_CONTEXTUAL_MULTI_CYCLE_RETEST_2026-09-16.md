# Agent Report — QA E2E S1 Contextual Multi-Cycle Retest

## Task

`QA-E2E-S1-CONTEXTUAL-MULTI-CYCLE-RETEST` — hilangkan input UUID pada retest, buat Run dari
konteks Bug, dan pertahankan evidence pada setiap siklus perbaikan/retest.

## Outcome

QA kini memulai retest dari tombol **Mulai Retest** pada Bug dan diarahkan ke QA Subtask asal tanpa
memasukkan Result ID. Backend membuat Run dari scope persisted Feature, QA Subtask, Test Cycle,
Test Case revision, baseline, candidate, build, dan environment. Setelah Result + evidence dicatat,
QA Desk membuat Retest Attempt dan outcome Bug menjadi `verified` atau `reopened` secara atomik.

Developer mengirim Resolution Event dan evidence perbaikan dalam satu command. Evidence tersebut
terikat pada Resolution Event tertentu, sedangkan contextual Run terikat pada Bug serta Resolution
Event. Histori UI menampilkan temuan awal dan siklus perbaikan #1..n. PostgreSQL integration
membuktikan siklus pertama `reopened`, siklus kedua `verified`, dan evidence/Result siklus pertama
tetap ada setelah siklus kedua. Tidak ada batas dua siklus pada kontrak atau schema.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, ADR-014, dan
  `docs/plans/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-002`, `QA-003`, `QA-004`, `QA-006`,
  `QA-007`, `QA-008`, `DATA-001`, `DATA-002`, `DATA-005`, `CONTRACT-001`, `UI-001`, `UI-002`,
  `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** migration 82 menambah stage/FK Resolution Event pada Bug evidence dan
  provenance Bug/Resolution Event pada Test Run. Shared contract menambah contextual retest Run dan
  history cycle. API menambah `POST .../retest-runs` serta memperluas Resolution Event/history.
- **Authorization impact:** hanya Developer assignee dapat mencatat Resolution Event; hanya QA
  assignee QA Subtask asal dapat melihat antrean actionable, memulai Run, dan memfinalkan attempt.
  PO/Owner/Admin tidak memperoleh hak eksekusi QA.
- **Migration risk:** additive, tetapi rollback menghapus provenance contextual. Evidence historis
  ambigu ditandai `legacy_unassigned`; tidak dipasangkan berdasarkan tebakan waktu. Sebelum rollback
  pada environment berisi data contextual, relasi baru harus diaudit/diekspor.

## Changed files

- `apps/api/src/db/migrations/20260916000082-link-contextual-bug-retest-evidence.cjs` — kolom,
  backfill konservatif, FK/check/unique constraint, dan index timeline.
- `apps/api/src/db/models/bugEvidenceLink.ts`, `testRun.ts`, dan
  `associations/qaAssociations.ts` — model/relasi provenance.
- `packages/contracts/src/bug.ts` dan `testManagement.ts` — command/read model contextual retest,
  cycle history, evidence stage, dan field Run.
- `apps/api/src/modules/bugs/bugService.ts`, `bugController.ts`, dan `bugRoutes.ts` — pembuatan Run
  idempotent, finalisasi attempt terscope, evidence resolusi atomik, queue QA assignee, dan history.
- `apps/api/src/modules/testManagement/testManagementService.ts` — serialisasi provenance Run.
- `apps/web/src/lib/api/bugService.ts` — client contextual retest.
- `apps/web/src/components/ui/organisms/BugExperiencePanel.tsx` — CTA tanpa UUID, dialog resolusi,
  blocker, dan histori evidence per siklus.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — finalisasi otomatis serta aksi
  pemulihan sinkronisasi outcome.
- `apps/web/src/components/ui/organisms/MyTasksDashboard.tsx` dan `apps/web/src/pages/MyTasksPage.tsx`
  — deep-link ke QA Subtask hasil contextual retest.
- Test kontrak, API integration, Bug panel, QA Desk, dan My Tasks — regression coverage.
- Feature Card, rencana, design-system catalog, TODO, dan laporan ini — traceability implementasi.

## Validation

- `npm --prefix apps/api run db:verify:clean-migrations` — lulus; 66 migrasi canonical sampai
  migration 82 dijalankan pada PostgreSQL disposable `qa_management_phase0_verify_54373`.
- `npm --prefix apps/api run db:migrate:test` — lulus; migration 82 diterapkan pada PostgreSQL test.
- `NODE_ENV=test node --test apps/api/dist/modules/bugs/__tests__/bugApiIntegration.test.js` —
  6/6 test lulus, 0 gagal, 0 skipped. Mencakup RBAC, contextual Run idempotent, dan dua siklus
  `reopened → verified`. Ada satu deprecation warning `pg` tentang concurrent `client.query()` dari
  infrastruktur notifikasi yang sudah ada; test tetap lulus.
- `npm --prefix packages/contracts test` — 73/73 test lulus, 0 gagal, 0 skipped.
- `npm --prefix apps/web test -- --run ...BugExperiencePanel... ...QaTestingDesk...
...MyTasksDashboard...` — 35/35 test lulus, 0 gagal, 0 skipped. Runner masih mencetak warning
  React `act(...)` pada test anti-self-approval yang sudah ada; tidak berasal dari assertion S1.
- `npm run typecheck` — contracts, API, dan web lulus.
- `npm run lint` — lulus dengan 0 error dan 20 warning existing di file di luar slice ini.
- `npm --prefix apps/web run build` — lulus; 1.711 module ditransformasi.
- `npm run docs:check` — 5/5 test dokumentasi lulus dan governance check lulus.
- `git diff --check` — lulus.

## Risks or follow-up

- Belum dideploy atau divalidasi pada Production.
- S2–S7 pada rencana remediasi masih terbuka: queue/capability summary yang lebih kaya,
  restrukturisasi QA Desk, pre-validation completion/sign-off, terminology sweep, dan browser E2E
  lintas layar.
- Record legacy tanpa Run scope deterministik sengaja tidak masuk antrean contextual; diperlukan
  jalur rekonsiliasi eksplisit bila bisnis ingin memigrasikannya.
- Resolution evidence pada slice ini berupa tautan; upload file Developer tetap follow-up terpisah.

## TODO update

- `QA-E2E-S1-CONTEXTUAL-MULTI-CYCLE-RETEST` → `Done` (development/test, belum Production).
