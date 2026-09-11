# GUARDED-MISTAKEN-REQUIREMENT-DELETION Guarded Mistaken Requirement Deletion

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-11
**Applicable Policy IDs:** `DOMAIN-003`, `DOMAIN-004`, `AUTH-002`, `FLOW-002`, `QA-002`, `DATA-001`, `DATA-004`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Fitur ini memungkinkan Owner, Admin, atau Product Owner menghapus permanen satu atau banyak
Requirement yang salah dibuat tetapi belum dipakai untuk delivery. Fitur tidak menghapus
Requirement yang sudah memiliki traceability; jalur tersebut tetap menggunakan `deprecated`.

## 2. Requirement dan Acceptance Criteria

- **GMRD_REQ_001:** Planner dapat memilih banyak Requirement tertaut dan memilih aksi permanent delete.
- **GMRD_REQ_002:** Penghapusan memerlukan konfirmasi persis `DELETE` dan berjalan atomik.
- **GMRD_REQ_003:** Backend menolak seluruh batch jika satu Requirement tertaut ke Task/Subtask lain,
  Test Case legacy/kanonikal, atau Bug.
- **GMRD_REQ_004:** Penghapusan aman menghapus Requirement, link konteks, dan Acceptance Criteria
  miliknya serta mencatat ringkasan pada Task Activity.
- **GMRD_AC_001:** Memilih sembilan dari sepuluh Requirement menghapus hanya sembilan yang dipilih.
- **GMRD_AC_002:** Role Developer dan QA tidak melihat aksi dan ditolak backend bila memanggilnya.
- **GMRD_AC_003:** Kegagalan guard tidak menghasilkan penghapusan parsial.
- **GMRD_AC_004:** `unlink` dan `deprecate` tetap backward-compatible.

## 3. Alur Lintas Peran

Planner membuka tab Requirements, memilih Requirement yang salah, membuka `Correct selected`, lalu
memilih permanent delete dan mengetik `DELETE`. Backend mengunci dan memvalidasi seluruh pilihan.
Jika aman, data definisi dihapus dan Activity diperbarui; jika tidak, UI menampilkan alasan serta
mengarahkan Planner menggunakan deprecated. Developer dan QA tetap read-only.

## 4. Data dan Relasi

Operasi memakai `requirements`, `acceptance_criteria`, `task_requirements`, `test_case_requirements`,
`requirement_test_cases`, `bugs`, dan `task_activity`. Tidak ada tabel atau kolom baru. Foreign key
dan transaksi PostgreSQL yang ada digunakan untuk menjaga all-or-nothing dan Workspace integrity.

## 5. API dan Shared Contract

`POST /workspaces/:workspaceId/tasks/:taskId/requirements/bulk-correction` menerima aksi tambahan
`delete`. Aksi ini wajib membawa `confirmation: "DELETE"`. Respons tetap berisi `action` dan
`affectedCount`; error dependency menggunakan `409 CONFLICT`, sedangkan konfirmasi salah adalah
validasi `400`.

## 6. Authorization

`AUTH-002`, `FLOW-002`, dan `DATA-004` membatasi mutasi kepada membership aktif `owner`, `admin`,
atau `po`. Route dan service memvalidasi role, Workspace, current Task link, dependency, dan typed
confirmation; UI hanya mempresentasikan izin tersebut.

## 7. UI dan Interaction States

`RequirementManager` menggunakan `Modal`, `Button`, `Input`, `Checkbox`, dan `Alert` yang ada.
Pilihan destructive menjelaskan sifat permanen, input konfirmasi memiliki label aksesibel, tombol
disabled sampai teks tepat, loading mencegah submit ganda, error backend tetap terlihat, dan layout
pilihan bertumpuk pada mobile. Role read-only tidak melihat kontrol koreksi.

## 8. Pengujian dan Evidence

Contract tests mencakup aksi/konfirmasi. PostgreSQL integration tests membuktikan batch aman,
Activity, RBAC, dependency rejection, dan rollback. Frontend tests membuktikan seleksi, typed
confirmation, payload, loading/disabled, dan error. Hasil aktual dicatat di laporan penyelesaian.

## 9. Release dan Readiness

Perubahan kontrak bersifat aditif dan tidak memerlukan migrasi. API dan frontend harus dirilis
bersamaan. Rollback aplikasi tidak membutuhkan rollback skema, tetapi Requirement yang telah
dihapus permanen tidak dapat dipulihkan dari aplikasi.

## 10. Traceability

`GMRD_REQ_001..004` → `GMRD_AC_001..004` → accepted guarded-deletion architecture decision →
shared contract → Requirement service dan UI → PostgreSQL/API/frontend tests → laporan
implementasi. Requirement yang memiliki Test Case, Test Result, atau Bug tetap memakai deprecated
sehingga rantai QA/retest/release tidak berubah.
