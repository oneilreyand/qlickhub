# QA Progressive Disclosure

**Status:** Active (development/test; belum Production)
**Owner:** Codex
**Last reviewed:** 2026-09-16
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

QA Desk sebelumnya menampilkan authoring, Test Run, Bug, diskusi, dan Persetujuan QA dalam satu scroll panjang. Pengguna QA kini melihat konteks dan satu tahap kerja pada satu waktu: Ikhtisar, Persiapan & Eksekusi, Bug & Retest, atau Persetujuan & Riwayat. Ini tidak mengubah urutan workflow, data, maupun hak akses.

## 2. Requirement dan Acceptance Criteria

- Acceptance 1: hanya panel tahap aktif yang dirender; header konteks dan ringkasan workflow tetap terlihat.
- Acceptance 2: Test Case/Run berada di Persiapan & Eksekusi; Bug berada di Bug & Retest; Release Assurance dan diskusi berada di Persetujuan & Riwayat.
- Acceptance 3: navigasi tab dapat dipakai mouse dan keyboard, dengan target sentuh minimum dari molecule Tabs yang ada.
- Acceptance 4: deep-link Test Case dan Persetujuan QA membuka tahap yang tepat tanpa menghitung gate di React.
- Acceptance 5: tindakan Catat Bug tidak lagi bersaing dengan tindakan eksekusi pada header global.

## 3. Alur Lintas Peran

QA assignee membaca Ringkasan Workflow QA dan memilih tahap sesuai tindakan berikutnya. Persiapan menangani Test Cycle, Test Case, Run, Result, dan evidence. Bug & Retest menangani pelaporan Bug serta menjelaskan bahwa retest dimulai dari antrean Bug scoped. Persetujuan menampilkan gate, sign-off, dan diskusi. Developer dan PO tetap hanya memperoleh kontrol yang dibolehkan policy yang ada.

## 4. Data dan Relasi

Perubahan hanya mengatur presentasi state yang sudah ada: QA Subtask, workflow summary, Test Cycle/Run/Result, Bug, dan release records. Tidak ada persistence baru, migration, backfill, atau perubahan relasi.

## 5. API dan Shared Contract

Tidak ada endpoint atau shared contract baru. Panel tetap membaca `QaWorkflowSummary`, execution workspace, Bug workflow, dan release assurance melalui interface terautentikasi yang sudah ada.

## 6. Authorization

UI hanya menyusun ulang kontrol. Test Run/Result, Bug, completion, dan sign-off tetap menggunakan backend policy/service sebagai enforcement akhir. CTA Catat Bug hanya diberikan kepada QA assignee sebagaimana sebelumnya.

## 7. UI dan Interaction States

`QaTestingDesk` memakai `Tabs` existing sebagai navigasi horizontal yang dapat discroll pada mobile serta keyboard Arrow/Home/End. Tab aktif menjadi satu `tabpanel`; konten tahap lain tidak dirender. Ikhtisar mempertahankan konteks deliverable, Persiapan menampung state loading/empty/error execution yang ada, Bug menyajikan empty/blocked guidance dari summary backend, dan Persetujuan menampung state release assurance serta diskusi.

## 8. Pengujian dan Evidence

`QaTestingDesk.test.tsx` membuktikan selection tahap, satu panel aktif, navigasi keyboard, jalur Bug modal setelah memilih tahapnya, dan regresi execution/authorization yang sudah ada. Typecheck dan build web akan dicatat pada laporan S4 setelah validasi akhir.

## 9. Release dan Readiness

Tidak ada rollout atau deployment Production. Browser E2E terautentikasi dan audit visual dengan data persisted masih merupakan scope S7; S5 tetap menangani pre-validation completion/sign-off yang lebih kaya.

## 10. Traceability

Acceptance 1--5 → `QA-E2E-S4-PROGRESSIVE-DISCLOSURE` → `QaTestingDesk` dan `Tabs` → regression UI → laporan S4 → gate release yang telah ada.
