# Agent Report — QA Workflow & Test Management UX Enhancement

## Task

QA-WORKFLOW-AND-TEST-MANAGEMENT-UX-ENHANCEMENT — Sempurnakan alur kerja pengujian QA pada `QaTestingDesk` dan `TestCaseFormModal` untuk membuka aksi review subtask pengembang yang hilang, memperjelas hierarki tombol draf vs review, serta memberikan panduan requirement proaktif.

## Outcome

1. **Review Dead-end Resolved for Developer Subtasks in Review:**
   Di `QaTestingDesk.tsx`, sebelumnya subtask pengembang (`deliveryArea !== 'qa'`) yang berstatus `in_review` menyembunyikan seluruh aksi status dari QA karena guard lama hanya memeriksa apakah QA adalah assignee subtask tersebut (`subtask.assigneeId === currentUserId`). Kini, reviewer QA dan Planner terotorisasi (`canReviewDevSubtask`) dapat melakukan:
   - **Lolos Review & Selesaikan:** Memperbarui status ke `done`.
   - **Minta Revisi:** Membuka modal input `reviewNotes` wajib, lalu memperbarui status ke `changes_requested` sesuai kebijakan otorisasi backend `taskPolicy.ts`.
   - **Anti-Self-Approval Enforcement:** Pengembang yang membuka subtask miliknya yang sedang `in_review` melihat penjelasan visual bahwa subtask sedang menunggu review dari reviewer lain, mencegah persetujuan mandiri.

2. **Hierarki Aksi Form Test Case Dibenahi:**
   Di `TestCaseFormModal.tsx`, tombol **"Ajukan untuk Review"** kini menjadi tombol primer (*brand accent*), sementara **"Simpan Draf"** menjadi tombol sekunder/outline dengan *helper text* panduan di bagian bawah form agar pengguna memahami perbedaan penyimpanan internal QA vs pengajuan review ke Product Owner.

3. **Status Badge Test Case Lebih Informatif:**
   Badge status Test Case pada kartu pengujian kini menampilkan teks deskriptif dalam Bahasa Indonesia:
   - `active` ➔ **Aktif (Siap Diuji)** (`variant="brand"`)
   - `in_review` ➔ **Menunggu Review PO** (`variant="review"`)
   - `draft` ➔ **Draf** (`variant="draft"`)

4. **Panduan Requirement Proaktif:**
   Jika sebuah Feature belum memiliki Requirement aktif yang tertaut, meja kerja pengujian menampilkan panduan spesifik peran (meminta PO menautkan Requirement atau menginstruksikan QA untuk berkoordinasi dengan PO).

5. **Penyambungan Eksekusi QA ke QA Sign-off:**
   Saat QA menyelesaikan subtask QA, pesan konfirmasi mengarahkan QA untuk meninjau panel Jaminan Rilis (*Release Assurance Panel*) untuk menerbitkan Sertifikasi QA (*QA Sign-off*).

## Source of truth and impact

- **Applicable SSoT:** [Workflow SDLC Role](../2_WORKFLOW_AND_ROLES.md#aturan-transisi-subtask),
  [Architecture RBAC and Task Policy](../1_ARCHITECTURE.md#separation-of-duties-sod),
  [Atomic UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md), and
  [Agent Guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `AUTH-001`, `AUTH-002`, `FLOW-001`, `FLOW-002`, `QA-001`, `QA-002`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`.
- **Data/interface impact:** None. Menggunakan endpoint terotorisasi `PATCH /v1/workspaces/:workspaceId/tasks/:taskId` dan kontrak API yang sudah ada; tidak ada skema atau kontrak baru yang dimutasi.
- **Authorization impact:** Otorisasi backend dipertahankan 100%. Hak review QA dan larangan anti-self-approval tetap ditegakkan oleh Express/PostgreSQL policy.
- **Migration risk:** None. Tidak ada migrasi basis data.

## Changed files

- `apps/web/src/components/ui/organisms/myTasks/QaTestingDesk.tsx` — menambahkan guard `canReviewDevSubtask`, tombol "Lolos Review & Selesaikan", tombol "Minta Revisi", modal catatan revisi, pemetaan badge status test case, panduan requirement proaktif, dan feedback snackbar.
- `apps/web/src/components/ui/organisms/myTasks/TestCaseFormModal.tsx` — merapikan hierarki tombol draf vs review, menjadikan "Ajukan untuk Review" sebagai tombol primer, dan menambahkan panduan teks di footer.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/QaTestingDesk.test.tsx` — menambahkan 2 tes unit baru untuk review subtask pengembang oleh QA dan penegakan anti-self-approval.
- `apps/web/src/components/ui/organisms/myTasks/__tests__/TestCaseFormModal.test.tsx` — membuat tes unit untuk TestCaseFormModal yang memvalidasi hierarki tombol dan aktivasi oleh PO.
- `TODO.md` — memperbarui status pekerjaan aktif.
- `docs/reports/QA_WORKFLOW_AND_TEST_MANAGEMENT_UX_ENHANCEMENT_2026-09-14.md` — laporan implementasi dan bukti pengujian.

## Validation

- `npm --prefix apps/web test QaTestingDesk` — lulus 15/15 tes unit di `QaTestingDesk.test.tsx`.
- `npm --prefix apps/web test TestCaseFormModal` — lulus 2/2 tes unit di `TestCaseFormModal.test.tsx`.
- `npm --prefix apps/web test` — lulus seluruh 464 tes pada 88 file tes frontend (0 gagal, 0 diskip).
- `npm --prefix apps/api test:integration` — lulus seluruh 422 tes pada 96 suite integrasi PostgreSQL (0 gagal, 0 diskip).
- `npm --prefix packages/contracts test` — lulus seluruh 69 tes kontrak (0 gagal, 0 diskip).
- `npm run validate` — lulus tata kelola dokumentasi (5/5), linting 0 error, dan typecheck lengkap 0 error pada contracts, api, dan web.
- `npm run build` — lulus build penuh produksi Vite/Express/Contracts (1.710 modul ditransformasi).
- `git diff --check` — lulus tanpa masalah spasi atau sintaks.

## Risks or follow-up

- Tidak ada risiko regresi pada pekerjaan Codex (`MY-TASKS-CREATED-BY-ME`) karena cabang telah disinkronkan dengan `origin/main` terbaru (`0e6dc11` / `f73aa14`).
- Langkah berikutnya: Menggabungkan (*merge*) branch `audit_qa_flow` ke `main` dan merilis build terbaru ke Vercel Production.
