# QA Prevalidated Completion and Sign-off

**Status:** Active (development/test; belum Production)
**Owner:** Codex
**Last reviewed:** 2026-09-16
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

QA assignee tidak boleh melihat tombol selesai atau Persetujuan QA sebagai tindakan yang tampak tersedia apabila backend akan menolaknya. UI membaca capability persisted yang sama dengan enforcement backend, menjelaskan remediasi blocker, dan hanya menawarkan Siklus Pengujian scoped yang dapat disertifikasi.

## 2. Requirement dan Acceptance Criteria

- Acceptance 1: Penyelesaian QA hanya aktif ketika `QaWorkflowSummary` menyatakan `complete_qa_subtask` tanpa blocker.
- Acceptance 2: Persetujuan QA hanya aktif ketika summary menyatakan `record_qa_sign_off`, dengan Siklus Pengujian milik assignee yang sama.
- Acceptance 3: loading atau error summary membuat tindakan fail-closed dan menjelaskan penyebabnya.
- Acceptance 4: setiap blocker menampilkan langkah remediasi dalam bahasa pengguna.
- Acceptance 5: state berubah setelah layar dimuat tetap ditolak server; UI menampilkan error server tanpa menganggap mutasi berhasil.

## 3. Alur Lintas Peran

QA menjalankan pengujian dan bukti pada Siklus Pengujian scoped. Saat evidence lengkap, summary mengaktifkan penyelesaian QA. Setelah status persisted menjadi selesai, summary yang direfresh mengaktifkan Persetujuan QA dan panel hanya menawarkan satu cycle yang sama. Developer memperbaiki Bug melalui workflow Bug; PO tetap membuat Keputusan Rilis secara independen dan melalui policy yang ada.

## 4. Data dan Relasi

Perubahan adalah proyeksi UI read-only dari QA Subtask, Test Cycle, Test Run/Result/evidence, Bug/retest, dan completion gate. Tidak ada data atau relasi baru, migration, backfill, atau mutation audit baru.

## 5. API dan Shared Contract

Memakai `QaWorkflowSummary` dan endpoint summary yang sudah ada dari S3. Tidak ada endpoint atau shared contract baru. Ringkasan diteruskan dari `QaTestingDesk` ke `ReleaseAssurancePanel`; setelah mutasi terkait, ringkasan dimuat ulang dari backend.

## 6. Authorization

UI tidak menambah hak. Summary hanya tersedia untuk QA assignee; UI tetap mematikan action saat summary tidak tersedia. `updateTask`, `createQaSignOff`, dan `createReleaseDecision` tetap menjadi enforcement backend fail-closed bila data berubah setelah pembacaan UI.

## 7. UI dan Interaction States

Penyelesaian QA memiliki disabled state dan tooltip dengan next action backend. Panel Persetujuan QA menampilkan loading, error, blocker/remediasi, atau readiness confirmation. Saat siap, modal mengunci pilihan ke satu Siklus Pengujian dari summary, bukan daftar cycle Feature yang lebih luas. Kontrol menggunakan atom/molecule existing dan tetap keyboard accessible.

## 8. Pengujian dan Evidence

`QaTestingDesk.test.tsx` membuktikan completion disabled saat blocker dan enabled saat capability selesai. `ReleaseAssurancePanel.test.tsx` membuktikan sign-off fail-closed serta dropdown hanya memuat cycle backend-selected; seluruh regresi targeted dicatat pada laporan S5. Enforcement PostgreSQL untuk gate/ownership sudah dibuktikan oleh test integration S3/S2 dan tidak diubah oleh slice UI ini.

## 9. Release dan Readiness

Tidak ada rollout atau deployment Production. Browser E2E terautentikasi dan audit visual persisted desktop/mobile tetap scope S7. S6 menangani konsistensi bahasa dan histori lebih luas.

## 10. Traceability

Acceptance 1--5 → `QA-E2E-S5-PREVALIDATED-COMPLETION-SIGNOFF` → `QaWorkflowSummary`, QA Desk, Release Assurance → UI regression → laporan S5 → release gate backend yang telah ada.
