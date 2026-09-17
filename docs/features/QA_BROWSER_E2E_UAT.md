# QA Browser E2E and UAT

**Status:** Active (development/test; belum Production)
**Owner:** Codex
**Last reviewed:** 2026-09-17
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Membuktikan alur QA lintas peran melalui browser nyata terhadap API terautentikasi dan PostgreSQL
disposable. Ini adalah test/UAT infrastructure; tidak mengubah perilaku produk atau data Production.

## 2. Requirement dan Acceptance Criteria

- AC-1: setiap eksekusi membuat database PostgreSQL dengan nama acak per proses, menerapkan semua
  migrasi kanonikal, dan hanya menghapus database yang dibuat runner itu sendiri.
- AC-2: browser login memakai cookie sesi dari endpoint autentikasi nyata, bukan token atau role
  yang disuntikkan ke browser.
- AC-3: QA assignee, QA non-assignee, Developer, dan PO dibuktikan pada desktop dan mobile.
- AC-4: factory test hanya membuat record persisted yang contract-valid; UI membaca data kembali
  lewat backend.
- AC-5: Bug dua siklus menampilkan setiap Resolution Event, Retest Attempt, Result, dan evidence
  masing-masing tanpa menggantikan evidence sebelumnya.
- AC-6: deep link Subtask QA untuk QA membuka Area QA, dan refresh browser mempertahankan konteks
  Task serta workspace QA tersebut.
- AC-7: kegagalan jaringan saat memuat eksekusi QA menampilkan error dan aksi coba ulang; aksi itu
  membaca kembali data persisted setelah koneksi pulih.
- AC-8: QA non-assignee tidak menerima item assignee dan backend menolak mutasi Test Cycle langsung
  dari sesi browsernya dengan `403`, sebelum ada record baru tersimpan.
- AC-9: suite berikutnya memperluas jalur stale candidate, Persetujuan QA, dan Keputusan Rilis
  tanpa menggantikan evidence sebelumnya.

## 3. Alur Lintas Peran

Factory membuat Workspace, anggota PO/Developer/dua QA, Feature, Subtask Development, dan Subtask
QA. Masing-masing user login lewat layar browser yang sama. QA assignee menerima task QA; QA
non-assignee tidak menerimanya. Developer dan PO menerima tampilan peran persisted mereka. Skenario
Bug membuktikan dua pasangan `Resolution Event → Retest Attempt`: siklus pertama `reopened` dengan
evidence sendiri, lalu siklus kedua `verified` dengan evidence sendiri. Keduanya dibaca kembali dari
QA Desk, sehingga histori lama tidak tertimpa atau digabungkan di browser.

## 4. Data dan Relasi

Semua data test berada di database acak `qa_management_browser_e2e_<pid>_<timestamp>`. Migrations
dijalankan sebelum test, factory menggunakan model Sequelize nyata, dan database dijatuhkan setelah
runner berakhir. Tidak ada schema, migration aplikasi, atau data Production baru.

## 5. API dan Shared Contract

Playwright menjalankan API Express dan Vite lokal. Browser memanggil endpoint autentikasi, Workspace,
Task, dan Work Queue yang sama seperti produk. Tidak ada endpoint atau shared contract baru.

## 6. Authorization

Role berasal dari membership Workspace persisted dan sesi HttpOnly API. Browser tidak menyuntikkan
role ke localStorage atau Redux. Isolasi assignee adalah assertion browser dan backend read path.

## 7. UI dan Interaction States

Suite memakai Chromium desktop dan viewport iPhone 13. Screenshot QA assignee tersimpan sebagai
artefak runner; trace, screenshot, dan video failure dipertahankan otomatis untuk diagnosis.

## 8. Pengujian dan Evidence

`npm --prefix apps/web run test:e2e` menjalankan migration, build API, server lokal, dan Playwright.
Validasi terakhir menjalankan 16 test pada desktop dan mobile dan seluruhnya lulus. Login helper
menunggu DOM siap dengan timeout 60 detik, dan runner memakai satu worker agar API/Vite serta
PostgreSQL disposable tidak saling berebut resource. Skenario histori Bug dua siklus,
deep link/refresh Subtask QA, error jaringan→coba ulang, dan penolakan mutasi langsung QA
non-assignee tercakup; workflow penuh belum diklaim selesai.

## 9. Release dan Readiness

Tidak ada rollout atau deployment Production. S7 belum selesai sampai alur Bug/retest dua siklus,
permission/error paths, deep-link/refresh, dan audit visual persisted ditambahkan serta lulus.

## 10. Traceability

AC-1--9 → `QA-E2E-S7-BROWSER-UAT` → runner Playwright/factory → artefak browser → laporan S7 →
release gate.
