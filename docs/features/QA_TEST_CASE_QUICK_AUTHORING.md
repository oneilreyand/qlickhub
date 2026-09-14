# QA-TEST-CASE-QUICK-AUTHORING — Nomor Otomatis dan Edge Case

**Status:** Active
**Owner:** QA / Product
**Last reviewed:** 2026-09-14
**Applicable Policy IDs:** `AUTH-001`, `DATA-001`, `DATA-002`, `CONTRACT-001`, `QA-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`

## 1. Tujuan dan Pengguna

Mempercepat QA menyusun Test Case dengan menghapus kebutuhan mengetik nomor secara manual dan
menambahkan klasifikasi `edge` untuk kondisi batas. Fitur digunakan QA, PO, Admin, dan Owner pada
authoring native serta impor spreadsheet. Perubahan tidak mencakup penyederhanaan field lain,
perubahan lifecycle, atau kewenangan penerbitan.

## 2. Requirement dan Acceptance Criteria

- **QA-TC-QUICK-01:** Test Case baru tanpa referensi mendapat nomor `TC-xxxx` unik per Workspace.
  - **AC-01:** Workspace baru memulai dari `TC-0001`.
  - **AC-02:** Penyimpanan bersamaan menghasilkan nomor berbeda dan naik monoton.
  - **AC-03:** Nomor yang pernah dialokasikan tidak digunakan ulang.
  - **AC-04:** Referensi eksplisit dari API atau impor lama tetap diterima dan tetap unik.
- **QA-TC-QUICK-02:** QA dapat memilih skenario `edge`.
  - **AC-05:** Form, shared contract, API, model, database, preview, dan commit impor menerima
    `edge` tanpa mengubah default `positive`.
  - **AC-06:** Form native menampilkan nomor hanya-baca dan menjelaskan bahwa nomor dibuat otomatis.

## 3. Alur Lintas Peran

QA atau Planner membuka form, mengisi definisi Test Case, memilih skenario, dan menyimpan draf.
PostgreSQL mengalokasikan nomor bila referensi kosong. QA tetap hanya dapat membuat draf dan
mengajukannya untuk review; PO/Admin/Owner tetap memegang penerbitan. Pada impor, nomor kosong
dialokasikan ketika commit, sedangkan referensi eksplisit mengikuti deteksi duplikat yang ada.

## 4. Data dan Relasi

`test_case_reference_counters` memiliki satu baris per Workspace dan foreign key cascade ke
`workspaces`. Trigger `BEFORE INSERT` pada `test_cases` mengalokasikan nomor atomik atau memajukan
counter saat menerima referensi `TC-<angka>` eksplisit. Migrasi additive menginisialisasi counter
dari nomor numerik terbesar yang sudah ada dan memperluas check constraint `scenario_kind` dengan
`edge`; record Test Case lama tidak diubah.

## 5. API dan Shared Contract

Endpoint create/update Test Case dan preview/commit import tidak berubah. `externalReference` tetap
opsional pada input create untuk kompatibilitas integrasi. `TestCaseScenarioKindSchema` pada
`packages/contracts/src/testManagement.ts` menerima `positive | negative | edge`. Respons create
mengembalikan nomor yang sudah dialokasikan database.

## 6. Authorization

`AUTH-001` dan `QA-001` tetap berlaku. Trigger tidak memberi jalur mutasi baru; request harus lolos
membership dan policy service yang sudah ada. Frontend hanya menyembunyikan pengeditan nomor pada
form native dan bukan lapisan otorisasi.

## 7. UI dan Interaction States

`TestCaseFormModal` memakai atom `Input` hanya-baca dan `Select` yang ada, dengan helper text serta
label aksesibel. Layout grid yang sama tetap responsif pada desktop/mobile dan mengikuti token
light/dark. Loading, error, disabled submit, requirement kosong, dan permission states tetap memakai
alur yang sudah tersedia. Wizard impor menjelaskan nomor opsional dan pilihan `edge`.

## 8. Pengujian dan Evidence

- Contract test membuktikan `edge` diterima dan nomor tidak wajib pada create.
- Frontend test membuktikan nomor hanya-baca, teks otomatis, dan opsi Edge Case tersedia.
- HTTP/PostgreSQL integration test membuktikan alokasi paralel, scope Workspace, persistensi `edge`,
  referensi eksplisit, serta impor dengan nomor kosong.
- Clean migration verification membuktikan seluruh migrasi dapat diterapkan dari database kosong.
- Hasil aktual dicatat pada `docs/reports/QA_TEST_CASE_QUICK_AUTHORING_2026-09-14.md`.

## 9. Release dan Readiness

Migrasi harus dijalankan sebelum API/web baru. Rollback aplikasi aman selama API lama tidak membaca
record `edge`; rollback migrasi ditolak bila record `edge` sudah tersimpan agar data tidak dirusak.
Backup dan audit migrasi wajib dilakukan sebelum Production. Deployment Production tidak termasuk
dalam implementasi ini kecuali diminta eksplisit.

## 10. Traceability

`QA-TC-QUICK-01/02` → `AC-01..06` → TODO `QA-TEST-CASE-QUICK-AUTHORING` → shared contract,
migration 70, Test Case model/services, native form/import wizard → contract/frontend/PostgreSQL
tests → agent report → release decision terpisah.
