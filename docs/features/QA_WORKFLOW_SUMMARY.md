# QA Workflow Summary

**Status:** Active (development/test; belum Production)
**Owner:** Codex
**Last reviewed:** 2026-09-16
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

QA assignee memerlukan jawaban ringkas dan benar tentang capability yang sedang diuji, prasyarat yang masih menghalangi, dan satu tindakan berikutnya. Ringkasan ini bukan mekanisme baru untuk mengubah workflow atau sign-off.

## 2. Requirement dan Acceptance Criteria

- Acceptance 1: ringkasan berasal dari Test Cycle persisted dan completion gate kanonik backend.
- Acceptance 2: ringkasan hanya tersedia untuk QA assignee yang berwenang.
- Acceptance 3: UI menyajikan scope, blocker, dan satu next action tanpa menghitung readiness di React.
- Acceptance 4: loading dan error tidak boleh disamarkan sebagai workflow siap dilanjutkan.

## 3. Alur Lintas Peran

Developer menyelesaikan pekerjaan dan perbaikan Bug. QA assignee membuka QA Desk, membaca ringkasan capability dari siklus aktif miliknya, lalu membuat siklus, menjalankan Test Case, merekam hasil, melakukan retest, melengkapi evidence, menyelesaikan QA Subtask, atau mencatat sign-off sesuai tindakan berikutnya. PO dan Developer tidak mendapat endpoint ini sebagai pengganti otorisasi workflow.

## 4. Data dan Relasi

Ringkasan adalah proyeksi read-only dari Workspace membership, QA Subtask, parent Feature, Test Cycle aktif milik assignee, Test Run/Result, Bug, dan completion gate. Tidak ada tabel, relasi, migration, backfill, atau data bisnis baru.

## 5. API dan Shared Contract

`GET /workspaces/:workspaceId/tasks/:taskId/qa-workflow-summary` mengembalikan `QaWorkflowSummary` dari `packages/contracts/src/testManagement.ts`. Kontrak menyertakan scope Feature/QA Subtask, Test Cycle opsional, daftar blocker berkode stabil, dan satu next action.

## 6. Authorization

Route mensyaratkan role QA. Service juga memverifikasi membership, QA delivery subtask, dan actor yang sama sebagai assignee. UI tidak memberi hak baru; mutasi Test Cycle, Result, Bug, completion, dan sign-off tetap menjalankan policy/service masing-masing.

## 7. UI dan Interaction States

`QaTestingDesk` menampilkan kartu Ringkasan Workflow QA memakai Card dan token yang ada. Ia memiliki loading skeleton, error alert, scope siklus, badge prasyarat/siap lanjut, blocker dalam bahasa Indonesia, serta satu CTA tekstual dari backend. Tampilan bersifat informasi dan tidak menggantikan kontrol mutasi yang telah memiliki state permission/disabled sendiri.

## 8. Pengujian dan Evidence

`testManagementApiIntegration.test.ts` membuktikan ringkasan dari PostgreSQL untuk QA assignee dan penolakan bagi Developer. `QaTestingDesk.test.tsx` membuktikan scope, blocker, dan next action ditampilkan dari client API. Build contracts/API, web typecheck, dan validasi repositori dicatat di laporan S3.

## 9. Release dan Readiness

Tidak ada deployment atau rollout Production dalam slice ini. Browser E2E terautentikasi, audit mobile, progressive disclosure, serta sign-off pre-validation lebih lanjut tetap berada pada S4-S7.

## 10. Traceability

Acceptance 1--4 → `QA-E2E-S3-WORKFLOW-SUMMARY-NEXT-ACTION` → shared contract, test-management service/route, dan QA Desk → PostgreSQL integration dan UI regression → laporan S3 → release gate yang sudah ada.
