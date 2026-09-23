# QA Nonfinancial QRIS Sandbox

**Status:** Active
**Owner:** Product, QA, dan Engineering
**Last reviewed:** 2026-09-19
**Applicable Policy IDs:** `AUTH-009`, `QA-001`, `QA-002`, `QA-006`, `QA-007`, `DATA-001`, `DATA-005`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

QA membutuhkan target yang dapat benar-benar dipanggil untuk memvalidasi alur QRIS tanpa
menghubungi acquirer, bank, merchant, maupun saldo pelanggan. Target hanya tersedia untuk anggota
QA terautentikasi di Workspace yang memiliki Test Cycle dan Test Run yang sah. Transaksi selalu
bernominal `0` IDR dan secara eksplisit bertanda nonfinansial.

Di luar cakupan: payload QRIS/EMVCo resmi, penerimaan pembayaran, webhook dari pihak ketiga,
rekening/merchant nyata, atau keputusan rilis pembayaran finansial.

## 2. Requirement dan Acceptance Criteria

1. QA dapat memulai transaksi sandbox dari Test Run aktif yang terikat pada kandidat sandbox.
2. Backend menolak nominal selain nol, mata uang selain IDR, Test Run di luar Workspace, dan role
   selain QA.
3. Respons menegaskan bahwa transaksi nonfinansial dan tidak dapat membayar pihak mana pun.
4. Setiap transaksi sandbox memiliki catatan persisten, idempotensi, dan status audit yang dibaca
   ulang dari PostgreSQL.
5. Hasil Test Run tetap dicatat melalui alur Test Result dan evidence yang sudah kanonis; sandbox
   tidak mengisi hasil, Bug, Retest, atau video secara otomatis.

## 3. Alur Lintas Peran

PO tetap menentukan Requirement dan keputusan rilis. QA membuat atau memilih Test Cycle dengan
kandidat sandbox, mengaktifkan Test Case sesuai scope, memulai Test Run, lalu menjalankan skenario
sandbox. Developer dapat membaca jejak audit tetapi tidak dapat menciptakan atau mengubah
transaksi sandbox. Bila respons target tidak sesuai, QA mencatat Result lalu membuat Bug melalui
alur Bug kanonis.

## 4. Data dan Relasi

Entitas `qris_sandbox_transactions` akan menjadi child dari Workspace, Test Run, dan Test Case,
dengan pembuat QA, nominal nol, mata uang IDR, kunci idempotensi, status, dan waktu audit. Semua
foreign key bersifat Workspace-scoped. Ini membutuhkan migrasi additive serta model/association
Sequelize baru; tidak ada data QRIS nyata yang dimigrasikan.

## 5. API dan Shared Contract

Rute berada di bawah
`/v1/workspaces/:workspaceId/qa-sandbox/qris`. Contract Zod bersama memvalidasi UUID scope,
nominal nol, `IDR`, kunci idempotensi, serta status sandbox yang terbatas. Error menggunakan RFC
9457 yang sudah kanonis.

## 6. Authorization

QA assignee yang memiliki Test Run aktif dapat membuat dan membaca transaksi dalam scope-nya.
Owner/Admin/PO dapat membaca audit sesuai akses Workspace; Developer tidak dapat membuat atau
mengubah transaksi. Authorization backend adalah sumber kebenaran; UI hanya menampilkan aksi yang
diizinkan.

## 7. UI dan Interaction States

Kontrol sandbox terlindungi berada di riwayat Test Run pada `QaTestingDesk` dan memakai komponen
Atomic Design yang ada. Kontrol menampilkan label nonfinansial, nominal nol, status transaksi, serta
state loading, empty, error, disabled, dan permission-denied. Tidak ada tampilan yang menyerupai
QRIS atau instruksi pembayaran riil.

## 8. Pengujian dan Evidence

Typecheck dan build lintas package telah lulus. Smoke test terautentikasi Production membuktikan
Test Cycle/Test Run persisten, transaksi Rp0, transisi `pending → expired`, dan pemanggilan ulang
idempoten. Integration test PostgreSQL disposable membuktikan scope Workspace, role, idempotensi,
nominal/mata uang, status final, dan persistensi audit. Bukti video hanya dapat ditambahkan QA
setelah eksekusi nyata pada sandbox.

## 9. Release dan Readiness

Rilis memerlukan clean/upgrade migration, backup/recovery plan, persetujuan eksplisit target
Production untuk migrasi, deployment yang kompatibel, dan smoke test terautentikasi. Rollback
aplikasi tidak menjalankan down migration otomatis.

## 10. Traceability

Requirement QRIS → Test Case aktif → Test Cycle kandidat sandbox → Test Run → transaksi sandbox
persisten → Test Result/evidence → Bug/retest bila benar-benar ditemukan → laporan audit →
keputusan PO.
