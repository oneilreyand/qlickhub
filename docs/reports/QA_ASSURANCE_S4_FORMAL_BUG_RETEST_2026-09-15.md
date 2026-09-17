# QA-ASSURANCE-S4-FORMAL-BUG-RETEST

## Task

Membuat Resolution Event Developer dan Retest Attempt QA formal yang menentukan outcome Bug dari
Result immutable dan Evidence Manifest tersegel.

## Outcome

Developer assignee sekarang mencatat Resolution Event append-only dengan candidate fingerprint dan
catatan resolusi. Jalur PATCH status lama tidak dapat langsung membuat `resolved`, `verified`, atau
`reopened`; Developer hanya dapat memulai pengerjaan, sedangkan resolve wajib melalui event formal.

QA assignee membuat Retest Attempt yang mengarah ke Result baru dari Test Run scoped pada Feature dan
candidate yang sama. Dalam transaksi yang sama, Result `passed` menghasilkan `verified`, `failed`
atau `blocked` menghasilkan `reopened`, dan `skipped` ditolak. Attempt membutuhkan Evidence Manifest
awal yang tersegel serta sedikitnya satu image/video previewable. Constraint unik dan row lock menjaga
satu Result serta satu Resolution Event tidak dapat menghasilkan dua verdict.

Antrean retest hanya menampilkan Bug yang Resolution Event terbarunya belum mempunyai Retest Attempt
final. Riwayat Bug menampilkan semua resolution/retest, Result immutable, Evidence Manifest, file
attachment yang dapat dibuka melalui endpoint terautentikasi, serta tautan evidence yang dapat
dipreview langsung.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), dan [QA Execution and Release Assurance Plan](../plans/QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md).
- **Policy IDs:** `AUTH-009`, `QA-008`, `QA-009`, `RELEASE-003`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`.
- **Data/interface impact:** Migration 75 menambah `bug_resolution_events` dan `bug_retest_attempts`, dengan foreign key Workspace/Bug/actor/Result, unique sequence/event/Result, dan outcome constraint. Shared contracts dan endpoint history mengembalikan Result, manifest, attachment, dan evidence link retest.
- **Authorization impact:** Hanya Developer yang ditugaskan dapat membuat Resolution Event; hanya QA executor Result dapat membuat Retest Attempt. PO baca-saja; Owner/Admin tidak mengeksekusi workflow normal ini. Backend menegakkan semua batas ini.
- **Migration risk:** Additive. Retest Attempt mereferensikan Result dengan `ON DELETE RESTRICT`; cleanup/lifecycle harus menghapus attempt sebelum Result. Migrasi bersih melalui 75 telah diverifikasi pada PostgreSQL disposable.

## Changed files

- `apps/api/src/db/migrations/20260915000075-create-bug-resolution-events-and-retest-attempts.cjs` — persistence, constraints, dan indeks S4.
- `apps/api/src/db/models/bugResolutionEvent.ts`, `bugRetestAttempt.ts` — model Sequelize bertipe.
- `packages/contracts/src/bug.ts` — contract event, attempt, dan timeline evidence.
- `apps/api/src/modules/bugs/` dan `apps/api/src/policies/bugPolicy.ts` — command formal, authorization, transaction, queue derivation, dan history.
- `apps/web/src/lib/api/bugService.ts` dan `apps/web/src/components/ui/organisms/BugExperiencePanel.tsx` — Resolution Event, Retest Attempt, timeline, dan pembukaan evidence.
- `apps/api/src/modules/bugs/__tests__/bugApiIntegration.test.ts` — bukti PostgreSQL untuk passed/blocked/skipped, queue, evidence, authorization, dan history.

## Validation

- `npm --prefix packages/contracts run build` — passed.
- `npm --prefix apps/api run build` — passed.
- `npm --prefix apps/web run build` — passed: TypeScript dan Vite build, 1,710 modules.
- `NODE_ENV=test node --test dist/modules/bugs/__tests__/bugApiIntegration.test.js` di `apps/api` — passed: 6/6 subtest, 0 skipped, PostgreSQL test disposable. Pesan Firebase tanpa device token hanya skip notifikasi eksternal dan non-failing.
- `npm run db:verify:clean-migrations` dan `npm run db:migrate:test` di `apps/api` — passed sebelumnya untuk migration 75 pada database disposable/test.
- `npm run docs:check` dan `git diff --check` — passed setelah laporan dan TODO diperbarui.

## Risks or follow-up

- S5 tetap diperlukan untuk gate penyelesaian QA Subtask, frozen QA Sign-off, dan Release Decision yang memakai evidence/risk terbaru.
- Break-glass Owner/Admin yang eksplisit dan ter-audit tetap pekerjaan S6; S4 sengaja tidak memberi override otomatis.
- Tidak ada migration Production atau mutasi data bisnis yang dijalankan.

## TODO update

- `QA-ASSURANCE-S4-FORMAL-BUG-RETEST` → `Done`
