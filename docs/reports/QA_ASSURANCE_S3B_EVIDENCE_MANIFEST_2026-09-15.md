# QA-ASSURANCE-S3B-EVIDENCE-MANIFEST

## Outcome

Result pada Test Run scoped sekarang evidence-based. `passed`, `failed`, dan `blocked` hanya dapat
difinalisasi bila membawa minimal satu gambar atau video yang previewable. Result `skipped` harus
memiliki alasan pada catatan. Dalam transaksi yang sama, aplikasi menyegel Evidence Manifest awal
yang memuat snapshot attachment/link, provenance/provider, media kind, preview availability, actor,
dan waktu seal.

Evidence yang ditambahkan setelah Result tidak mengubah manifest awal. Command tautan evidence
memerlukan alasan dan menulis manifest `supplement` berikutnya dengan sequence yang terkunci. Trigger
PostgreSQL menolak `UPDATE` terhadap manifest. Evidence media tetap dapat dibuka: attachment melalui
endpoint terautentikasi, link media melalui Evidence Preview yang sudah dinormalisasi.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), [QA assurance plan](../plans/QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md), dan [feature card SDLC](../features/SDLC_QUALITY_AND_RELEASE.md).
- **Policy IDs:** `QA-007`, `QA-008`, `QA-009`, `RELEASE-003`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Migration 74 menambah `test_result_evidence_manifests`; shared contract menambah manifest Result dan input supplement beralasan. Result/Run legacy tetap terbaca tanpa backfill atau manifest rekayasa.
- **Authorization impact:** Backend membatasi Result dan supplement scoped pada QA executor yang memulai Run; UI tidak memberi PO/Owner/Admin kontrol eksekusi. Supplement tidak mengganti Result atau bukti awal.
- **Migration risk:** Additive. Trigger hanya melarang update manifest; penghapusan tetap berada pada lifecycle parent Result/Workspace yang sudah ada. Migrasi bersih diverifikasi pada PostgreSQL disposable.

## Changed files

- `apps/api/src/db/migrations/20260915000074-create-test-result-evidence-manifests.cjs` — tabel, FK, sequence/summary constraints, partial unique initial manifest, dan trigger immutable.
- `apps/api/src/db/models/testResultEvidenceManifest.ts`, model exports/associations, dan workspace cleanup — persistence lifecycle.
- `packages/contracts/src/testManagement.ts` — manifest response dan input supplement beralasan.
- `apps/api/src/modules/testManagement/` — evidence gate scoped, sealing transaction, append-only supplement, dan activity audit.
- `apps/web/src/lib/api/testManagementService.ts` dan `QaTestingDesk.tsx` — validasi input, alasan supplement, dan indikator manifest tersegel.
- `apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts` dan `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — coverage persistence dan UX.

## Validation

- `npm --prefix packages/contracts run build` — passed.
- `npm --prefix packages/contracts test` — passed: 70/70, 0 skipped.
- `npm run build` in `apps/api` — passed.
- `npm --prefix apps/web run build` — passed: TypeScript and Vite build (1,710 modules).
- `npm run db:verify:clean-migrations` in `apps/api` — passed through migration 74 on a newly created and removed PostgreSQL database.
- `npm run db:migrate:test` in `apps/api` — passed; migration 74 applied to PostgreSQL test database only.
- `NODE_ENV=test node --test dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js` in `apps/api` — passed: 8/8, 0 skipped. Existing pg deprecation warning and no-device-token FCM skip were non-failing.
- `npm test -- src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` in `apps/web` — passed: 17/17, 0 skipped. Existing asynchronous React `act(...)` warnings remained non-failing.
- `npm run docs:check` and `git diff --check` — passed.

## Risks or follow-up

- S4 must introduce a formal Bug Retest Attempt that points to immutable Result evidence; supplement manifests do not establish a bug-resolution verdict by themselves.
- Completion gate for QA Subtask remains deliberately deferred until S4 formal retest and Feature-level readiness evidence are available.
- No Production migration or data mutation was performed.

## TODO update

- `QA-ASSURANCE-S3B-EVIDENCE-MANIFEST` → `Done`
