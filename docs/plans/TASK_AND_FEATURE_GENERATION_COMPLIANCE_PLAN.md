# Rencana Kepatuhan Alur Pembuatan Feature & Task (Mandatory Subtask, Requirement & Acceptance Criteria)

**Status:** Implemented — merged via PR #14 (`12506f2`); archived as Done
**Tanggal:** 2026-09-30  
**Penulis:** Antigravity  
**Kebijakan Terkait (Policy IDs):** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `FLOW-001`, `FLOW-002`, `FLOW-003`, `AUTH-001`, `AUTH-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `AI-001`, `AI-002`, `AI-003`, `AI-005`, `AI-006`, `AI-007`, `AI-008`, `TEST-001`, `DOC-001`, `DOC-002`, `DOC-003`, `DOC-004`

---

## 1. Fakta Terkonfirmasi (_Confirmed Facts_)

1. **Struktur Domain SSoT (`docs/1_ARCHITECTURE.md` §4):**
   - Hierarki kanonikal: `Workspace → Folder → Feature / Story (Root Task)`.
   - Feature memuat:
     - **Product Brief**: Konteks, In Scope, Out Scope (`DOMAIN-004`).
     - **Requirement**: Entitas tingkat Workspace, ditautkan ke Feature via `task_requirements` (`DOMAIN-003`).
     - **Acceptance Criteria (AC)**: Kriteria penerimaan terukur dengan status aktif di bawah Requirement.
     - **Subtask**: Unit eksekusi 1 tingkat langsung di bawah Feature dengan `deliveryArea` (`frontend`, `backend`, `mobile`, `fullstack`, `qa`).
2. **Kondisi Eksisting AI Task Generator (`AiTaskGeneratorModal` & `aiTaskGeneratorService`):**
   - Prompt sistem AI Gemini (`geminiClient.ts`) sudah menginstruksikan pembuatan Feature, Brief, 1–3 Requirement (berikut AC), dan Subtask teknis.
   - Namun, kontrak API (`ApplyTaskDraftInputSchema` di `packages/contracts/src/aiTaskGenerator.ts`) saat ini menetapkan `requirements` dan `subtasks` sebagai `.optional().default([])`, serta `acceptanceCriteria` sebagai `.default([])` tanpa batasan minimum (`.min(1)`).
   - Antarmuka `AiTaskGeneratorModal.tsx` saat ini mengizinkan pengguna menghapus atau menonaktifkan seluruh subtask dan requirement/AC tanpa ada validasi pencegah (_blocking guard_) saat menekan tombol simpan.
   - Layanan backend `aiTaskGeneratorService.applyDraft` menautkan Requirement ke Root Feature, namun Subtask turunan belum otomatis ditautkan ke Requirement tersebut.
3. **Kondisi Eksisting Manual Task Creation (`CreateTaskModal` & `taskLifecycle.ts`):**
   - `CreateTaskModal.tsx` saat ini hanya mengumpulkan data Root Task dasar (`title`, `description`, `folderId`, `priority`, `startDate`, `dueDate`).
   - Modal manual sama sekali tidak menyediakan input untuk Subtask, Requirement, maupun Acceptance Criteria.
   - Kontrak `CreateTaskSchema` pada `packages/contracts/src/task.ts` bahkan melarang penyertaan `requirementIds` jika `parentTaskId` bernilai kosong (Root Feature).
   - Pengguna terpaksa harus masuk ke `TaskDetailDrawer` secara manual setelah task selesai dibuat hanya untuk menambahkan Subtask dan Requirement/AC.

---

## 2. Keputusan Desain & Alternatif (_Decision Snapshot_)

| Pendekatan                                                                                               | Deskripsi                                                                                                                                                                                                                                      | Kelebihan (Pros)                                                                                                             | Kekurangan (Cons)                                                                                                                               | Rekomendasi                                    |
| :------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------- |
| **Opsi 1: Penguatan Bertahap (Fase 1: AI Guard Ketat + Auto-Link, Fase 2: Form Feature Intake Terpadu)** | Memperketat validasi kontrak & UI pada AI Generator terlebih dahulu (memastikan draf AI 100% wajib punya $\ge 1$ Subtask & $\ge 1$ Requirement dengan $\ge 1$ AC), lalu memperluas form pembuatan manual menjadi Feature Creator yang terpadu. | - Dampak risiko terukur.<br>- Zero breaking changes pada alur data lama.<br>- Menutup celah bypass draf kosong dengan cepat. | Pembuatan manual memerlukan 2 fase pengerjaan.                                                                                                  | **Sangat Direkomendasikan (Pilihan Terpilih)** |
| **Opsi 2: Block Manual Task Creation & Alihkan 100% ke AI Generator**                                    | Menonaktifkan pembuatan task polos, semua tombol "Buat Task" diarahkan ke AI Generator Modal (dengan mode isi manual di dalam preview).                                                                                                        | - Memastikan semua Feature melewati format standar AI generator.<br>- Hanya perlu merawat satu modal preview.                | Pengguna yang ingin input cepat tanpa AI merasa dibatasi.                                                                                       | Tidak Direkomendasikan                         |
| **Opsi 3: Hard Database Constraint (Trigger/Check Constraint di PostgreSQL)**                            | Memasang trigger basis data yang menolak `INSERT` task root jika belum ada baris di `subtasks` dan `task_requirements`.                                                                                                                        | - Penegakan paling keras di level database.                                                                                  | - Transaksi `INSERT` bertahap (parent dulu baru child) menjadi sangat rentan gagal / deadlock.<br>- Memutus kompatibilitas impor data / seeder. | Ditolak (Melanggar `DATA-001`)                 |

---

## 3. Work Readiness Assessment (WRA)

| Dimensi                      | Skor (0–2) | Keterangan                                                                                                               |
| :--------------------------- | :--------: | :----------------------------------------------------------------------------------------------------------------------- |
| **Kejelasan Requirement**    |    `0`     | Sangat jelas: setiap Feature baru wajib memiliki minimal 1 Subtask dan minimal 1 Requirement dengan minimal 1 AC.        |
| **Lapisan Terdampak**        |    `1`     | Kontrak `@qlick/contracts`, backend module `ai` & `tasks`, dan komponen frontend `organisms`.                            |
| **Data & Migrasi**           |    `0`     | Tidak ada migrasi destruktif; menggunakan skema tabel dan relasi yang sudah ada.                                         |
| **Authorization (RBAC)**     |    `0`     | Otorisasi Planner (`owner`, `admin`, `po`) dipertahankan sesuai `AUTH-001` dan `AUTH-002`.                               |
| **Shared Contract**          |    `1`     | Penambahan validasi `.min(1)` pada skema Zod `@qlick/contracts/src/aiTaskGenerator.ts` dan DTO intake.                   |
| **Ketersinggungan Modul**    |    `1`     | Modul AI Task Generator, Task Hub, CreateTaskModal, dan AiTaskGeneratorModal.                                            |
| **Validasi**                 |    `1`     | Tes integrasi PostgreSQL backend, tes unit kontrak, dan tes unit frontend (RTL).                                         |
| **Ketergantungan Eksternal** |    `0`     | Menggunakan deterministic fallback untuk lingkungan pengujian; tidak ada dependensi API eksternal yang tidak terkendali. |
| **TOTAL SKOR**               | **4 / 16** | **Klasifikasi: `Ready`**                                                                                                 |

---

## 4. Ruang Lingkup & Acceptance Criteria (AC)

### Slice 1: Pengetatan Kontrak & Validasi AI Task Generator

- **AC-1.1 (Kontrak Zod Wajib Subtask & Requirement):**
  `ApplyTaskDraftInputSchema` di `@qlick/contracts/src/aiTaskGenerator.ts` memvalidasi bahwa `requirements` memiliki minimal 1 item (`.min(1)`), setiap requirement memiliki `acceptanceCriteria` minimal 1 item (`.min(1)`), dan `subtasks` memiliki minimal 1 item aktif.
- **AC-1.2 (Guard UI pada Pratinjau AI):**
  Komponen `AiTaskGeneratorModal.tsx` menonaktifkan tombol _Terapkan & Buat Feature_ serta menampilkan pesan peringatan yang jelas jika:
  - Jumlah subtask aktif (`enabled: true`) kurang dari 1.
  - Jumlah requirement kurang dari 1.
  - Terdapat requirement yang tidak memiliki satupun butir Acceptance Criteria (AC).
- **AC-1.3 (Auto-Link Subtask ke Requirement pada Backend):**
  Pada `aiTaskGeneratorService.applyDraft`, setiap subtask yang berhasil dibuat otomatis ditautkan ke Requirement utama Feature di dalam transaksi PostgreSQL yang sama, sehingga keterlacakan (_traceability_) terbentuk sejak awal.

### Slice 2: Penyelarasan Pembuatan Manual (Feature & Subtask Intake)

- **AC-2.1 (Penyediaan Spesifikasi Awal pada Pembuatan Task Manual):**
  `CreateTaskModal.tsx` ditingkatkan agar tidak hanya membuat judul task kosong, melainkan menyediakan form minimal untuk:
  - 1 Requirement awal berikut $\ge 1$ Acceptance Criteria.
  - Pilihan cepat pembentukan Subtask awal (minimal 1 area delivery terpilih, misalnya: Frontend, Backend, atau QA).
- **AC-2.2 (Penerapan Atomik Manual Intake):**
  Layanan backend menerima pembuatan Feature lengkap tersebut secara atomik (Root Feature + Requirement + AC + Subtask) tanpa membiarkan Feature kosong tanpa delivery area tersimpan.
- **AC-2.3 (Keamanan Kompatibilitas Mundur):**
  Data historis lama di database yang dibuat sebelum aturan ini tetap dapat dibaca secara aman tanpa menimbulkan error pada pembacaan Task Hub atau My Tasks.

---

## 5. Pemetaan AC ke Bukti Objektif (_AC-to-Evidence Mapping_)

| Acceptance Criterion                        | Level Bukti | Metode Verifikasi                                                                                                          | Lingkungan                    | Pelaksana / Verifikator |
| :------------------------------------------ | :---------: | :------------------------------------------------------------------------------------------------------------------------- | :---------------------------- | :---------------------- |
| **AC-1.1 (Kontrak Zod)**                    |    `E2`     | Automated Contract Unit Test (`npm --prefix packages/contracts test`)                                                      | Local Node.js                 | Developer / Verifikator |
| **AC-1.2 (Guard UI Modal AI)**              |    `E2`     | Unit Test Frontend (`AiTaskGeneratorModal.test.tsx`) dengan skenario submit ditolak saat 0 subtask / 0 AC                  | Local jsdom                   | Developer / Verifikator |
| **AC-1.3 (Auto-link Transaction Backend)**  |    `E3`     | Integration Test PostgreSQL (`aiTaskGeneratorIntegration.test.ts`) memeriksa baris di `task_requirements` untuk ID subtask | Disposable PostgreSQL         | Developer / Verifikator |
| **AC-2.1 & AC-2.2 (Manual Intake Atomik)**  |    `E3`     | Integration Test PostgreSQL & Component Test `CreateTaskModal.test.tsx`                                                    | Disposable PostgreSQL + jsdom | Developer / Verifikator |
| **AC-2.3 (Backward Compatibility & Build)** |    `E2`     | `npm run build`, `npm run typecheck`, dan `npm run docs:check`                                                             | Local environment             | Developer / Verifikator |

---

## 6. Peta Dampak Perubahan (_Change Impact Map_)

1. **Contracts (`packages/contracts`):**
   - `packages/contracts/src/aiTaskGenerator.ts`: Pengetatan schema `ApplyTaskDraftInputSchema` dan `GeneratedRequirementDraftSchema`.
   - `packages/contracts/src/task.ts`: Penyesuaian DTO pembentukan Feature terpadu (jika diperlukan untuk manual intake).
2. **Backend API (`apps/api`):**
   - `apps/api/src/modules/ai/aiTaskGeneratorService.ts`: Penambahan penautan relasi Subtask ke Requirement di dalam `applyDraft`.
   - `apps/api/src/modules/ai/__tests__/aiTaskGeneratorIntegration.test.ts`: Uji regresi penolakan payload tanpa subtask/requirement dan pengujian auto-link.
   - `apps/api/src/modules/tasks/taskService.ts` & `internal/taskLifecycle.ts`: Dukungan penerimaan requirement & subtask awal pada pembuatan task.
3. **Frontend Web (`apps/web`):**
   - `apps/web/src/components/ui/organisms/AiTaskGeneratorModal.tsx`: Validasi UI guard sebelum `handleApply`, indikator counter subtask/AC wajib.
   - `apps/web/src/components/ui/organisms/CreateTaskModal.tsx`: Integrasi spesifikasi kebutuhan & pemilihan delivery area subtask awal.
   - `apps/web/src/components/ui/organisms/__tests__/AiTaskGeneratorModal.test.tsx` & `CreateTaskModal.test.tsx`: Validasi skenario tes.
4. **Dokumentasi & Tata Kelola:**
   - `TODO.md`: Pendaftaran item pekerjaan baru setelah rencana disetujui.
   - `docs/reports/`: Laporan bukti eksekusi pasca-implementasi.
