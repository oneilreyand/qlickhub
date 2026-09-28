## Task

Implementasi generator Feature & Task bertenaga AI menggunakan Google AI Studio (Gemini), modal pratinjau interaktif (Preview) sebelum submit untuk 4 entitas (Detail Task, Product Brief, Requirements & AC, Subtasks), serta pembuatan atomik di database PostgreSQL.

## Outcome

Fitur AI Task Generator kini berfungsi penuh dari ujung ke ujung:

1. Product Owner dapat menginput prompt fitur pada modal `AiTaskGeneratorModal` (diakses via tombol `Buat via AI` di Task Hub Header atau banner pintas di dalam `CreateTaskModal`).
2. Google AI Studio (Gemini) menghasilkan draf terstruktur dengan skema JSON resmi yang memetakan:
   - Detail Feature / Root Task (Title, Description, Priority).
   - Product Brief (Context, In-Scope, Out-of-Scope).
   - Functional Requirements & Acceptance Criteria (AC).
   - Delivery Subtasks (Frontend, Backend, Mobile, QA).
3. Sesuai Policy `AI-001`, draf ditampilkan dalam **Interactive Preview Tabs** sebelum disimpan. PO dapat mengedit judul/deskripsi, menambah/menghapus butir cakupan, dan memilih subtask mana yang diaktifkan melalui checkbox.
4. Menekan tombol `Terapkan & Buat Feature` mengeksekusi mutasi atomik batch di backend dalam satu transaksi Sequelize PostgreSQL yang terisolasi, mencatat audit log, dan langsung membuka drawer feature yang baru dibuat.

## Work assurance

- **Work Readiness Assessment:** 9/16, `Ready after split`; shared contract, API transaction, PostgreSQL evidence, UI interaction, dan dokumentasi terdampak.
- **User plan approval:** User meminta perbaikan seluruh temuan audit pada 2026-09-28.
- **AC-to-evidence:** cited draft dan validasi jadwal dibuktikan oleh contracts test; Apply atomic, audit subtask, RBAC dev denial, dan rollback Product Brief dibuktikan oleh PostgreSQL integration test; preview dan 429 fallback dibuktikan oleh web unit test.
- **Evidence outcomes:** kegagalan Product Brief sengaja diinjeksi melalui hook model pada test disposable PostgreSQL; root Task terbukti tidak tersimpan. Gemini tidak dipanggil pada `NODE_ENV=test`; runtime tanpa key kini fail-closed.
- **Change Impact Map:** Cross-boundary: generated-draft contract, Gemini client, task/brief transaction, audit, global rate-limit UI, Feature Card, TODO, dan report.
- **Decision Snapshot:** Sitasi menunjuk prompt PO asal; generator tidak mengklaim sumber eksternal atau menjalankan retrieval baru.
- **Independent verification:** pending CI; pemeriksaan lokal tercatat sebagai E2/E3 dan tidak menggantikan keputusan rilis.

## Source of truth and impact

