# Agent Report — Production Release: QA Streamline Test Activation & Bug Handoff

## Task

`QA-UI-UX-SIMPLIFICATION` (Tahap 1) — Rilis pembaruan alur kerja aktivasi Test Case dan handoff pelaporan bug ke Vercel Production (`https://qlickhub.vercel.app`):

- QA assignee dapat mengaktifkan draft Test Case secara langsung dalam scope QA Subtask yang ditugaskan tanpa menunggu publikasi manual PO ([`ADR-015`](../adr/ADR-015-QA-DIRECT-TEST-CASE-ACTIVATION.md)).
- Integrasi tombol handoff cepat _"Buat Bug dari hasil ini"_ saat pengujian berstatus _Failed_ atau _Blocked_.
- Penyediaan snapshot Test Case immutable pada detail Bug untuk reproduksi defect oleh Developer & PO.

## Outcome

Commit `bdd7178` (rebase dari `050f4f5` di atas `692b79d`) telah dipush ke `origin/main` dan berhasil dideploy ke Vercel Production dengan deployment ID `dpl_5y988884uT3vipFHCpx6DGJ3YdQQ`. Deployment berstatus `READY`, menargetkan Production, dan memegang alias kanonikal `https://qlickhub.vercel.app`.

Perubahan utama antarmuka dan alur kerja:

1. **Aktivasi Test Case Mandiri oleh QA (`Aktifkan & Jalankan`):**
   - Menghilangkan friksi antrean persetujuan PO untuk Test Case baru yang berada dalam lingkup Feature dari Subtask QA yang ditugaskan.
   - Tetap mempertahankan opsi _"Minta Masukan PO"_ untuk konsultasi opsional.
   - Backend memvalidasi scope kepemilikan Requirement dan mencatat persistent outbox event untuk notifikasi PO.
2. **Handoff Langsung Hasil Gagal ke Bug:**
   - Setelah Result berstatus _Failed_ atau _Blocked_ disimpan, sistem menampilkan tombol _"Buat Bug dari hasil ini"_.
   - Mengisi otomatis judul, prasyarat, langkah uji, serta hasil aktual ke formulir pelaporan Bug tanpa entri manual berulang.
3. **Reproduksi Defect yang Akurat:**
   - Model pembacaan `BugWithContext` kini menyertakan snapshot versi Test Case asli yang tidak dapat diubah (immutable), sehingga perubahan definisi Test Case di masa depan tidak mengaburkan konteks historis saat bug ditemukan.

## Source of truth and impact

- **Applicable SSoT:** [Product Knowledge Map](../0_PRODUCT_KNOWLEDGE_MAP.md), [Architecture](../1_ARCHITECTURE.md), [Workflow & Roles](../2_WORKFLOW_AND_ROLES.md), [UI design system](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [Agent guidelines](../4_AGENT_DEV_GUIDELINES.md), [ADR-015](../adr/ADR-015-QA-DIRECT-TEST-CASE-ACTIVATION.md), dan [Deployment runbook](../DEPLOYMENT_AND_ENVIRONMENTS.md).
- **Policy IDs:** `AUTH-002`, `AUTH-009`, `QA-001`, `QA-002`, `QA-003`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Additive model pada kontrak Bug (`originatingTestCase`). Migration 83 (`20260918000083-allow-scoped-qa-test-case-activation.cjs`) memperbarui trigger lifecycle pada PostgreSQL.
- **Authorization impact:** Otorisasi QA dibatasi secara ketat oleh scope Requirement pada backend. PO menerima event notifikasi outbox tanpa memberikan hak eksekusi berlebih kepada peran lain.
- **Migration risk:** Perubahan trigger bersifat additive dan backward-compatible.

## Changed files

- `apps/api/src/db/migrations/20260918000083-allow-scoped-qa-test-case-activation.cjs` — migrasi trigger PostgreSQL untuk lifecycle Test Case.
- `apps/api/src/policies/testManagementPolicy.ts` & `apps/api/src/modules/testManagement/testManagementService.ts` — policy aktivasi scoped QA dan audit log.
- `apps/api/src/modules/bugs/bugService.ts` & `packages/contracts/src/bug.ts` — snapshot Test Case pada Bug.
- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — aksi aktivasi langsung dan tombol handoff Buat Bug.
- `apps/web/src/components/ui/organisms/BugExperiencePanel.tsx` — tampilan snapshot Test Case pada kartu Bug.
- `docs/adr/ADR-015-QA-DIRECT-TEST-CASE-ACTIVATION.md` — keputusan arsitektur ADR-015.
- `docs/reports/PRODUCTION_RELEASE_QA_STREAMLINE_TEST_ACTIVATION_2026-09-18.md` — laporan rilis ini.
- `TODO.md` — pembaruan status penyelesaian dan bukti rilis.

## Validation

- **Pengujian Unit & Komponen Frontend:**
  - `npm --prefix apps/web run test -- --run src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx src/components/ui/molecules/__tests__/QaWorkflowSummaryWidget.test.tsx src/components/ui/molecules/__tests__/QaExecutionFilterToolbar.test.tsx src/components/ui/organisms/__tests__/BugExperiencePanel.test.tsx`: 45/45 tes lulus (100%).
- **Pengujian Integrasi API Backend:**
  - `NODE_ENV=test node --test apps/api/dist/modules/testManagement/__tests__/testCaseIntakeAndEvidenceApiIntegration.test.js`: 33/33 tes integrasi HTTP API PostgreSQL lulus (100%).
- **Tata Kelola & Validasi Monorepo (`npm run validate`):**
  - `npm run docs:check`: 5/5 tes lulus (100%).
  - `npm run lint`: 0 error (22 warning lama tersisa).
  - TypeScript Typecheck (`tsc --noEmit` di contracts, api, web): 0 error.
- **Kompilasi Web:**
  - `npm --prefix apps/web run build`: 1.711 modul Vite terbangun bersih tanpa error dalam 2.98 detik.
- **Rilis Vercel Production & Live Smoke Checks (`https://qlickhub.vercel.app`):**
  - Commit Source: `bdd7178`
  - Vercel Deployment ID: `dpl_5y988884uT3vipFHCpx6DGJ3YdQQ`
  - Status: `● Ready` (Target: Production)
  - Aliases: `https://qlickhub.vercel.app`, `https://qlickhub-oneilreyands-projects.vercel.app`, `https://qlickhub-git-main-oneilreyands-projects.vercel.app`
  - `GET /`: HTTP 200 OK
  - `GET /login`: HTTP 200 OK
  - `GET /v1/health`: HTTP 200 OK (`{"status":"ok","service":"authentication-api","database":{"status":"connected"}}`)
  - `GET /v1/workspaces`: HTTP 401 Unauthorized (Security guard aktif)
  - Verifikasi Bundle Live: Label `"Buat Bug dari hasil ini"` dan `"Aktifkan & Jalankan"` terkonfirmasi aktif pada chunk live `MyTaskDetailWorkspaceDrawer-DOZ366Qk.js`.

## Risks or follow-up

- Irisan navigasi datar 6-tab (`Info → Requirement → Pekerjaan → Pengujian → Bug & Retest → Rilis`) pada Task Drawer tetap tercatat sebagai inisiatif UI lanjutan.
- Migration 83 pada database Supabase Production siap dijalankan melalui runner migrasi dengan `MIGRATION_DATABASE_URL` yang valid.

## TODO update

- `QA-UI-UX-SIMPLIFICATION` (Fase 1: Aktivasi langsung, outbox PO, handoff Bug, & snapshot immutable) → `Done` (Production verified).
