# LEADER-PIPELINE-HUB — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Disetujui:** Owner melalui chat, 2026-11-17 — "Setuju semua (Recommended)" dan "Semua 4 Feature" untuk G0/G1 program WORK-VISIBILITY
**Applicable Policy IDs:** SDLC-001

Turunan dari [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §3.

## 1. Masalah

Leader tidak bisa melihat posisi setiap Feature dalam SDLC, mana yang terhambat dan kenapa, serta beban tim yang sebenarnya.

## 2. Bukti masalah

| Bukti                                                     | Sumber                                                  | Level |
| --------------------------------------------------------- | ------------------------------------------------------- | ----- |
| Leader Hub hanya Timeline & Beban, Kualitas & Bug, Digest | `LeaderHubPage.tsx`, `packages/contracts/src/leader.ts` | E1    |
| Beban "overloaded" = ≥3 subtask aktif atau ≥1 bentrok     | `leaderService.ts`                                      | E1    |
| Metrik kualitas tidak memakai timeframe                   | `ROLE_AUDIT_REPORTS_PLAN.md` (temuan)                   | E1    |

## 3. Siapa yang terdampak

| Role         | Situasi                    | Seberapa sering | Dampak                   |
| ------------ | -------------------------- | --------------- | ------------------------ |
| Owner/Admin  | Rapat status mingguan      | Mingguan        | Status ditanya manual    |
| PIC hambatan | Tidak tahu sedang ditunggu | Sering          | Hambatan berumur panjang |

## 4. Bila tidak dikerjakan

Status proyek tetap ditanya manual; label beban menyesatkan.

## 5. Metrik sukses

| Metrik                                            | Baseline saat ini | Target             | Cara mengukur |
| ------------------------------------------------- | ----------------- | ------------------ | ------------- |
| Waktu menyebut Feature terhambat + penyebab + PIC | manual            | <1 menit           | UAT Owner     |
| Feature dengan status kesehatan dan alasan        | 0                 | 100% Feature aktif | integration   |

## 6. Batasan dan di luar scope

- Skor/ranking orang.
- Aksi otomatis (reassign, geser jadwal).
- Tab Aktivitas periode (milik LEADER-SDLC-HUB).

## 7. Unknown

| Pertanyaan                                                              | Mengapa penting  | Siapa bisa menjawab                        |
| ----------------------------------------------------------------------- | ---------------- | ------------------------------------------ |
| Ambang lama per tahap sebelum "Terhambat"                               | Aturan kesehatan | Owner; default di P1, diubah setelah pilot |
| Kapan SIMPLE-UI P5/P7/P8 menyediakan data Plan, Verif. Prod, Monitoring | P7               | status SIMPLE-UI-DELIVERY-FLOW             |
