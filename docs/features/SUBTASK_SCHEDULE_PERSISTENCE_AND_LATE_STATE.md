# Subtask Schedule Persistence and Backend-owned Late State

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-19
**Applicable Policy IDs:** `FLOW-004`, `AUTH-002`, `DATA-001`, `CONTRACT-001`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Planner memerlukan Subtask dengan tanggal mulai dan tenggat yang tetap terbaca setelah reload.
Developer, QA, dan PO memerlukan satu status jadwal yang konsisten untuk mengetahui pekerjaan yang
terlambat. Cakupan ini tidak mengubah lifecycle, penugasan, atau kebijakan pasangan tanggal.

## 2. Requirement dan Acceptance Criteria

- **REQ-SUBTASK-SCHEDULE-1:** Tanggal Subtask yang dibuat Planner dipersistenkan dan dibaca kembali.
- **REQ-SUBTASK-SCHEDULE-2:** Keterlambatan Subtask terbuka dievaluasi backend, bukan browser.
- **AC-SUBTASK-SCHEDULE-1:** Create, detail/list reload, dan edit mengembalikan `startDate` dan `dueDate` yang sama.
- **AC-SUBTASK-SCHEDULE-2:** Respons Task memuat `scheduleHealth` dengan state terlambat, berisiko, sesuai jadwal, selesai, atau tanpa jadwal.
- **AC-SUBTASK-SCHEDULE-3:** UI hanya menyajikan `scheduleHealth` dari respons backend untuk state keterlambatan.
- **AC-SUBTASK-SCHEDULE-4:** Jadwal kosong tetap eksplisit sebagai tanpa jadwal dan pasangan tanggal yang tidak lengkap tetap ditolak.

## 3. Alur Lintas Peran

Owner/Admin/PO membuat atau mengedit pasangan tanggal lengkap pada Subtask. Backend memvalidasi
otorisasi Planner serta pasangan tanggal dan menyimpan ke `tasks`. Saat PO, Developer, atau QA
membaca Subtask, backend menambahkan `scheduleHealth`; UI menampilkan nilai itu pada ringkasan,
timeline, antrean, dan laporan tanpa membuat keputusan terlambat dari jam perangkat.

## 4. Data dan Relasi

Tidak ada tabel atau migrasi baru. `tasks.start_date` dan `tasks.due_date` tetap menjadi sumber
persistensi untuk root Task dan Subtask. `scheduleHealth` adalah read model yang dihitung ketika
respons Task dibentuk dan tidak disimpan sebagai kolom agar tidak menjadi data usang.

## 5. API dan Shared Contract

`packages/contracts/src/task.ts` mendefinisikan `TaskScheduleHealth`. Semua respons Task dari
formatter backend menyertakan `scheduleHealth`; endpoint Task dan Subtask yang ada tidak berubah.
Validasi create/update pasangan tanggal tetap menggunakan kontrak dan validasi backend yang sama.

## 6. Authorization

`AUTH-002` tetap berlaku: hanya Planner dapat mengubah field perencanaan. Semua anggota Workspace
yang diizinkan membaca Task dapat membaca status jadwal yang telah dihitung backend; UI tidak
memberikan otorisasi baru.

## 7. UI dan Interaction States

`TaskScheduleHealthBadge`, timeline peran, timeline Task, desk Developer/QA, dan laporan menggunakan
nilai read model. State `unscheduled` tetap memakai label tanpa jadwal. Data fixture tanpa respons
backend menampilkan state netral yang meminta reload, bukan menghitung keterlambatan di browser.

## 8. Pengujian dan Evidence

PostgreSQL integration membuktikan create, read ulang, edit, dan evaluasi terlambat/tepat waktu.
UI test membuktikan form mengirim tanggal, timeline menerima state backend, dan laporan membentuk
antrean dari state backend. Evidence hasil aktual ada pada laporan task; UAT Production dijalankan
setelah deployment.

## 9. Release dan Readiness

Perubahan tidak memerlukan migrasi. Deployment Production
`https://qlickhub-okoqqoe48-oneilreyands-projects.vercel.app` berstatus Ready. UAT Production
non-destruktif memuat ulang Subtask QA `test billing v3` dengan tenggat 2026-09-18 pada
2026-09-19 dan menampilkan state `Terlambat`. Rollback aplikasi menghapus field respons baru tanpa
menyentuh tanggal tersimpan.

## 10. Traceability

`REQ-SUBTASK-SCHEDULE-1..2` → `AC-SUBTASK-SCHEDULE-1..4` → `TaskScheduleHealth` contract →
formatter Task backend → Task/Role Timeline/Report UI → PostgreSQL dan UI tests → laporan →
`AGY-SUBTASK-SCHEDULE-PERSISTENCE-AND-LATE-STATE`.
