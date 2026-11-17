# MY-WORK-REPORT — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Disetujui:** Owner melalui chat, 2026-11-17 — "Setuju semua (Recommended)" dan "Semua 4 Feature" untuk G0/G1 program WORK-VISIBILITY
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-044](../../adr/ADR-044-WORK-CALENDAR-EFFORT-AND-CAPACITY.md), [ADR-047](../../adr/ADR-047-CROSS-WORKSPACE-TASK-RELATIONS.md)
**Applicable Policy IDs:** AI-006, SDLC-001, DOC-002

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E. Opsi lengkap ada di [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §5.

## 1. Kondisi sekarang

`/reports` menampilkan `TeamCapacityTimeline` per Workspace aktif. `GET …/capacity/timeline` dan `assignment-conflicts` ada di modul `capacity`. Komponen UI Laporan Saya sudah tersedia di Galeri (fixture).

## 2. Opsi

|                              | Opsi A (dipilih)                                                                                                                          | Opsi B                                         | Opsi 0: tidak dikerjakan        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------- |
| Ringkasan                    | Menu global Laporan Saya `/my-report`, agregasi backend lintas Workspace, `task_relations` baru, Timeline Tim pindah ke konteks Workspace | Perluas `/reports` dengan scope Saya/Workspace | Biarkan seperti sekarang        |
| Pro                          | Tiga level jelas: saya · tim · leader                                                                                                     | Perubahan navigasi kecil                       | Tanpa kerja                     |
| Kontra                       | Navigasi berubah; koordinasi dengan UI-WORKSPACE-REFRESH                                                                                  | Tetap terikat Workspace aktif                  | Masalah di problem.md tetap ada |
| Lapisan terdampak (FE/BE/DB) | contracts, API, Web                                                                                                                       | Web, API                                       | —                               |
| Data / migrasi               | `task_relations` (aditif)                                                                                                                 | —                                              | —                               |
| Authorization                | Baca hanya milik aktor; relasi lintas Workspace diredaksi                                                                                 | —                                              | —                               |
| Shared contract              | `myWorkReport.ts`, `taskRelation.ts`                                                                                                      | Kecil                                          | —                               |
| Estimasi WRA                 | ≤8 per phase                                                                                                                              | 6                                              | —                               |
| Risiko & rollback            | Revert PR                                                                                                                                 | Mudah                                          | —                               |

## 3. Rekomendasi

Opsi A (program plan 5.1A, D2, D8).

## 4. Dampak policy

- [x] Mengubah policy → ADR-047 (amandemen ADR-024/`AUTH-011`); ADR-044 untuk definisi beban dan kewajaran.

## 5. Keputusan

**Dipilih:** Opsi A — oleh Owner, 2026-11-17, chat "Setuju semua (Recommended)"
**Ditolak:** perluasan `/reports`
