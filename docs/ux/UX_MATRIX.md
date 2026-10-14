# UI/UX Matrix — Kemudahan dan Kesesuaian Alur per Role

**Status:** Active
**Owner:** QA
**Last reviewed:** 2026-10-14
**Applicable Policy IDs:** DOC-006, UI-001, UI-002

Matriks ini menilai setiap alur utama per role dengan kriteria yang sama. Role mengikuti
[Role Flows](../features/ROLE_FLOWS.md); setiap role wajib punya minimal satu baris (`DS-R04`,
`DOC-006`). Nilai diisi QA saat review UX dan dibaca oleh portal (`npm run docs:portal`).

## Skala

| Nilai             | Arti                                  |
| ----------------- | ------------------------------------- |
| `Lancar`          | Tanpa hambatan                        |
| `Perlu perbaikan` | Bisa dilakukan, tetapi membingungkan  |
| `Bermasalah`      | Pengguna tersendat atau salah langkah |
| `Belum dinilai`   | Belum direview                        |

## Kriteria

| Kriteria        | Pertanyaan                                                          |
| --------------- | ------------------------------------------------------------------- |
| Jumlah langkah  | Berapa klik/layar dari awal sampai selesai? Apakah wajar?           |
| Aksi berikutnya | Apakah pengguna tahu langkah berikutnya tanpa bertanya?             |
| Empty / error   | Apakah pesan kosong/gagal menjelaskan penyebab dan tindakan?        |
| Mobile 390px    | Apakah alur bisa diselesaikan di lebar 390 px tanpa scroll samping? |
| Bahasa          | Apakah istilah konsisten dengan glosarium dan bahasa QA?            |
| Bukti e2e       | Apakah ada spec e2e atau screenshot sebagai bukti?                  |

## Matriks

| Role          | Alur                                     | Jumlah langkah | Aksi berikutnya | Empty / error | Mobile 390px  | Bahasa        | Bukti e2e                          |
| ------------- | ---------------------------------------- | -------------- | --------------- | ------------- | ------------- | ------------- | ---------------------------------- |
| Owner / Admin | Kelola anggota Workspace                 | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Owner / Admin | Beri delegasi pembuatan Task             | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Owner / Admin | Pengecualian darurat (break-glass)       | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Product Owner | Tulis Product Brief                      | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Product Owner | Buat Requirement dan Acceptance Criteria | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Product Owner | Tinjau QA sign-off                       | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Product Owner | Putuskan rilis                           | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Developer     | Ambil Subtask dari Requirement           | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Developer     | Tandai siap diuji QA                     | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| Developer     | Perbaiki Bug dan minta retest            | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| QA            | Susun Test Case dari Requirement dan AC  | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| QA            | Jalankan Test Run dan unggah evidence    | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | `qa-desk-flow-integration.spec.ts` |
| QA            | Laporkan Bug ke Developer                | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
| QA            | Retest independen                        | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | `qa-desk-flow-integration.spec.ts` |
| QA            | QA sign-off ke PO                        | Belum dinilai  | Belum dinilai   | Belum dinilai | Belum dinilai | Belum dinilai | Belum ada                          |
