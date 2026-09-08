# Task and Subtask Schedule Date Pair

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-07
**Applicable Policy IDs:** `FLOW-002`, `FLOW-004`, `CONTRACT-001`, `DATA-002`, `TEST-001`, `UI-001`, `UI-002`, `DOC-002`, `DOC-004`

## 1. Tujuan dan Pengguna

Mencegah Planner menyimpan timeline Task atau Subtask yang hanya memiliki satu batas tanggal.
Perubahan ini mencakup pembuatan dan pengeditan jadwal, tetapi tidak mengubah lifecycle status,
penugasan, atau hak akses.

## 2. Requirement dan Acceptance Criteria

- **REQ-SCHEDULE-PAIR-1:** Timeline Task dan Subtask bersifat opsional sebagai satu kesatuan.
- **AC-SCHEDULE-PAIR-1:** Kedua tanggal kosong dapat disimpan sebagai task tanpa jadwal.
- **AC-SCHEDULE-PAIR-2:** Start Date tanpa Due Date ditolak.
- **AC-SCHEDULE-PAIR-3:** Due Date tanpa Start Date ditolak.
- **AC-SCHEDULE-PAIR-4:** Start Date setelah Due Date ditolak.
- **AC-SCHEDULE-PAIR-5:** Pasangan tanggal dengan Start Date sama dengan atau sebelum Due Date dapat disimpan.
- **AC-SCHEDULE-PAIR-6:** Aturan yang sama berlaku pada pembuatan dan perubahan root Task maupun Subtask.

Sumber keputusan adalah instruksi owner pada 2026-09-07 dan architecture decision record terkait di
direktori keputusan arsitektur.

## 3. Alur Lintas Peran

Owner/Admin/PO mengisi kedua tanggal atau mengosongkan keduanya. Form menahan input tidak lengkap dan
menjelaskan koreksi yang diperlukan. Backend mengulangi validasi untuk semua caller. Developer dan QA
tetap tidak memperoleh kewenangan baru untuk mengubah planning fields.

## 4. Data dan Relasi

Entitas `tasks` tetap menyimpan `start_date` dan `due_date` nullable, termasuk untuk Subtask melalui
relasi `parent_task_id`. Check constraint memastikan kedua nilai null atau keduanya terisi dan urut.
Tidak ada data yang diubah otomatis; migrasi berhenti jika menemukan data historis tidak valid.

## 5. API dan Shared Contract

Endpoint Task/Subtask yang sudah ada dan `packages/contracts/src/task.ts` tetap memakai field
`startDate`/`dueDate`. Create contract memvalidasi pasangan lengkap. Update contract tetap parsial dan
backend memvalidasi hasil gabungan dengan record tersimpan. Kegagalan memakai respons bad request yang
sudah ada; bentuk respons sukses tidak berubah.

## 6. Authorization

`FLOW-002` dan backend policy yang sudah ada tetap mengatur planner. Validasi baru berlaku setelah
otorisasi dan tidak menggantikan pemeriksaan keanggotaan Workspace.

## 7. UI dan Interaction States

Form pembuatan dan detail Task/Subtask memakai input tanggal yang sudah ada. Pesan inline dapat dibaca
screen reader, kedua input ditandai tidak valid saat pasangan tidak lengkap/terbalik, dan tombol submit
tidak memulai request sampai koreksi dilakukan. Perubahan tidak menambah state loading, empty, atau
permission-denied baru.

## 8. Pengujian dan Evidence

Evidence wajib mencakup unit contract, UI Task/Subtask, integrasi PostgreSQL untuk create/update dan
rollback, constraint langsung, migrasi bersih, build, serta validation gate. Hasil aktual dicatat pada
laporan task setelah perintah dijalankan.

## 9. Release dan Readiness

Kode dan migrasi belum boleh dianggap aktif di Production sebelum melewati deployment/migration gate.
Rollback aplikasi harus dipasangkan dengan penghapusan constraint melalui migrasi `down` bila perilaku
lama benar-benar perlu dipulihkan. Audit pra-implementasi tidak menemukan data tidak valid di lokal
maupun Production.

## 10. Traceability

`REQ-SCHEDULE-PAIR-1` → `AC-SCHEDULE-PAIR-1..6` → `FIX-TASK-SCHEDULE-DATE-PAIR` → shared contract,
Task service, Task/Subtask forms, migration 66 → contract/UI/PostgreSQL tests → task report → release
decision terpisah.
