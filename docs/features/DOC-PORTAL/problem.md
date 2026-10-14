# DOC-PORTAL — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh reyand (Owner) 2026-10-14
**Applicable Policy IDs:** SDLC-001, DOC-001, DOC-004

## 1. Masalah

Tim (PO, Developer, QA, Owner) dan agent AI tidak punya satu tampilan untuk memahami Qlick Hub secara
utuh — stack, fitur, kontrak API, data, aturan, pekerjaan aktif, dan kemudahan alur pengguna — dan
tidak ada pemeriksaan otomatis bahwa dokumen masih cocok dengan kode.

## 2. Bukti masalah

Diukur pada `main` (`9d42595`) 2026-10-14.

| Bukti                                                                                             | Sumber                                             | Level |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ----- |
| Sekitar 45 dari 102 path endpoint unik disebut di dokumen non-report (hitungan string, perkiraan) | `apps/api/src/modules/**`, `docs/**`               | E1    |
| ERD manual memuat 24 entitas, model Sequelize ada 60 file                                         | `docs/1_ARCHITECTURE.md`, `apps/api/src/db/models` | E1    |
| 2 dari 35 kartu fitur memakai template folder SDLC; 33 masih kartu satu file                      | `docs/features/`                                   | E1    |
| 0 dari 12 item TODO terbuka mencatat progres PRD/BE/FE                                            | `TODO.md`                                          | E1    |
| Belum ada matriks atau penilaian UX per alur role                                                 | `docs/`                                            | E1    |
| Informasi stack tersebar di 4 `package.json`, `.nvmrc`, dan `1_ARCHITECTURE.md`                   | repo                                               | E1    |

## 3. Siapa yang terdampak

| Role              | Situasi                                                        | Seberapa sering  | Dampak                          |
| ----------------- | -------------------------------------------------------------- | ---------------- | ------------------------------- |
| Developer / agent | Mencari kontrak dan model sebelum mengubah kode                | Setiap task      | Salah asumsi, review lebih lama |
| QA                | Mencari Requirement, AC, dan endpoint untuk menyusun Test Case | Setiap fitur     | Cakupan tes tidak lengkap       |
| PO                | Melihat status fitur dan TODO per layer                        | Mingguan         | Status tidak jelas              |
| Owner             | Memastikan aturan dan gate dipatuhi                            | Setiap PR Tier 2 | Pemeriksaan manual              |

## 4. Bila tidak dikerjakan

Dokumen makin tertinggal dari kode, onboarding anggota tim dan agent tetap lambat, dan proyek
berikutnya mengulang masalah yang sama dari nol.

## 5. Metrik sukses

| Metrik                                  | Baseline saat ini                 | Target                                                    | Cara mengukur          |
| --------------------------------------- | --------------------------------- | --------------------------------------------------------- | ---------------------- |
| Endpoint yang tercatat di dokumen fitur | sekitar 45/102 (perkiraan string) | 100% atau selisih tercatat sebagai pengecualian           | Laporan completeness   |
| Model yang dipetakan ke domain ERD      | 24/60                             | 100% (ERD dibangkitkan otomatis)                          | Laporan completeness   |
| Item TODO dengan penanda layer          | 0/12                              | 100%                                                      | Laporan completeness   |
| Portal sinkron dengan `main`            | tidak ada portal                  | Dibangun ulang dengan satu perintah                       | `npm run docs:extract` |
| Bisa dipakai ulang                      | —                                 | Proyek baru cukup config dan adapter, tanpa mengubah core | Uji fixture (AC-5.1)   |

## 6. Batasan dan di luar scope

- Portal lokal tanpa login; tidak ada hosting, deploy, atau autentikasi.
- Completeness check memakai ratchet: gap baru memblokir PR, gap lama dilaporkan.
- Tidak menulis ulang 33 kartu fitur legacy dan tidak mengisi nilai UX matrix.
- Tidak mengubah perilaku aplikasi Qlick Hub.

## 7. Unknown

| Pertanyaan              | Mengapa penting                                      | Siapa bisa menjawab |
| ----------------------- | ---------------------------------------------------- | ------------------- |
| Stack proyek berikutnya | Menentukan adapter mana yang dibuat setelah qlickhub | Owner               |

Keputusan G0: portal lokal tanpa login; completeness check dengan ratchet baseline (reyand, 2026-10-14).
