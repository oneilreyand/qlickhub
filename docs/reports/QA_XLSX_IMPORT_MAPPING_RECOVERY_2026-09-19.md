## Task

AGY-QA-XLSX-IMPORT-MAPPING-RECOVERY — pulihkan preview dan impor XLSX Test Case dengan header
kanonis tanpa pemetaan ulang manual.

## Outcome

Parser XLSX sekarang membaca OpenXML dengan prefix namespace seperti `<x:row>` dan `<x:c>`, yang
dipakai oleh XLSX audit QRIS. Header template kanonis otomatis diselesaikan untuk CSV maupun XLSX,
sehingga wizard langsung menuju preview. Header yang tidak didukung mengarahkan pengguna ke
pemetaan dan menghasilkan error yang menyebut kolom, baris, dan penyebabnya.

Tidak ada perubahan pada commit atomic, staging server-side, validasi Requirement aktif, atau
otorisasi impor. Perubahan dideploy ke Production pada 2026-09-23 melalui deployment
`dpl_ADS8qZCDNVa92d2mf8r43Jf1XGHB`, yang berstatus Ready dan dialias ke
`https://qlickhub.vercel.app`. E2E UAT XLSX terautentikasi tetap belum diklaim.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md), [Workflow](../2_WORKFLOW_AND_ROLES.md), [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dan [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-002`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `QA-001`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Respons preview import menambahkan `unmappedHeaders` dan selalu mengembalikan `columnMapping` yang telah diselesaikan. Tidak ada skema atau migrasi baru.
- **Authorization impact:** Tidak ada; backend tetap menjadi sumber kebenaran bagi preview dan commit import Workspace.
- **Migration risk:** Tidak ada.

## Changed files

- `apps/api/src/modules/testManagement/spreadsheetParser.ts` — membaca tag OpenXML bernamespace, entity XML, dan pemetaan header kanonis/asing.
- `apps/api/src/modules/testManagement/testCaseImportService.ts` — menyelesaikan mapping, menandai header asing, dan menambahkan error spesifik per baris.
- `packages/contracts/src/testManagement.ts` — menambahkan metadata `unmappedHeaders` pada respons preview.
- `apps/web/src/components/ui/organisms/myTasks/TestCaseImportWizardModal.tsx` — melewati pemetaan untuk header kanonis dan menjelaskan header asing.
- `apps/api/src/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.ts` — membuktikan preview/commit XLSX namespace-qualified dan error header asing terhadap PostgreSQL test.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/TestCaseImportWizardModal.test.tsx` — membuktikan jalur preview otomatis dan state pemetaan wizard.
- `docs/features/QA_XLSX_IMPORT_MAPPING_RECOVERY.md` — Feature Knowledge Card.

## Validation

- `npm --prefix packages/contracts run build` — passed, exit 0.
- `npm --prefix apps/api run typecheck` — passed, exit 0.
- `npm --prefix apps/web run typecheck` — passed, exit 0.
- `NODE_ENV=test node --test apps/api/dist/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.js` — passed, 41/41; memakai PostgreSQL test lokal disposable. Satu peringatan deprecation driver `pg` dan pesan FCM tanpa token aktif muncul, tanpa kegagalan tes.
- `npm --prefix apps/web run test -- src/components/ui/organisms/myTasks/__tests__/TestCaseImportWizardModal.test.tsx` — passed, 2/2.
- `npm --prefix apps/web run build` — passed, exit 0; 1.715 modul ditransformasi.
- `npm --prefix packages/contracts run test` — 72/73 passed; satu kegagalan yang sudah ada dan tidak terkait pada validasi `BugSchema` karena fixture tidak menyertakan `originatingTestCase`.
- Vercel Production `dpl_ADS8qZCDNVa92d2mf8r43Jf1XGHB` — Ready; alias `https://qlickhub.vercel.app` aktif.
- Smoke check Production non-destruktif — `/`, `/v1`, dan `/v1/health` masing-masing `200`; `/v1/workspaces` tanpa sesi `401`.

## Risks or follow-up

- Lakukan E2E UAT Production non-destruktif dengan memilih preview XLSX audit; jangan commit Test Case hanya demi pembuktian.
- Header yang sengaja diabaikan tetap dapat dipilih pada wizard. Header asing yang belum diberi keputusan memunculkan state mapping dan error preview awal.

## TODO update

- `AGY-QA-XLSX-IMPORT-MAPPING-RECOVERY` → `Done`.
