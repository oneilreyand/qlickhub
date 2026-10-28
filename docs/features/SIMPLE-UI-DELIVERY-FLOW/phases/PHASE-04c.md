# SIMPLE-UI-DELIVERY-FLOW — Tahap 4: Build Phase 04c (P4c) — Persetujuan QA di halaman kerja QA (langkah 1)

**Status:** Kandidat teruji — menunggu UAT dan verifier G5
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-3.11 (baru); AC-3.8 diperluas
**Applicable Policy IDs:** AI-009, AI-013, UI-001, UI-002, UI-003, UI-004, UI-005
**Prinsip (Owner):** QA menyelesaikan pekerjaannya di satu halaman baru; desk QA lengkap hanya dipakai bila perlu, lalu dilepas bertahap.

## 1. Temuan (audit)

| Temuan                                                                                                                |
| --------------------------------------------------------------------------------------------------------------------- |
| Persetujuan QA (Setujui/Tolak) hanya ada di desk QA lengkap, sehingga QA terdorong keluar dari halaman kerja QA baru. |
| Item antrean "Persetujuan QA" di Tugas Saya membuka Feature/desk lama, bukan halaman kerja QA.                        |

## 2. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | SIMPLE-UI-P4c-1                                                                                                                                                                                                                                                                                                                           |
| Branch / baseline                | `feat/simple-ui-p4c-qa-sign-off`, bertumpuk di `feat/simple-ui-p3b-steps-environment`                                                                                                                                                                                                                                                     |
| AC baru                          | **AC-3.11** Given QA yang ditugaskan di halaman kerja QA subtask, when membuka halaman, then bagian "Persetujuan QA" tampil dengan aksi Setujui/Tolak yang sama dengan desk lama (panel `ReleaseAssurancePanel mode="qa"`); peran lain tidak melihatnya. Item antrean Persetujuan QA mengarah ke halaman kerja QA subtask milik pengguna. |
| File/path yang diizinkan         | `QaSubtaskWorkView.tsx`, `QaSubtaskWorkSection.tsx`, `MyTasksPage.tsx`, test terkait, `product.md`, `breakdown.md`, dokumen ini. Tanpa perubahan backend, kontrak, atau migrasi.                                                                                                                                                          |
| Rencana teknis                   | Pakai ulang `ReleaseAssurancePanel` sebagai slot `signOffSlot`; muat `qaWorkflowSummary`; arahkan `qa_sign_off` di `handleOpenQueueItem` (tertahan → subtask belum selesai, siap → subtask selesai terbaru).                                                                                                                              |
| Di luar scope                    | Impor spreadsheet, penghapusan tab Bug, pelepasan desk dan `BugExperiencePanel` (langkah P4c berikutnya, masing-masing Approval Window sendiri).                                                                                                                                                                                          |
| Pemeriksaan yang akan dijalankan | typecheck, eslint, prettier, vitest 8 shard, build, `theme:check`, `docs:check`, UAT sebagai QA.                                                                                                                                                                                                                                          |
| Risiko & recovery                | Hanya FE dan aditif; desk lama tetap ada. Rollback: revert commit.                                                                                                                                                                                                                                                                        |
| Disetujui                        | Owner ("ok jalankan" atas rencana audit)                                                                                                                                                                                                                                                                                                  |

## 3. Rencana pemeriksaan acuan AC

| AC      | Bukti                                                                                                                              |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| AC-3.11 | Test `QaSubtaskWorkView` (slot tampil/tidak), `QaSubtaskWorkPage`; UAT: panel tampil untuk QA, item antrean membuka halaman kerja. |
