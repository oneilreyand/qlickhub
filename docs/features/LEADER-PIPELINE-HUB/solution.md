# LEADER-PIPELINE-HUB — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Disetujui:** Owner melalui chat, 2026-11-17 — "Setuju semua (Recommended)" dan "Semua 4 Feature" untuk G0/G1 program WORK-VISIBILITY
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-044](../../adr/ADR-044-WORK-CALENDAR-EFFORT-AND-CAPACITY.md), [ADR-045](../../adr/ADR-045-TASK-BLOCKERS-AND-FEATURE-HEALTH.md)
**Applicable Policy IDs:** AI-006, SDLC-001, DOC-002

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E. Opsi lengkap ada di [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §5.

## 1. Kondisi sekarang

Leader API (`modules/leader`) menyediakan timeline, kualitas, dan digest per Workspace yang dipimpin (Owner/Admin). SSE per Workspace di `modules/realtime`. Codex sedang menambah tab Aktivitas periode (belum di-commit).

## 2. Opsi

|                              | Opsi A (dipilih)                                                                                                                                                                       | Opsi B                              | Opsi 0: tidak dikerjakan        |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ------------------------------- |
| Ringkasan                    | Tahap pipeline diturunkan dari data yang ada (Requirement/AC, baseline kesiapan, status Subtask, sign-off, keputusan rilis, bug); tahap Plan/Verif. Prod/Monitoring menyusul SIMPLE-UI | Tunggu SIMPLE-UI selesai seluruhnya | Biarkan seperti sekarang        |
| Pro                          | Bisa mulai tanpa menunggu                                                                                                                                                              | Sekali jadi                         | Tanpa kerja                     |
| Kontra                       | Pemetaan harus diaudit                                                                                                                                                                 | Tertunda lama                       | Masalah di problem.md tetap ada |
| Lapisan terdampak (FE/BE/DB) | contracts, API, Web                                                                                                                                                                    | Sama                                | —                               |
| Data / migrasi               | Tidak ada migrasi baru (memakai WORK-FOUNDATION)                                                                                                                                       | —                                   | —                               |
| Authorization                | Tetap Owner/Admin per Workspace                                                                                                                                                        | —                                   | —                               |
| Shared contract              | `leader.ts` (tambahan)                                                                                                                                                                 | —                                   | —                               |
| Estimasi WRA                 | ≤8 per phase                                                                                                                                                                           | —                                   | —                               |
| Risiko & rollback            | Revert PR                                                                                                                                                                              | —                                   | —                               |

## 3. Rekomendasi

Opsi A (program plan 5.6A, D7: mulai dengan banyak stream SSE per Workspace).

## 4. Dampak policy

- [x] Mengubah policy → ADR-045 (definisi kesehatan), ADR-044 (beban berbasis poin menggantikan aturan ≥3 subtask).

## 5. Keputusan

**Dipilih:** Opsi A — oleh Owner, 2026-11-17, chat "Setuju semua (Recommended)"
**Ditolak:** menunggu SIMPLE-UI
