# AI-TASK-GENERATOR-MODAL — Generator Feature & Task Bertenaga AI (Google AI Studio)

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-28
**Applicable Policy IDs:** `AI-001`, `AUTH-001`, `AUTH-002`, `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Menyediakan kapabilitas bagi Product Owner (PO) dan tim kepemimpinan produk untuk menyusun perencanaan Feature/Task secara komprehensif hanya dari satu prompt teks deskriptif, menggunakan Google AI Studio (Gemini).

Fitur ini menghasilkan 4 entitas kanonikal sekaligus:

1. **Detail Task** (Judul Feature, Deskripsi Markdown terstruktur, dan Tingkat Prioritas).
2. **Product Brief** (Konteks masalah / latar belakang bisnis, batasan In-Scope, dan batasan Out-of-Scope).
3. **Requirements & Acceptance Criteria** (Daftar Kebutuhan Fungsional beserta kriteria penerimaan pengujian berbasis Given-When-Then / AC).
4. **Subtasks per Delivery Area** (Pecahan tugas teknis untuk Frontend, Backend, Mobile, dan QA).

Sesuai `AI-001`, AI dilarang keras memutasi database secara otonom. Hasil prompt disajikan terlebih dahulu sebagai draf yang mencantumkan sumber `Prompt Product Owner`; pengguna dapat meninjau, mengedit teks secara inline, menambah/menghapus butir cakupan, memilih subtask aktif melalui checklist, lalu menekan tombol persetujuan eksplisit (_Terapkan & Buat Feature_).

## 2. Requirement dan Acceptance Criteria

- **REQ-AI-GEN-01**: Input prompt fleksibel dengan template prompt cepat, pemilih folder target, dan seleksi area kerja (Web, Backend, Mobile, QA).
  - **AC-1**: Pengguna dapat mengetikkan deskripsi fitur minimal 5 karakter dan maksimal 4000 karakter.
  - **AC-2**: Memilih ide prompt cepat otomatis mengisi kolom prompt tanpa reload.
- **REQ-AI-GEN-02**: Pratinjau interaktif (_preview before submit_) dengan 4 tab hierarkis.
  - **AC-3**: Draf hasil AI dikelompokkan ke dalam tab Detail Task, Brief Produk, Requirements, dan Subtasks.
  - **AC-4**: Pengguna dapat menyunting teks, menambah/menghapus butir cakupan in/out scope, serta mengaktifkan/menonaktifkan subtask sebelum submit.
- **REQ-AI-GEN-03**: Pembuatan atomik di PostgreSQL dan pelacakan audit.
  - **AC-5**: Seluruh entitas tersimpan dalam satu transaksi database Sequelize; jika terjadi kegagalan, tidak ada data setengah jadi.
  - **AC-6**: Audit log `task_created` dan `subtask_created` tercatat secara persisten.
- **REQ-AI-GEN-04**: Generator tidak boleh membuat rancangan dari prompt yang jelas tidak dapat dipahami.
  - **AC-7**: Teks acak yang jelas tidak bermakna menghasilkan respons `clarification` tercantum sumber prompt dan sedikitnya satu pertanyaan tindak lanjut; respons itu tidak memuat draf yang dapat diterapkan.
  - **AC-8**: Modal tetap pada langkah input, menampilkan pertanyaan klarifikasi, dan tidak menampilkan kontrol Apply sampai respons `draft` yang ditinjau pengguna diterima.

## 3. Alur Lintas Peran

```mermaid
sequenceDiagram
    actor PO as Product Owner / Admin
    participant UI as AiTaskGeneratorModal (Web)
    participant API as AI Task Generator (Express)
    participant AI as Google AI Studio (Gemini API)
    participant DB as PostgreSQL Database

    PO->>UI: Masukkan prompt fitur & klik 'Generate Draf'
    UI->>API: POST /v1/workspaces/:id/ai/generate-task-draft
    API->>API: Deteksi teks acak yang jelas tidak bermakna
    alt Prompt jelas tidak dapat dipahami
        API-->>UI: 200 OK (`outcome: clarification`)
        UI-->>PO: Tampilkan pertanyaan klarifikasi; tidak ada kontrol Apply
    else Prompt perlu evaluasi AI
        API->>AI: generateContent (Structured Output JSON Schema)
        alt Prompt dapat dipahami
            AI-->>API: Validated JSON Draft
            API-->>UI: 200 OK (`outcome: draft`)
            UI-->>PO: Tampilkan Interactive Preview Tabs
            PO->>UI: Review, edit judul/scope, toggle subtask, klik 'Terapkan'
            UI->>API: POST /v1/workspaces/:id/ai/apply-task-draft
            API->>DB: Atomic Transaction (Task + Brief + Req/AC + Subtasks + Audit)
            DB-->>API: Committed
            API-->>UI: 201 Created (task, created counts)
            UI-->>PO: Toast sukses & buka TaskDetailDrawer
        else Konteks belum cukup
            AI-->>API: JSON clarification
            API-->>UI: 200 OK (`outcome: clarification`)
            UI-->>PO: Tampilkan pertanyaan klarifikasi; tidak ada kontrol Apply
        end
    end
