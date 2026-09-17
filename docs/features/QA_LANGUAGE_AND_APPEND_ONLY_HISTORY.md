# QA Language and Append-only History

**Status:** Active (development/test; belum Production)
**Owner:** Codex
**Last reviewed:** 2026-09-17
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

QA, Developer, dan PO harus dapat memahami alur tanpa mengetahui nama tabel atau API. Istilah yang
dipakai adalah Siklus Pengujian, Hasil Pengujian, Bukti, Bug, Retest, Persetujuan QA, dan Keputusan
Rilis. Riwayat Bug harus menjelaskan bahwa setiap perbaikan dan retest ditambahkan, bukan menimpa
temuan atau bukti sebelumnya.

S6 hanya mengubah presentasi dan navigasi UI. Ia tidak menambah workflow, data, atau hak akses.

## 2. Requirement dan Acceptance Criteria

- AC-1: label, tombol, toast, status, error, dan empty state menggunakan istilah pengguna yang
  konsisten.
- AC-2: identitas kandidat, ID Resolution Event, dan ID Retest Attempt hanya terlihat dalam
  disclosure `Detail teknis`.
- AC-3: tahap Bug & Retest di Meja QA memuat Bug tertaut Feature dan riwayatnya, sehingga QA tidak
  perlu berpindah ke antrean lain untuk membaca siklus sebelumnya.
- AC-4: setiap Bug menampilkan siklus perbaikan berurutan: Hasil Pengujian asal → Perbaikan
  Developer → Hasil Retest QA, termasuk Bukti yang tersimpan.
- AC-5: pasangan Perbaikan Developer dan Retest dibaca dari relasi `resolutionEventId` persisted;
  React tidak menggabungkan riwayat berdasarkan waktu, status, atau tebakan kandidat.

## 3. Alur Lintas Peran

QA mencatat Hasil Pengujian dan Bukti, lalu mencatat Bug dari hasil gagal/terblokir. Developer
mengirim Resolution Event untuk setiap perbaikan. QA memulai Retest dari Bug tersebut dan mencatat
Hasil Pengujian baru. Timeline mempertahankan Siklus perbaikan #1, #2, dan seterusnya, termasuk
outcome verified atau reopened. PO membaca Persetujuan QA dan membuat Keputusan Rilis melalui
workflow yang telah ada.

## 4. Data dan Relasi

`BugRetestHistory.cycles` yang sudah persisted adalah sumber timeline: setiap cycle memiliki
`resolutionEvent`, `evidenceLinks`, dan `retestAttempt` opsional. Resolution Event dan Retest
Attempt berpasangan melalui ID eksplisit dari backend. S6 tidak membuat schema, migration,
backfill, atau data baru.

## 5. API dan Shared Contract

Memakai `bugService.listBugs`, `bugService.getRetestHistory`, dan `QaWorkflowSummary` yang sudah
ada. Tidak ada endpoint atau shared contract baru. `QaTestingDesk` meneruskan reload summary dan
reload pengujian setelah Retest dibuat dari panel Bug.

## 6. Authorization

Tidak ada hak baru. Policy backend tetap menentukan siapa yang dapat membuat Resolution Event,
memulai Retest, mencatat hasil, dan membuat Persetujuan QA/Keputusan Rilis. UI hanya menampilkan
tindakan yang diizinkan dan tidak menggantikan enforcement server.

## 7. UI dan Interaction States

`QaTestingDesk` memakai Tabs dan `BugExperiencePanel` yang telah ada. Tahap Bug & Retest memiliki
loading, empty, error, permission-denied, dan action state dari panel Bug. Timeline memakai kartu
Siklus perbaikan #n serta disclosure HTML keyboard-accessible untuk detail teknis. Status hasil dan
keputusan diterjemahkan ke bahasa Indonesia; kandidat teknis tidak muncul sebagai label utama.

## 8. Pengujian dan Evidence

Tes komponen membuktikan Bug tertaut dimuat di Meja QA, timeline dua siklus perbaikan dapat dibaca,
dan sign-off tetap terikat ke Siklus Pengujian backend-selected. Tidak ada klaim browser E2E,
PostgreSQL integration, atau audit visual persisted baru pada S6 karena kontrak/persistensi tidak
diubah.

## 9. Release dan Readiness

Tidak ada rollout atau deployment Production. Browser E2E terautentikasi, audit desktop/mobile
dengan data persisted, dan bukti dua siklus retest lintas peran tetap scope S7.

## 10. Traceability

AC-1--5 → `QA-E2E-S6-LANGUAGE-AND-HISTORY` → QA Desk, Bug Experience, Release Assurance, i18n
copy, UI regression → laporan S6 → S7 browser E2E/release gate yang telah ada.
