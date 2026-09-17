## Task

QA-ASSURANCE-S2B-REVISION-PUBLICATION-AND-AC-MAPPING

## Outcome

Test Case sekarang memakai revision definition yang append-only pada alur runtime. QA membuat atau
memperbarui definisi draf sehingga terbentuk revision baru; QA mengajukan revision itu untuk review;
dan PO/Owner/Admin hanya dapat mengubah lifecycle draf → review → active/archived, tanpa mengubah
definition snapshot atau status Subtask QA. Revision draf dapat dipetakan QA ke Acceptance Criterion
aktif pada Requirement yang termasuk snapshot Test Case, atau dikecualikan dengan alasan wajib.

API mengembalikan hitungan coverage per revision kepada Workspace member. QA Testing Desk menampilkan
revision terbaru beserta jumlah AC `mapped`/`excluded`, dan menyediakan dialog QA-only untuk memilih
AC, memasukkan alasan exclusion, serta menyimpan mapping pada revision draf. PO dapat melihat coverage
tetapi tidak menerima kontrol mutasi mapping atau eksekusi QA.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow and Roles](../2_WORKFLOW_AND_ROLES.md), dan [QA execution and release plan](../plans/QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md).
- **Policy IDs:** `AUTH-009`, `AUTH-010`, `QA-006`, `QA-009`, `RELEASE-003`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Migration `20260915000072` menambahkan controlled lifecycle transition untuk `test_case_versions`, `test_case_version_id` pada activity audit, dan action audit revision/AC. Kontrak/API menambahkan read coverage, read mapping, serta replace mapping revision draf. Client menampilkan coverage dan menggunakan command mapping tersebut.
- **Authorization impact:** QA adalah satu-satunya aktor mapping dan authoring draf. PO/Owner/Admin hanya melakukan lifecycle review/publish/archive; member Workspace dapat membaca coverage/mapping. Backend tetap menjadi enforcement point.
- **Migration risk:** Additive pada kolom activity dan mengubah trigger versioning yang baru diperkenalkan migration 71. Trigger secara eksplisit melarang perubahan snapshot dan hanya mengizinkan transisi lifecycle yang disetujui. Rollback tidak boleh dilakukan setelah data versioning produksi ada tanpa rencana pemulihan.

## Changed files

- `apps/api/src/db/migrations/20260915000072-enable-version-lifecycle-and-revision-audit.cjs` — controlled version lifecycle, activity foreign key, dan audit action constraint.
- `apps/api/src/modules/testManagement/testManagementService.ts` — membuat revision saat definition draf berubah, lifecycle/publish terkontrol, mapping AC Workspace-safe, coverage summary, dan activity append-only.
- `apps/api/src/modules/testManagement/testManagementController.ts` dan `testManagementRoutes.ts` — endpoint read/replace mapping dan coverage.
- `apps/api/src/policies/testManagementPolicy.ts` — memisahkan perubahan definition QA dari lifecycle Planner.
- `packages/contracts/src/testManagement.ts` — kontrak mapping/exclusion dan coverage revision.
- `apps/web/src/lib/api/testManagementService.ts` — client read coverage dan command mapping revision.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — badge coverage dan dialog mapping QA-only dengan empty/loading/error/disabled state.
- `apps/api/src/modules/testManagement/__tests__/testManagementApiIntegration.test.ts` dan `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — regression API/PostgreSQL dan UI role/mapping coverage.

## Validation

- `npm --prefix packages/contracts run build` — passed.
- `npm --prefix apps/api run build` — passed.
- `NODE_ENV=test node --test dist/db/__tests__/testCaseVersionFoundationIntegration.test.js dist/modules/testManagement/__tests__/testManagementApiIntegration.test.js` in `apps/api` — passed: 8/8 PostgreSQL integration tests, 0 skipped, test database; Firebase device-token dispatch was intentionally skipped because no active tokens existed.
- `npm --prefix apps/web test -- QaTestingDesk` — passed: 17/17 tests, 0 skipped. Existing asynchronous React `act(...)` warnings from `ReleaseAssurancePanel`/`QaTestingDesk` remained; there were no test failures.
- `npm --prefix apps/web run build` — passed: TypeScript and Vite production build (1,710 modules).
- `npm run db:verify:clean-migrations` — passed earlier in this slice against a newly created and removed disposable PostgreSQL database through migration 72.

## Risks or follow-up

- Active Test Runs still point only to legacy Test Case identity. S3 must pin each new Run to Feature, QA Subtask, Test Case revision, Test Cycle, candidate fingerprint, and environment before AC coverage can become a release gate.
- Mapping controls intentionally apply only while the latest revision is a QA draf. The API rejects mapping attempts by PO/Owner/Admin or against a non-draft revision.
- Result evidence and Bug retest evidence remain legacy/optional until S3/S4 implement sealed image/video evidence manifests and formal Retest Attempts.

## TODO update

- `QA-ASSURANCE-S2B-REVISION-PUBLICATION-AND-AC-MAPPING` → `Done`