- **Applicable SSoT:** [`docs/0_PRODUCT_KNOWLEDGE_MAP.md`](../0_PRODUCT_KNOWLEDGE_MAP.md), [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md), [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [`docs/features/AI_TASK_GENERATOR_MODAL.md`](../features/AI_TASK_GENERATOR_MODAL.md)
- **Policy IDs:** `AI-001`, `AUTH-001`, `AUTH-002`, `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`
- **Data/interface impact:** Tambahan endpoint `POST /v1/workspaces/:workspaceId/ai/generate-task-draft` dan `POST /v1/workspaces/:workspaceId/ai/apply-task-draft`. Tidak mengubah schema database (menggunakan tabel Task, Requirement, AcceptanceCriterion, QaDocument yang sudah ada).
- **Authorization impact:** Otorisasi RBAC di sisi backend membatasi aksi generate dan apply hanya untuk peran `owner`, `admin`, dan `po` (`AUTH-002`). API Key Gemini diamankan 100% di server side (.env), tidak bocor ke browser.
- **Migration risk:** None (additive code without database migrations).

## Changed files

- `packages/contracts/src/aiTaskGenerator.ts` — Skema shared Zod dan tipe TypeScript untuk generate & apply draf AI.
- `packages/contracts/src/index.ts` — Export modul kontrak AI.
- `packages/contracts/src/contracts.test.ts` — Unit test kontrak validasi payload AI.
- `apps/api/src/config/env.ts` — Konfigurasi environment `GEMINI_API_KEY` dan `GEMINI_MODEL`.
- `.env.example`, `.env.development.example` — Dokumentasi variabel environment Google AI Studio.
- `apps/api/src/modules/ai/geminiClient.ts` — Client Google Gemini AI Studio dengan Structured Outputs dan fallback deterministik.
- `apps/api/src/modules/ai/aiTaskGeneratorService.ts` — Service orkestrasi draf AI dan eksekusi transaksi atomik PostgreSQL.
- `apps/api/src/modules/ai/aiTaskGeneratorController.ts` — Controller REST handler dengan RFC 9457 Problem Details.
- `apps/api/src/modules/ai/aiTaskGeneratorRoutes.ts` — Route router Express terautentikasi.
- `apps/api/src/modules/ai/__tests__/aiTaskGeneratorIntegration.test.ts` — Test integrasi database PostgreSQL untuk AI generator.
- `apps/api/src/app.ts` — Mounting router AI di `/v1`.
- `apps/web/src/lib/api/aiTaskGeneratorService.ts` — Web API client untuk endpoint AI.
- `apps/web/src/components/ui/organisms/AiTaskGeneratorModal.tsx` — Organism modal 2-step (Prompt Input & Interactive Preview Tabs).
- `apps/web/src/components/ui/organisms/__tests__/AiTaskGeneratorModal.test.tsx` — Unit test interaksi dan tab preview.
- `apps/web/src/components/ui/organisms/CreateTaskModal.tsx` — Penambahan shortcut banner ke AI generator.
- `apps/web/src/components/ui/organisms/__tests__/CreateTaskModal.test.tsx` — Test unit shortcut banner.
- `apps/web/src/components/ui/organisms/taskHub/TaskHubHeader.tsx` — Tombol aksi `Buat via AI`.
- `apps/web/src/components/ui/templates/TaskHubDashboardTemplate.tsx` — Integrasi modal AI dan pembukaan otomatis task baru.
- `apps/web/src/features/tasks/index.ts` — Re-export `AiTaskGeneratorModal`.
- `docs/features/AI_TASK_GENERATOR_MODAL.md` — Feature Knowledge Card.
- `TODO.md` — Pembaruan status backlog aktif.

## Validation

- `npm run docs:check`: 5/5 lulus (governance policy, markdown links, validasi feature card).
- `npm --prefix packages/contracts test`: 80/80 passed, 0 failed, 0 skipped.
- `NODE_ENV=test node --test apps/api/dist/modules/ai/__tests__/aiTaskGeneratorIntegration.test.js`: 4/4 passed against disposable PostgreSQL; termasuk rollback Product Brief, RBAC dev denial, dan audit subtask.
- `npm --prefix apps/web test -- src/components/ui/organisms/__tests__/AiTaskGeneratorModal.test.tsx src/components/ui/organisms/__tests__/CreateTaskModal.test.tsx src/lib/api/__tests__/apiClient.test.ts`: 16/16 passed.
- `npm --prefix apps/api run typecheck`: 0 error.
- `npm --prefix apps/web run typecheck`: 0 error.
- `npm --prefix apps/web run build`: 1,722 modul Vite berhasil terbangun bersih (exit 0) dengan chunk `aiTaskGenerator` terisolasi.

## Risks or follow-up

- Pengguna di lingkungan produksi/development perlu menambahkan `GEMINI_API_KEY` dari [Google AI Studio](https://aistudio.google.com/) pada file `.env` root.
- CI tetap perlu memverifikasi perubahan ini sebelum status rilis; runtime Gemini hidup belum menjadi bukti dari test deterministic.

## TODO update

- `AI-TASK-GENERATOR-MODAL` → `In progress` until CI or an independent verifier accepts the evidence package.
