# QA-ASSURANCE-S5-EVIDENCE-GATED-COMPLETION-AND-RELEASE

## Task

Menegakkan penyelesaian QA Subtask, QA Sign-off, dan Release Decision berdasarkan evidence
Feature yang scoped pada Test Cycle, readiness baseline, dan candidate yang sama.

## Outcome

QA assignee hanya dapat menyelesaikan QA Subtask bila candidate Test Cycle terbaru memiliki Result
terbaru yang lulus untuk seluruh Test Case aktif pada baseline, manifest evidence awal yang immutable
dan previewable, coverage Acceptance Criterion aktif, serta Bug yang sudah `verified` melalui Retest
Attempt formal. Gate berjalan di transaksi lifecycle Task; status QA tidak dapat diselesaikan hanya
berdasarkan UI atau catatan browser.

QA Sign-off hanya dapat dibuat oleh QA assignee setelah QA Subtask selesai dan gate evidence yang sama
lulus. Sign-off menyimpan `qaSubtaskId`, `testCycleId`, `readinessBaselineId`, dan
`candidateFingerprint`. Release Decision wajib memakai Sign-off scoped terbaru, memvalidasi ulang gate
yang sama, lalu menyalin provenance yang identik. PO tetap independen dari signer QA. Record legacy
tanpa scope tetap dapat dibaca dan dibatalkan sebagai riwayat, tetapi tidak dapat dipakai untuk membuat
Release Decision baru.

Readiness aktif memakai snapshot V3 dan menampilkan provenance candidate/Test Cycle di UI. Keputusan
rilis menotifikasi QA signer serta Developer assignee terkait, selain reporter/assignee Feature yang
relevan; penerima dideduplikasi dan pelaku keputusan tidak menerima notifikasi dirinya sendiri.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), dan [SDLC Quality and Release plan](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md).
- **Policy IDs:** `AUTH-009`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `RELEASE-003`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`.
- **Data/interface impact:** Migration 76 menambah provenance nullable pada `qa_sign_offs` dan `release_decisions` untuk kompatibilitas riwayat. Semua record baru yang dibuat service wajib scoped; response saat ini memakai readiness snapshot V3 dengan `evidenceScope`.
- **Authorization impact:** Endpoint pencatatan QA Sign-off hanya menerima role QA, dan service memastikan actor adalah assignee QA Subtask/Test Cycle. PO tidak dapat mengubah status QA Subtask; Owner/Admin tidak memperoleh izin eksekusi QA normal.
- **Migration risk:** Additive dan backward-compatible untuk record historis. Clean migration dan aplikasi migration test sampai 76 telah diverifikasi pada PostgreSQL disposable.

## Changed files

- `apps/api/src/db/migrations/20260915000076-add-release-record-scope-provenance.cjs`, model Sign-off/Decision, dan contracts release — provenance scope serta snapshot V3.
- `apps/api/src/modules/releaseDecisions/qaEvidenceCompletionGate.ts` dan `apps/api/src/modules/tasks/internal/taskLifecycle.ts` — gate evidence atomik untuk penyelesaian QA.
- `apps/api/src/modules/releaseDecisions/releaseDecisionService.ts` dan routes/policy — Sign-off/Decision scoped, revalidasi candidate, snapshot V3, dan recipient notifikasi.
- `apps/web/src/components/ui/organisms/ReleaseAssurancePanel.tsx` — pemilihan Test Cycle wajib untuk Sign-off dan tampilan evidence scope.
- Suite release, lifecycle, task, bug, contract, dan UI — fixture PostgreSQL serta test UI mengikuti flow scoped saat ini.

## Validation

- `npm --prefix packages/contracts test` — passed: 70/70.
- `npm --prefix packages/contracts run build` — passed.
- `npm --prefix apps/api run build` — passed.
- `npm --prefix apps/web run build` — passed: TypeScript dan Vite, 1,710 modules.
- `npm --prefix apps/web test -- src/components/ui/organisms/__tests__/ReleaseAssurancePanel.test.tsx` — passed: 11/11.
- `NODE_ENV=test node --test` untuk suite Bug, Release Decision, lifecycle release, cancellation record, task state machine, dan subtask API di `apps/api` — passed: 37/37, 0 skipped, PostgreSQL disposable.
- Migration 76 clean verification dan `db:migrate:test` telah lulus sebelumnya pada PostgreSQL disposable; tidak ada migration production atau mutasi data bisnis dijalankan.

## Risks or follow-up

- Break-glass Owner/Admin yang eksplisit dengan alasan dan audit adalah pekerjaan S6; S5 sengaja tidak memberi bypass otomatis.
- Snapshot V1/V2 tetap dibaca untuk riwayat immutable. Snapshot saat ini selalu V3 dan membawa provenance scope.
- Peringatan `pg` mengenai query paralel muncul pada satu lifecycle test tetapi tidak mengubah hasil; semua assertion dan transaction evidence lulus.

## TODO update

- `QA-ASSURANCE-S5-EVIDENCE-GATED-COMPLETION-AND-RELEASE` → `Done`
