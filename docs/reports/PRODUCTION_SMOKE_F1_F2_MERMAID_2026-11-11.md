# Smoke test Production terautentikasi: F1, F2, Mermaid Studio — 2026-11-11

## Task

Menjalankan smoke test terautentikasi di Production untuk `SUBTASK-SCHEDULE-WITHIN-FEATURE` (F1),
`FEATURE-REFERENCES-MEDIA` (F2) dan `FEAT-PRD-MERMAID-STUDIO`, lalu mencatat temuan. Laporan ini
adalah bukti/status, bukan penerimaan G6 (`DOC-003`, `DOC-004`, `TEST-001`).

## Otorisasi dan batas

- Owner, chat 2026-11-11: uji F1, F2 dan Mermaid boleh mengubah data **hanya** pada Feature uji
  `[UJI F1F2] Jadwal subtask dan referensi` (`2d7630a8-f3b7-4aec-93d7-199523a6050a`), Workspace
  `essential`. Tidak ada penghapusan.
- Sesi: Owner login sendiri di browser; agent tidak memasukkan kredensial. Role sesi: Owner.
- Target: `https://qlickhub.vercel.app`, `main` @ `431fcac8` (bundle `index-CwPJfrbC.js`).
- Semua langkah lewat UI aplikasi. Pembacaan ulang memakai GET terautentikasi pada API yang sama.

## Hasil

| Feature | Langkah                                                                  | Hasil di Production                                                                                                                                        | Pelaksana               |
| ------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| Mermaid | Edit Brief → Tambah Diagram → judul + kode → Sisipkan ke PRD → Simpan    | `PUT product-brief` 200; diagram tampil di ringkasan PRD                                                                                                   | Agent                   |
| Mermaid | Edit → Edit Diagram → tambah node → Perbarui Diagram → Simpan            | GET: tetap satu blok `qlick-diagram:v1`, `revision` 2, node baru ada                                                                                       | Agent                   |
| Mermaid | Pintu masuk Studio setelah PR #121                                       | Ringkasan PRD hanya `Edit`; form Brief tepat satu `Tambah Diagram`                                                                                         | Agent                   |
| F2      | Tambah Tautan (judul, URL https, jenis Lainnya)                          | `POST links` 201; GET mengembalikan 5 tautan (sebelumnya 4)                                                                                                | Agent                   |
| F2      | Bagian Referensi & Media di tahap PRD                                    | Daftar tautan, galeri video dan gambar tampil                                                                                                              | Agent                   |
| F1      | Tenggat Feature 5 Des → 15 Nov, subtask aktif sampai 20 Nov              | `PATCH` 409; form menampilkan nama dan tanggal subtask; GET: Feature dan subtask tidak berubah                                                             | Agent                   |
| F1      | Tenggat Feature 5 Des → 10 Des → 21 Nov (subtask tetap di dalam rentang) | Diterima; activity `task.dueDate_updated` 15:06 dan 15:13 UTC                                                                                              | Owner                   |
| F1      | Tenggat subtask ke luar rentang 12–21 Nov                                | Ditolak saat Simpan dengan pesan `Jadwal Subtask harus di dalam rentang Feature 2026-11-12–2026-11-21.`; GET: subtask tetap 12–20 Nov, tanpa activity baru | Owner (UI), agent (GET) |

Kode status penolakan subtask tidak diamati agent; yang terbukti adalah pesan di UI dan data yang
tidak berubah.

## Data uji yang tertinggal di Production

Semua pada Feature `[UJI F1F2]`: Product Brief status Draf (2 versi) berisi diagram
`[UJI] Alur verifikasi`; tautan `[UJI] Tautan verifikasi 11 Nov` (`example.com`); tenggat Feature
sekarang 21 Nov 2026 (sebelumnya 5 Des 2026).

## Temuan

| #   | Temuan                                                                                                                                                                   | Tindak lanjut                                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 1   | Form subtask tidak memberi peringatan saat tanggal diketik ke luar rentang Feature; penolakan baru terlihat setelah Simpan. `min`/`max` hanya membatasi pemilih tanggal. | Diperbaiki pada perubahan ini (lihat `SUBTASK-SCHEDULE-WITHIN-FEATURE/testing.md`) |
| 2   | Setelah 409 pada form Feature, pesan konflik tetap tampil di ringkasan sesudah perubahan dibuang, sampai halaman dimuat ulang.                                           | Belum dikerjakan                                                                   |
| 3   | Form buat subtask dan drawer detail lama belum diberi peringatan dini yang sama.                                                                                         | Belum dikerjakan                                                                   |

## Belum dibuktikan

Role Developer/QA (403 untuk tanggal planning, F2 hanya-lihat), viewport phone/tablet, Dark mode,
`FEATURE-SPEC-TASK-AI-TIMEOUT`, `QA-DESK-SIMPLIFY`, `RELEASE-DEADLOCK-A1-A2` (tolak sign-off),
`UI-WORKSPACE-REFRESH` AC-1.1/2.1/2.2, dan AC-8 `DEADLINE-REMINDER-CRON`. QA sign-off, keputusan
rilis dan G6 tetap keputusan Owner.
