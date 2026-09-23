# QA XLSX Import Mapping Recovery

**Status:** Draft
**Owner:** Product, QA, dan Engineering
**Last reviewed:** 2026-09-19
**Applicable Policy IDs:** `AUTH-002`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `QA-001`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

QA dan PO perlu mengimpor Test Case dari template CSV atau XLSX dengan header kanonis tanpa
memetakan ulang kolom satu per satu. Bila sumber memakai header yang tidak didukung, pengguna
harus menerima alasan yang menyebut kolom dan baris terdampak, tanpa menampilkan isi data baris
yang sensitif.

Di luar cakupan: mengganti aturan Test Case, Requirement, commit atomic, atau status Test Result.

## 2. Requirement dan Acceptance Criteria

1. XLSX dengan tag XML bernamespace dan header template kanonis menghasilkan preview valid dan
   dapat di-commit bila Requirement aktif tersedia.
2. Header kanonis CSV dan XLSX otomatis dipetakan ke field Test Case yang sama.
3. Header yang tidak dikenali masuk ke layar pemetaan dan menghasilkan error per baris dengan
   nama kolom serta penyebabnya.
4. Commit tetap menggunakan staging server-side dan validasi Requirement aktif yang sudah ada.

## 3. Alur Lintas Peran

QA atau PO mengunggah spreadsheet. Backend membaca header dan menyelesaikan pemetaan kanonis.
Jika semua header dapat dikenali, wizard langsung menampilkan dry-run. Jika ada header asing,
wizard meminta pilihan field tujuan atau pengabaian eksplisit, lalu membuat dry-run baru. QA/PO
hanya dapat commit session miliknya melalui otorisasi Test Management yang ada.

## 4. Data dan Relasi

Tidak ada entitas atau migrasi baru. Preview tetap menyimpan staging import dan baris hasil parse
pada `TestCaseImport` serta `TestCaseImportRow` yang Workspace-scoped. `unmappedHeaders` adalah
metadata respons preview, bukan data bisnis persisten.

## 5. API dan Shared Contract

Endpoint `POST /v1/workspaces/:workspaceId/test-cases/import/preview` mengembalikan
`columnMapping` yang sudah diselesaikan dan `unmappedHeaders`. Contract bersama berada di
`packages/contracts/src/testManagement.ts`. Parser server menerima CSV dan XLSX, termasuk tag
OpenXML yang menggunakan prefix namespace.

## 6. Authorization

Tidak ada kewenangan baru. Backend tetap mengotorisasi preview/commit berdasarkan membership
Workspace dan kebijakan Test Management; tampilan wizard hanya merefleksikan hasil backend.

## 7. UI dan Interaction States

`TestCaseImportWizardModal` menggunakan Modal dan Button dari Atomic Design yang ada. Header
kanonis menuju state preview tanpa layar pemetaan. Header asing menampilkan state mapping dengan
peringatan yang dapat dibaca, selector berlabel, loading, error, disabled, dan jalur kembali.
Layar preview tetap menampilkan status valid/tidak valid per baris.

## 8. Pengujian dan Evidence

Integration test PostgreSQL disposable membuktikan XLSX namespace-qualified dapat dipreview dan
di-commit, serta header tidak dikenal melaporkan kolom, baris, dan penyebab. Test UI membuktikan
jump langsung ke preview untuk header kanonis dan state mapping untuk header asing. Evidence
lengkap tercatat pada laporan 2026-09-19.

## 9. Release dan Readiness

Perubahan bersifat parser, contract, dan UI tanpa migrasi. Sebelum rilis, jalankan build dan suite
terkait pada pipeline. UAT Production harus mengulang upload XLSX audit sebelumnya dengan sesi QA
yang sah; tidak ada data Test Case baru yang boleh di-commit hanya demi membuktikan UAT.

## 10. Traceability

Spreadsheet QA/PO → preview Test Case → staging Import → validasi Requirement aktif → commit
atomic → Test Case draft → laporan handoff. Header asing berhenti pada preview/pemetaan sampai
pengguna memilih tindakan yang tepat.
