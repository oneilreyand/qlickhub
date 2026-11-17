# WORK-FOUNDATION — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Disetujui:** Owner melalui chat, 2026-11-17 — "Setuju semua (Recommended)" dan "Semua 4 Feature" untuk G0/G1 program WORK-VISIBILITY
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-044](../../adr/ADR-044-WORK-CALENDAR-EFFORT-AND-CAPACITY.md), [ADR-045](../../adr/ADR-045-TASK-BLOCKERS-AND-FEATURE-HEALTH.md)
**Applicable Policy IDs:** AI-006, SDLC-001, DOC-002

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E. Opsi lengkap ada di [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §5.

## 1. Kondisi sekarang

Task: `status`, `priority`, `deliveryArea`, `startDate`, `dueDate`, `completedAt`. Histori status di `task_activities` (`metadataJson.changes.status`). Kapasitas hanya berupa deteksi bentrok tanggal (`FLOW-007`, `modules/capacity`). Tidak ada model kalender, effort, kapasitas, atau blocker.

## 2. Opsi

|                              | Opsi A (dipilih)                                                                                       | Opsi B                                                           | Opsi 0: tidak dikerjakan        |
| ---------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- | ------------------------------- |
| Ringkasan                    | Kalender per Workspace, effort XS–XL (1/2/3/5/8 poin), satu kapasitas per orang, tabel `task_blockers` | Estimasi jam, kapasitas per Workspace, status `blocked` di enum  | Biarkan seperti sekarang        |
| Pro                          | Cepat diisi, tidak menilai orang, alur status tetap                                                    | Presisi                                                          | Tanpa kerja                     |
| Kontra                       | Effort subjektif di awal                                                                               | Berat diisi, jadi penilaian orang, mengubah alur status dan gate | Masalah di problem.md tetap ada |
| Lapisan terdampak (FE/BE/DB) | DB, contracts, API, Web                                                                                | DB, API, Web, gate QA/rilis                                      | —                               |
| Data / migrasi               | Aditif: kolom di `workspaces`/`tasks`, 3 tabel baru                                                    | Mengubah enum status                                             | —                               |
| Authorization                | Aturan baru per aksi (lihat authorization.md)                                                          | Sama                                                             | —                               |
| Shared contract              | `workCalendar.ts`, `capacity.ts`, `blocker.ts`, `task.ts`                                              | Lebih besar                                                      | —                               |
| Estimasi WRA                 | 16/16 program; tiap phase ≤8                                                                           | >8 per phase                                                     | —                               |
| Risiko & rollback            | Revert PR; migrasi punya `down`                                                                        | Sulit di-rollback                                                | —                               |

## 3. Rekomendasi

Opsi A: memenuhi metrik problem.md tanpa mengubah alur status maupun menilai orang.

## 4. Dampak policy

- [x] Mengubah policy → ADR-044 dan ADR-045 dibuat sebelum tahap 2; SSoT (`1_ARCHITECTURE.md`, `POLICY_REGISTRY.md`) diperbarui di phase build yang memakainya.

## 5. Keputusan

**Dipilih:** Opsi A (program plan 5.2A, 5.3A, 5.4A; D3, D4, D5, D6, D9) — oleh Owner, 2026-11-17, chat "Setuju semua (Recommended)"
**Ditolak:** estimasi jam, priority sebagai bobot, kapasitas per Workspace, status `blocked`
