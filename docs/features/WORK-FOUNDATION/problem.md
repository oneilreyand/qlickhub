# WORK-FOUNDATION — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Disetujui:** Owner melalui chat, 2026-11-17 — "Setuju semua (Recommended)" dan "Semua 4 Feature" untuk G0/G1 program WORK-VISIBILITY
**Applicable Policy IDs:** SDLC-001, DATA-005, FLOW-004

Turunan dari [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §3.

## 1. Masalah

Qlick Hub tidak menyimpan berat kerja, kapasitas orang, hari kerja/libur, atau alasan sebuah kerjaan tertahan. Akibatnya beban, ketepatan waktu, dan hambatan tidak bisa dihitung secara benar.

## 2. Bukti masalah

| Bukti                                                            | Sumber                                         | Level                              |
| ---------------------------------------------------------------- | ---------------------------------------------- | ---------------------------------- |
| Model Task tanpa effort/estimasi dan tanpa status/flag terhambat | `apps/api/src/db/models/task.ts`               | E1                                 |
| Workspace tanpa zona waktu, hari kerja, atau hari libur          | `apps/api/src/db/models/workspace.ts`          | E1                                 |
| Beban Leader: `overloaded` bila ≥3 subtask aktif atau ≥1 bentrok | `apps/api/src/modules/leader/leaderService.ts` | E1                                 |
| Kelengkapan histori status (`task_activities`) belum dibuktikan  | program plan §3.5                              | unverified — dibuktikan di Phase 1 |

## 3. Siapa yang terdampak

| Role         | Situasi                       | Seberapa sering | Dampak                                       |
| ------------ | ----------------------------- | --------------- | -------------------------------------------- |
| Owner/Admin  | Menilai siapa kelebihan beban | Mingguan        | Keputusan tanpa data berat kerja             |
| PO           | Menjadwalkan Subtask          | Setiap Feature  | Tidak tahu apakah waktu yang diberikan wajar |
| Developer/QA | Kerjaan tertahan pihak lain   | Sering          | Hambatan hanya disampaikan lisan             |

## 4. Bila tidak dikerjakan

Laporan Saya dan Leader Hub tidak bisa dibangun dengan data asli; label beban tetap menyesatkan.

## 5. Metrik sukses

| Metrik                                 | Baseline saat ini     | Target                                            | Cara mengukur   |
| -------------------------------------- | --------------------- | ------------------------------------------------- | --------------- |
| Subtask aktif dengan jadwal dan effort | 0% (effort belum ada) | ≥90% di Workspace pilot                           | query read-only |
| Hambatan tercatat dengan PIC           | 0                     | Setiap hambatan yang dilaporkan di pilot tercatat | UAT 4 minggu    |
| Workspace pilot dengan kalender terisi | 0                     | 100% Workspace pilot                              | query read-only |

## 6. Batasan dan di luar scope

- Skor, ranking, atau penilaian performa per orang.
- Penjadwalan ulang atau reassign otomatis.
- Backfill effort atau histori yang tidak ada (`DATA-005`).

## 7. Unknown

| Pertanyaan                              | Mengapa penting                 | Siapa bisa menjawab       |
| --------------------------------------- | ------------------------------- | ------------------------- |
| Sejak kapan histori status lengkap?     | Menentukan baseline kewajaran   | Phase 1 (query read-only) |
| Ada Subtask `done` tanpa `completedAt`? | Ketepatan "selesai tepat waktu" | Phase 1 (query read-only) |
