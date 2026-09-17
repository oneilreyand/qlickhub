## Task

PRODUCTION-RELEASE-QA-WORKFLOW-UX — Rilis penyempurnaan alur kerja QA (Quality Assurance) dan manajemen pengujian pada QaTestingDesk dan TestCaseFormModal ke Vercel Production (`https://qlickhub.vercel.app`).

## Outcome

Commit `ff247004f1244d8b9ba562dfd1d86d526eb611db` telah dipush ke `origin/main` dan dideploy ke Vercel Production. Deployment Vercel `dpl_2YE4k1jT8enrtbkM2XCPRsUgZKUT` telah berstatus `READY`, menargetkan Production, dan memegang alias kanonikal `https://qlickhub.vercel.app`.

Penyempurnaan mencakup:
1. **Penyelesaian Dead-End Review Subtask Pengembang:** QA dan Planner yang terotorisasi kini dapat meninjau subtask pengembang (`deliveryArea !== 'qa'`) berstatus `in_review` secara langsung di QA Testing Desk dengan aksi `[✓ Lolos Review & Selesaikan]` (`done`) dan `[✕ Minta Revisi]` (`changes_requested`), dilengkapi modal catatan wajib untuk revisi (sesuai kontrak backend `requiresReviewNotes: true`).
2. **Anti-Self-Approval Terjaga:** Pengembang yang mengerjakan subtask tidak dapat menyetujui pekerjaannya sendiri; tampilan menyajikan pesan informatif bahwa subtask sedang menunggu peninjauan oleh QA/PO.
3. **Hierarki Tombol Pembuatan Test Case:** Tombol "Ajukan untuk Review" kini berstatus primer (`variant="primary"`) dan "Simpan Draf" sekunder (`variant="outline"`), disertai teks penjelasan status alur di bagian footer.
4. **Badge Status Test Case Eksplisit:** Status Test Case menggunakan token warna Stitch bawaan (`brand` untuk Aktif, `review` untuk Menunggu Review PO, dan `draft` untuk Draf).
5. **Panduan Proaktif Requirement:** Menampilkan banner panduan yang jelas bagi QA (panduan pelaporan) dan PO (tombol pintas navigasi) ketika Feature belum memiliki Requirement aktif yang tertaut.
6. **Panduan Pasca-Pengujian:** Notifikasi penyelesaian pengujian mengarahkan QA ke langkah berikutnya (penerbitan QA Sign-off).

Tidak ada schema migration yang dijalankan, dan tidak ada mutasi data bisnis atau data uji palsu yang dibuat di Production.

## Source of truth and impact

- **Applicable SSoT:** [Deployment runbook](../DEPLOYMENT_AND_ENVIRONMENTS.md), [Workflow & Roles](../2_WORKFLOW_AND_ROLES.md), [Architecture](../1_ARCHITECTURE.md), [UI design system](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dan [Agent guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `FLOW-001`, `FLOW-002`, `QA-001`, `QA-002`, `QA-004`, `UI-001`, `UI-002`, `TEST-001`, `DATA-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Perbaikan UX frontend dan modal review kini aktif melayani pengguna di Production. Kontrak API backend dan skema PostgreSQL tidak berubah.
- **Authorization impact:** Tidak ada degradasi otorisasi. Otorisasi backend RBAC dan Anti-Self-Approval (`taskPolicy.ts`) tetap ditegakkan penuh.
- **Migration risk:** Nihil. Tidak ada file migrasi baru atau perubahan skema database; seluruh 53 migrasi kanonikal Production tetap `up`.

## Changed files

- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — review controls, modal revisi dengan catatan wajib, panduan requirement proaktif, feedback toast sign-off.
- `apps/web/src/components/ui/organisms/myTasks/TestCaseFormModal.tsx` — hierarki tombol primer 'Ajukan untuk Review' dan 'Simpan Draf' outline, panduan alur footer.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — pengujian review subtask pengembang dan anti-self-approval.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/TestCaseFormModal.test.tsx` — penyesuaian hierarki tombol dan aktivasi PO.
- `TODO.md` — pencatatan status implementasi dan rilis produksi.
- `docs/reports/QA_WORKFLOW_AND_TEST_MANAGEMENT_UX_ENHANCEMENT_2026-09-14.md` — laporan rinci implementasi fitur.
- `docs/reports/PRODUCTION_RELEASE_QA_WORKFLOW_UX_2026-09-14.md` — laporan rilis produksi ini.

## Validation

- **Unit & Integration Tests:**
  - `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx`: 15/15 lulus.
  - `apps/web/src/components/ui/organisms/myTasks/__tests__/TestCaseFormModal.test.tsx`: 3/3 lulus.
  - Seluruh Frontend Web Tests: 465/465 lulus di 88 file tes (0 failed, 0 skipped).
  - API / PostgreSQL Integration Tests: 422/422 lulus di 96 test suites.
  - Shared Contract Tests: 69/69 lulus di 20 test suites.
- **Lint & Typecheck:**
  - `npm run validate` / TypeScript typecheck: 0 errors across web, api, and contracts packages.
  - ESLint: 0 errors.
  - `npm run docs:check`: 5/5 lulus.
- **Production Build:**
  - `npm run build`: contracts, API, dan web build sukses mentransformasi 1.710 modul dalam 2,83 detik.
- **Live Production Smoke Checks (`https://qlickhub.vercel.app`):**
  - `GET /`: HTTP 200 OK
  - `GET /login`: HTTP 200 OK
  - `GET /v1/health`: HTTP 200 OK (`{"status":"ok","database":"connected"}`)
  - `GET /v1/workspaces` (tanpa sesi terautentikasi): HTTP 401 Unauthorized (`Authentication required`)
- **Rollback Target:**
  - Deployment sehat sebelumnya: `dpl_FBqQcYxEdUNhZm6QT55qTYg5cPwg` (commit `d7acff0`).
  - Rollback database tidak diperlukan karena tidak ada perubahan skema atau mutasi data persisten.

## TODO update

- `PRODUCTION-RELEASE-QA-WORKFLOW-UX` → `Done`.