```

## 4. Data dan Relasi

- Entitas yang dibuat:
  - `TaskModel` (Root Task, `parentTaskId = null`)
  - `QaDocumentModel` + `TaskDocumentModel` (Tipe `product_brief`, linkType `primary_prd`)
  - `RequirementModel` + `TaskRequirementModel` + `AcceptanceCriterionModel`
  - `TaskModel` (Subtasks, `parentTaskId = rootTask.id`, `deliveryArea` sesuai platform)
  - `TaskActivityModel` (Jejak audit untuk pembuatan task dan subtask)
- Scope Workspace diisolasi ketat pada `workspaceId`.

## 5. API dan Shared Contract

- Shared Contracts di [`packages/contracts/src/aiTaskGenerator.ts`](../../packages/contracts/src/aiTaskGenerator.ts):
  - `GenerateTaskDraftInputSchema`
  - `GeneratedTaskDraftSchema`
  - `GenerateTaskDraftResponseSchema` (`draft` atau `clarification` tercantum sumber prompt)
  - `ApplyTaskDraftInputSchema`
  - `ApplyTaskDraftResponseSchema`
- Endpoints:
  - `POST /v1/workspaces/:workspaceId/ai/generate-task-draft`
  - `POST /v1/workspaces/:workspaceId/ai/apply-task-draft`

## 6. Authorization

- Sesuai `AUTH-001` dan `AUTH-002`, hanya anggota aktif Workspace dengan peran `owner`, `admin`, atau `po` yang dapat membuat task atau memicu AI Task Generator.
- Peran `dev` dan `qa` atau pengguna di luar Workspace ditolak dengan respons `403 FORBIDDEN`.
- Konfigurasi `GEMINI_API_KEY` disimpan aman di backend (`.env` server-side) dan dilarang keras diekspos ke browser.

## 7. UI dan Interaction States

- Dua titik masuk (_Hybrid Best Practice_):
  1. Tombol `Buat via AI` di [`TaskHubHeader.tsx`](../../apps/web/src/components/ui/organisms/taskHub/TaskHubHeader.tsx).
  2. Banner pintas di bagian atas form [`CreateTaskModal.tsx`](../../apps/web/src/components/ui/organisms/CreateTaskModal.tsx).
- Komponen [`AiTaskGeneratorModal.tsx`](../../apps/web/src/components/ui/organisms/AiTaskGeneratorModal.tsx):
  - Menggunakan Modal ukuran `3xl` dengan Stitch design tokens.
  - Loading spinner & disabled buttons saat proses generasi atau commit.
  - Alert banner kebijakan tata kelola AI `AI-001`.
  - State klarifikasi untuk prompt yang tidak dapat dipahami; state ini tidak pernah membuat atau menampilkan draf yang dapat diterapkan.
  - Aksesibilitas keyboard dan navigasi form responsif.

## 8. Pengujian dan Evidence

- **Contracts Test**: 81/81 tes lulus di `packages/contracts/src/contracts.test.ts`, termasuk union respons klarifikasi tercantum sumber.
- **API Unit Test**: 2/2 tes lulus di `apps/api/src/modules/ai/__tests__/geminiClient.test.ts`; teks acak tidak menghasilkan draf, sedangkan prompt deskriptif tetap menghasilkan draf.
- **Backend PostgreSQL Integration Test**: 5/5 tes lulus di `apps/api/src/modules/ai/__tests__/aiTaskGeneratorIntegration.test.ts`, termasuk klarifikasi tanpa Root Task, generasi non-otonom, otorisasi RBAC, dan mutasi atomik multi-entitas.
- **Frontend Unit Tests**: 5/5 tes lulus di `apps/web/src/components/ui/organisms/__tests__/AiTaskGeneratorModal.test.tsx`, termasuk state klarifikasi tanpa preview atau Apply.
- **Build Checks**: Vite 1,723 modul terbangun bersih tanpa error typecheck.

## 9. Release dan Readiness

- Backward compatible: fitur bersifat _additive_, tidak mengubah schema database atau migrasi yang sudah ada.
- Fallback deterministik hanya berjalan pada `NODE_ENV=test`; runtime tanpa `GEMINI_API_KEY` atau provider gagal menampilkan error aman dan tidak mengembalikan data contoh.

## 10. Traceability

- `AI-001` → Draft-first generation tanpa mutasi otonom.
- `DOMAIN-002` → Root Feature Task dengan Subtask level 1.
- `DOMAIN-004` → Product Brief memiliki konteks dan in/out scope; Requirement memiliki Acceptance Criteria.
- `AUTH-002` → Ditegakkan melalui `assertCanCreateTask`.
