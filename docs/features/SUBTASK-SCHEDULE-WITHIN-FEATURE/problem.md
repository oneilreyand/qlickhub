# SUBTASK-SCHEDULE-WITHIN-FEATURE — Tahap 0: Problem

**Status:** Disetujui
**Gerbang:** G0 — Owner/PO
**Applicable Policy IDs:** SDLC-001, DOMAIN-002, TEST-001

## 1. Masalah

Planner dapat mempersempit tanggal Feature sehingga subtask aktif berada di luar jadwal induk.
Developer/QA kemudian menerima jadwal eksekusi yang bertentangan dengan rencana Feature.

## 2. Bukti masalah

| Bukti                                                                                   | Sumber primer                                                                                                                      | Level                                             |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Laporan Owner dan contoh AC                                                             | [rencana induk F1](../../plans/QLICKHUB_FOLLOWUP_F1_F4_PLAN.md#f1--jadwal-subtask-harus-di-dalam-rentang-feature)                  | E1; klaim manual belum direproduksi pada sesi ini |
| Helper memeriksa kelengkapan pasangan dan start tidak sesudah due, tanpa parent         | [task.ts](../../../packages/contracts/src/task.ts), getTaskScheduleValidationIssue                                                 | E1                                                |
| Create membaca parent tanpa memeriksa rentang; update memvalidasi pasangan sebelum save | [taskLifecycle.ts](../../../apps/api/src/modules/tasks/internal/taskLifecycle.ts), createTaskInTransaction/updateTaskInTransaction | E1                                                |
| Plan menulis tanggal root langsung dengan TaskModel.update                              | [featureSpecService.ts](../../../apps/api/src/modules/featureSpecs/featureSpecService.ts), syncPlanToFeature                       | E1                                                |
| scheduleHealth memeriksa keterlambatan terhadap hari ini, bukan containment parent      | [taskScheduleHealth.ts](../../../apps/api/src/modules/tasks/internal/taskScheduleHealth.ts)                                        | E1                                                |

Inspeksi tahap 0 memakai baseline a717ba7. Reproduksi dan hasil PostgreSQL/browser lokal setelah
approval kini tersedia pada testing.md; tidak ada reproduksi live Production atau ukuran insiden baru.

## 3. Pihak terdampak

Planner (Owner/Admin/PO) saat edit jadwal; Developer dan QA saat membaca/menjalankan subtask.
Frekuensi aktual unknown; diukur dari reproduksi disposable dan UAT setelah approval, bukan angka rekaan.

## 4. Bila tidak dikerjakan

Jadwal Feature dan delivery bisa saling bertentangan tanpa penanda yang menjelaskan konflik.
Menggeser otomatis akan mengubah komitmen kerja sehingga tidak boleh diasumsikan.

## 5. Metrik sukses

| Metrik                                          | Baseline                               | Target                                                       | Bukti              |
| ----------------------------------------------- | -------------------------------------- | ------------------------------------------------------------ | ------------------ |
| Persempit Feature yang mengeluarkan child aktif | Guard tidak ditemukan melalui inspeksi | Ditolak 409; data/audit tidak berubah                        | E3 HTTP + readback |
| Child aktif di luar parent terjadwal            | Guard tidak ditemukan melalui inspeksi | Ditolak 400 dengan rentang                                   | E3                 |
| Legacy terlihat tanpa rewrite                   | Belum ada metadata containment         | Peringatan terbaca dari API                                  | E3 + E2/E4         |
| Konsistensi concurrent writer                   | Belum diuji                            | Tidak ada interleaving yang meloloskan invalid schedule baru | E3 concurrency     |

## 6. Batasan

Hanya F1. Tidak ada migrasi/backfill, auto-shift, auto-reassign, F2 media, F3 Brief,
F4 deployment workflow, model AI, secret atau mutasi Production. Jadwal opsional berpasangan tetap sah.

## 7. Unknown

K1/L1/L2 diselesaikan oleh persetujuan Owner 2026-11-07; lihat [solution.md](solution.md).
RTK.md yang direferensikan instruksi tidak ditemukan di tree main/repo maupun lokasi parent/global
umum yang diperiksa; tidak ada aturan RTK yang diasumsikan. Dokumen/SSoT tersedia tetap diikuti.

## Persetujuan Owner — 2026-11-07

Owner menjawab `ok` atas permintaan persetujuan G0–G3: K1 tolak tanpa auto-shift;
L1 edit tanggal harus valid penuh, metadata tetap boleh; L2 tolak reopen di luar rentang.
ADR/SSoT dicatat dahulu, lalu Phase 1 lokal. Tidak mencakup commit/push/PR/merge/deploy.
Catatan Blocked/Belum sebelumnya adalah snapshot sebelum keputusan ini, bukan keputusan terbaru.
