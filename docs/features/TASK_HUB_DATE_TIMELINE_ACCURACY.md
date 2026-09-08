# Task Hub Date and Timeline Accuracy

**Status:** Active
**Owner:** Product and Engineering
**Last reviewed:** 2026-09-07
**Applicable Policy IDs:** `FLOW-004`, `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

Membuat filter tanggal dan mode Timeline Task Hub sesuai dengan jadwal Task yang tersimpan. Planner,
Developer, dan QA harus dapat melihat pekerjaan yang aktif di dalam hari, minggu, atau bulan yang
dipilih, serta membedakan durasi rencana dari hari keterlambatan tanpa mengubah data jadwal.

Perubahan ini tidak mengubah siapa yang boleh merencanakan atau menyelesaikan Task, tidak menambah
aksi otomatis, dan tidak mengubah perhitungan release readiness.

## 2. Requirement dan Acceptance Criteria

- **REQ-TASK-DATE-1:** Date view merepresentasikan irisan jadwal, bukan hanya tanggal jatuh tempo.
- **AC-TASK-DATE-1:** Today memuat Task terjadwal ketika hari ini berada di antara Start Date dan Due Date, inklusif.
- **AC-TASK-DATE-2:** This Week dan This Month memuat Task ketika rentang jadwalnya beririsan dengan rentang kalender terpilih.
- **AC-TASK-DATE-3:** Custom range memakai aturan irisan inklusif yang sama.
- **AC-TASK-DATE-4:** Overdue hanya memuat Task terbuka dengan Due Date sebelum hari ini; Done dan Canceled dikecualikan.
- **REQ-TASK-TIMELINE-1:** Timeline membedakan rencana dan keterlambatan berdasarkan data persisten.
- **AC-TASK-TIMELINE-1:** Skala Day, Week, dan Month dapat dipilih dan dinavigasi per satuan skalanya.
- **AC-TASK-TIMELINE-2:** Segmen rencana berakhir pada Due Date.
- **AC-TASK-TIMELINE-3:** Task terbuka yang melewati Due Date mendapat segmen terlambat sampai hari ini.
- **AC-TASK-TIMELINE-4:** Task Done setelah Due Date mendapat segmen terlambat sampai tanggal lokal dari `completedAt`.
- **AC-TASK-TIMELINE-5:** Segmen terlambat memakai warna bahaya dengan opacity lebih rendah, legenda teks, dan nama aksesibel.
- **AC-TASK-TIMELINE-6:** Task yang selesai tepat waktu, belum terlambat, atau dibatalkan tidak mendapat segmen terlambat.

Sumber keputusan adalah instruksi owner dan reproduksi Production pada 2026-09-07.

## 3. Alur Lintas Peran

Semua anggota Workspace dengan akses Task Hub melihat read model yang sama sesuai scope backend
mereka. Owner/Admin/PO tetap merencanakan Start/Due Date. Developer dan QA menjalankan Subtask sesuai
otorisasi yang sudah ada; Timeline hanya menyajikan selisih rencana dan realisasi yang telah terjadi.

## 4. Data dan Relasi

Implementasi memakai `tasks.start_date`, `tasks.due_date`, `tasks.status`, dan `tasks.completed_at` yang
sudah persisten. Tidak ada tabel, kolom, migrasi, penulisan data, atau audit event baru. Jadwal kosong
tetap tampil pada bagian Unscheduled dan tidak dipaksakan masuk ke date view.

## 5. API dan Shared Contract

Endpoint list Task dan bentuk `Task` di `packages/contracts/src/task.ts` tidak berubah. Semantik query
Today/Week/Month serta explicit range berubah dari pencocokan Due Date menjadi schedule-window overlap:
`startDate <= windowEnd` dan `dueDate >= windowStart`. Preset Overdue tetap memakai Due Date dan status.

## 6. Authorization

Tidak ada perubahan otorisasi. Backend tetap memeriksa membership, role scope, folder, root/subtask,
dan assignee sebelum/bersama filter tanggal yang sama.

## 7. UI dan Interaction States

Route `/work` tetap memakai `TaskTimelineView` dan komponen kontrol Task Hub yang ada. Skala Day, Week,
dan Month menampilkan rentang aktif, tombol sebelumnya/hari ini/berikutnya, legenda Planned/Delay,
serta segmen delay beropacity rendah. Bar dan segmen delay dapat dipahami tanpa mengandalkan warna.
Loading, empty, error, permission, keyboard, desktop, mobile, dan dark-mode behavior yang ada dipertahankan.

## 8. Pengujian dan Evidence

Evidence wajib mencakup reproduksi Production, test integrasi PostgreSQL untuk interval overlap dan
Overdue, test komponen untuk tiga skala dan segmen delay open/completed, typecheck/build, dokumentasi,
serta pemeriksaan visual desktop dan mobile. Hasil aktual dicatat di laporan task.

## 9. Release dan Readiness

Tidak ada migrasi atau backfill. Release aplikasi dapat di-rollback ke query/renderer sebelumnya tanpa
perubahan data. Validasi Production setelah deployment harus mengulang kasus Task yang melintasi Today
dan contoh Task terlambat; deployment bukan bagian otomatis dari task ini.

## 10. Traceability

`REQ-TASK-DATE-1` dan `REQ-TASK-TIMELINE-1` → acceptance criteria di atas →
`TASK-HUB-DATE-TIMELINE-ACCURACY` → Task query + `TaskTimelineView` → PostgreSQL/component tests →
task report → release decision terpisah.
