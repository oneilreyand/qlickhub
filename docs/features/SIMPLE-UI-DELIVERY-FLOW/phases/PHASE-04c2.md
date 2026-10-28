# SIMPLE-UI-DELIVERY-FLOW — Tahap 4: Build Phase 04c2 (P4c-2) — Impor spreadsheet di halaman kerja QA

**Status:** Kandidat teruji — UAT menunggu
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-3.12 (baru)
**Applicable Policy IDs:** AI-009, AI-013, UI-001, UI-002, UI-003, UI-004, UI-005
**Prinsip (Owner):** QA tidak perlu masuk desk QA lengkap hanya untuk mengimpor Test Case dari spreadsheet.

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                  |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | SIMPLE-UI-P4c-2                                                                                                                                                                                                                                                      |
| Branch / baseline                | `feat/simple-ui-p4c-import-spreadsheet`, bertumpuk di `feat/simple-ui-p2c-ac-checks`                                                                                                                                                                                 |
| AC baru                          | **AC-3.12** Given QA yang ditugaskan di halaman kerja QA subtask, when menekan Impor spreadsheet dan menyelesaikan wizard (CSV/JSON/Excel), then Test Case hasil impor muncul di daftar halaman itu tanpa membuka desk QA lengkap; peran lain tidak melihat aksinya. |
| File/path yang diizinkan         | `QaSubtaskWorkView.tsx`, `QaSubtaskWorkSection.tsx`, test terkait, `product.md`, `breakdown.md`, dokumen ini. Tanpa perubahan backend, kontrak, atau migrasi; wizard `TestCaseImportWizardModal` dipakai ulang apa adanya.                                           |
| Di luar scope                    | Penghapusan tab Bug dan desk (langkah P4c berikutnya).                                                                                                                                                                                                               |
| Pemeriksaan yang akan dijalankan | typecheck, eslint, vitest, build, `docs:check`, UAT sebagai QA.                                                                                                                                                                                                      |
| Risiko & recovery                | FE saja dan aditif. Rollback: revert commit.                                                                                                                                                                                                                         |
| Disetujui                        | Owner (arahan di chat: lanjut ke impor spreadsheet)                                                                                                                                                                                                                  |
