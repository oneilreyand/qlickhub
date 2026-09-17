# Agent Report — QA E2E S2 Capability-Scoped Queue and Deep-link

## Task

`QA-E2E-S2-CAPABILITY-SCOPED-QUEUE-DEEP-LINK` — membatasi antrean QA pada capability persisted,
menjelaskan blocker/read-only, dan membuka konteks QA yang tepat.

## Outcome

Antrean QA tidak lagi memasukkan seluruh Bug `resolved` atau seluruh Feature yang sedang review.
Bucket retest memakai scope kanonik endpoint Bug: QA Subtask asal harus ditugaskan kepada actor,
Resolution Event terbaru harus ada, dan event tersebut belum memiliki Attempt final. Bucket sign-off
hanya membaca Test Cycle aktif yang dimiliki actor serta QA Subtask terkait. Ia memakai completion
gate yang sama dengan command sign-off untuk memberi state actionable atau blocked.

Setiap item antrean sekarang mempunyai `workState`: `actionable`, `blocked`, atau `read_only`.
UI membedakan tindakan, prasyarat, dan informasi tanpa memberi CTA mutasi palsu. Kartu Bug
memfokuskan Bug yang dipilih; kartu pengujian dan sign-off membawa pengguna ke area Test Case atau
Sertifikasi QA pada drawer.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, ADR-014, dan
  `docs/plans/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md`.
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-004`, `QA-006`, `QA-007`, `QA-008`,
  `QA-009`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`,
  `DOC-004`.
- **Data/interface impact:** shared work-queue contract menambah `workState` dan action non-mutasi
  `view_context`. API queue membaca scope retest/sign-off persisted yang sudah ada; tidak ada
  schema, migration, backfill, atau data bisnis baru.
- **Authorization impact:** tidak ada hak baru. Capability UI dihitung backend, sementara Bug dan
  sign-off service tetap menjadi enforcement akhir.
- **Migration risk:** tidak ada.

## Changed files

- `packages/contracts/src/workQueue.ts` — state capability dan action buka konteks.
- `apps/api/src/modules/workQueue/workQueueService.ts` — scope QA, evaluasi gate, dan state item.
- `apps/api/src/modules/workQueue/__tests__/workQueueApiIntegration.test.ts` — evidence PostgreSQL
  untuk retest scoped dan sign-off blocked.
- `apps/web/src/components/ui/atoms/Card.tsx` — ref forwarding bagi focus yang dapat diakses.
- `apps/web/src/components/ui/organisms/myTasks/RoleAwareWorkQueuePanel.tsx` — badge state serta
  CTA konteks/prasyarat.
- `apps/web/src/components/ui/organisms/MyTasksDashboard.tsx`, `BugExperiencePanel.tsx`,
  `MyTaskDetailWorkspaceDrawer.tsx`, `QaTestingDesk.tsx`, `ReleaseAssurancePanel.tsx`, dan
  `apps/web/src/pages/MyTasksPage.tsx` — deep-link/fokus Bug, Test Case, dan Sign-off.
- `apps/web/src/test/workQueueFixture.ts` serta test organism terkait — fixture dan regresi UI.
- Feature Card, rencana, TODO, dan laporan ini — traceability.

## Validation

- `npm --prefix packages/contracts test` — lulus 73/73, gagal 0, skipped 0.
- `npm --prefix apps/api run build` — lulus.
- `NODE_ENV=test node --test apps/api/dist/modules/workQueue/__tests__/workQueueApiIntegration.test.js`
  — lulus 4/4, gagal 0, skipped 0, pada PostgreSQL test lokal. Skenario mencakup retest unscoped
  yang tidak tampil, retest contextual assignee yang tampil, dan sign-off blocked.
- `npm --prefix apps/web run typecheck` — lulus.
- `npm --prefix apps/web test -- --run ...MyTasksDashboard... ...BugExperiencePanel...
...QaTestingDesk... ...ReleaseAssurancePanel...` — lulus 48/48, gagal 0, skipped 0. Ada warning
  React `act(...)` lama pada test anti-self-approval QaTestingDesk; assertion tetap lulus.
- `npm run validate` — lulus: docs 5/5, typecheck contracts/API/web, lint 0 error dan 20 warning
  existing di luar slice.
- Build contracts, API, dan web lulus; web menghasilkan 1.711 module. `git diff --check` dan
  Prettier check pada file S2 lulus.

## Risks or follow-up

- Belum ada browser E2E terautentikasi, rollout, atau deployment Production.
- Item read-only tetap muncul sebagai konteks audit; item ini tidak memberi perintah mutasi.
- S3–S7 (ringkasan workflow, progressive disclosure, pre-validation lebih kaya, konsistensi bahasa,
  dan observability) masih terpisah di rencana.

## TODO update

- `QA-E2E-S2-CAPABILITY-SCOPED-QUEUE-DEEP-LINK` → `Done` (development/test, belum Production).
