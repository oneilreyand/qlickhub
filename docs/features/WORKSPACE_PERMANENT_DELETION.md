# WORKSPACE-PERMANENT-DELETION — Owner Permanent Workspace Deletion

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-07
**Applicable Policy IDs:** `AUTH-002`, `AUTH-007`, `DATA-001`, `DATA-002`, `DATA-003`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-002`, `DOC-004`

## 1. Tujuan dan Pengguna

Workspace Owner dapat menghapus permanen Workspace yang sudah diarsipkan dan tidak lagi diperlukan.
Penghapusan mencakup seluruh data milik Workspace dan attachment pada storage, tetapi tidak
menghapus akun pengguna. Admin, PO, Developer, dan QA tidak mendapat akses ke aksi ini.

## 2. Requirement dan Acceptance Criteria

- **WPD-R1 / WPD-AC1:** Hanya persisted Owner yang dapat menjalankan permanent deletion.
- **WPD-R2 / WPD-AC2:** Workspace aktif ditolak; Workspace harus diarsipkan terlebih dahulu.
- **WPD-R3 / WPD-AC3:** Nama konfirmasi wajib sama persis dengan nama Workspace saat ini.
- **WPD-R4 / WPD-AC4:** Sukses menghapus seluruh record Workspace dan attachment storage tanpa
  menghapus akun pengguna.
- **WPD-R5 / WPD-AC5:** Kegagalan storage tidak boleh dilaporkan sebagai sukses dan membatalkan
  penghapusan record database.
- **WPD-R6 / WPD-AC6:** Setelah sukses, UI memilih Workspace lain atau menampilkan state tanpa
  Workspace.

Sumber keputusan: instruksi eksplisit pengguna pada 2026-09-07 dan decision record pada folder
`docs/adr/`.

## 3. Alur Lintas Peran

Owner mengarsipkan Workspace, membuka Workspace Settings, mengetik nama Workspace persis, lalu
mengonfirmasi penghapusan permanen. Role lain tetap dapat membaca Workspace archived sesuai
membership tetapi tidak melihat atau dapat memanggil aksi penghapusan. Setelah sukses, seluruh role
kehilangan konteks Workspace karena record membership ikut terhapus.

## 4. Data dan Relasi

`workspaces` adalah akar purge. Transaksi menghapus `auth_security_events` yang merujuk Workspace
secara eksplisit, lalu menghapus Workspace agar foreign key cascade menghapus Folder, Task,
Requirement, QA, Bug, release, notification, membership, permission, dan activity records. User
records dipertahankan. Storage menghapus direktori Workspace beserta attachment secara permanen.
Tidak ada migrasi skema; risiko utama adalah konsistensi database-storage dan graph foreign key.

## 5. API dan Shared Contract

`DELETE /v1/workspaces/:workspaceId` menerima shared input `confirmationName` dan mengembalikan
identitas Workspace yang telah dihapus beserta `deleted: true`. Validation, archived-state conflict,
authorization, dan storage failure menggunakan canonical Problem Details.

## 6. Authorization

`AUTH-007` dan `AUTH-002` berlaku. Route memerlukan membership `owner`; service mengunci record dan
memastikan `workspaces.owner_id` sama dengan authenticated user sebelum mutasi dilakukan.

## 7. UI dan Interaction States

Route `/workspaces/settings` memakai `Button`, `Input`, `Alert`, dan `Modal` yang sudah ada. Aksi
hanya tampil untuk Owner saat archived. Modal menjelaskan cakupan permanen, menyediakan exact-name
confirmation, keyboard focus, loading state, disabled state, error snackbar, dan tombol batal.
Layout harus tetap berfungsi pada desktop dan mobile.

## 8. Pengujian dan Evidence

Shared contract test memvalidasi confirmation input. PostgreSQL integration test memverifikasi
Owner-only, state archived, exact-name confirmation, complete persisted purge, retained users, dan
storage cleanup. Frontend test memverifikasi visibility, disabled confirmation, request, success
navigation/state, serta error handling. Hasil aktual dicatat dalam report setelah dijalankan.

## 9. Release dan Readiness

Tidak ada perubahan QA readiness atau release calculation. Release memerlukan clean migration
verification meskipun tidak ada migrasi baru, API/web build, dan validasi UI. Rollback kode dapat
menghapus endpoint, tetapi data yang sudah dipurge tidak dapat dipulihkan.

## 10. Traceability

WPD-R1–R6 → WPD-AC1–AC6 → shared Workspace contract → Workspace route/service/controller →
Workspace Settings modal → PostgreSQL/storage integration test → frontend test → task report.
