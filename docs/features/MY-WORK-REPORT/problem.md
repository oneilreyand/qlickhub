# MY-WORK-REPORT — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Disetujui:** Owner melalui chat, 2026-11-17 — "Setuju semua (Recommended)" dan "Semua 4 Feature" untuk G0/G1 program WORK-VISIBILITY
**Applicable Policy IDs:** SDLC-001, AUTH-011

Turunan dari [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §3.

## 1. Masalah

User yang bekerja di beberapa Workspace tidak punya satu tempat untuk melihat semua kerjaannya, mana yang telat/berisiko, apakah waktunya wajar, dan kerjaan mana yang bentrok atau saling bergantung.

## 2. Bukti masalah

| Bukti                                                                             | Sumber                                 | Level |
| --------------------------------------------------------------------------------- | -------------------------------------- | ----- |
| `/reports` hanya Timeline Tim untuk Workspace aktif; kerjaan PO/Owner tidak masuk | `ReportPage.tsx`, `capacityService.ts` | E1    |
| Irisan lintas Workspace hanya berupa ringkasan bentrok tanggal yang diredaksi     | ADR-024, `AUTH-011`                    | E1    |
| Tidak ada relasi antar task (`task_links` berisi URL referensi)                   | `taskLink.ts`                          | E1    |

## 3. Siapa yang terdampak

| Role         | Situasi                           | Seberapa sering | Dampak                                            |
| ------------ | --------------------------------- | --------------- | ------------------------------------------------- |
| Developer/QA | Memegang subtask di 2–3 Workspace | Harian          | Keterlambatan baru terlihat setelah lewat tenggat |
| PO           | Mengecek kerjaan yang ia laporkan | Mingguan        | Pindah-pindah Workspace                           |

## 4. Bila tidak dikerjakan

Keterlambatan terlambat terdeteksi, bentrok jadwal lintas Workspace tidak terlihat.

## 5. Metrik sukses

| Metrik                                                      | Baseline saat ini | Target     | Cara mengukur            |
| ----------------------------------------------------------- | ----------------- | ---------- | ------------------------ |
| User menjawab "mana yang telat/berisiko" dalam satu halaman | tidak bisa        | lulus UAT  | UAT 5 user pilot         |
| Angka kartu = jumlah baris daftar                           | —                 | 100% cocok | integration rekonsiliasi |

## 6. Batasan dan di luar scope

- Laporan orang lain, skor, atau ranking.
- Mengubah jadwal dari halaman laporan (tetap lewat detail Subtask).

## 7. Unknown

| Pertanyaan                                            | Mengapa penting | Siapa bisa menjawab                     |
| ----------------------------------------------------- | --------------- | --------------------------------------- |
| Apakah kerjaan `canceled` perlu ditampilkan terpisah? | Kelengkapan     | PO setelah pilot (default: dikeluarkan) |
