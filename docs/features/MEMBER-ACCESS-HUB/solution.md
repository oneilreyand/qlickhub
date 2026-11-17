# MEMBER-ACCESS-HUB — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Disetujui
**Gerbang:** G1 — disetujui oleh Owner
**Disetujui:** Owner melalui chat, 2026-11-17 — "Setuju semua (Recommended)" dan "Semua 4 Feature" untuk G0/G1 program WORK-VISIBILITY
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-046](../../adr/ADR-046-MEMBER-ACCESS-HUB-AND-TIME-BOUND-MEMBERSHIP.md)
**Applicable Policy IDs:** AI-006, SDLC-001, DOC-002

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E. Opsi lengkap ada di [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §5.

## 1. Kondisi sekarang

`POST /workspaces/:id/members` (Owner/Admin) menerima banyak Workspace sekaligus dengan role dan spesialisasi per Workspace; user baru dibuat tanpa password + token aktivasi + email. Riwayat di `workspace_membership_activities`. Pengaturan Workspace berupa satu halaman panjang.

## 2. Opsi

|                              | Opsi A (dipilih)                                                                                                                         | Opsi B                       | Opsi 0: tidak dikerjakan        |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------- |
| Ringkasan                    | Halaman Anggota & Akses di luar Workspace (cakupan: Workspace tempat aktor Owner/Admin), tanpa Organization; `expires_at` di keanggotaan | Entitas Organization         | Biarkan seperti sekarang        |
| Pro                          | Memakai ulang aturan per Workspace                                                                                                       | Model jangka panjang         | Tanpa kerja                     |
| Kontra                       | Tidak ada "admin organisasi"                                                                                                             | Migrasi besar, boundary baru | Masalah di problem.md tetap ada |
| Lapisan terdampak (FE/BE/DB) | contracts, API, Web                                                                                                                      | Semua                        | —                               |
| Data / migrasi               | `workspace_members.expires_at` (aditif)                                                                                                  | Besar                        | —                               |
| Authorization                | Amandemen AUTH-001; middleware keanggotaan (Tier 2)                                                                                      | Boundary baru                | —                               |
| Shared contract              | `memberAccess.ts`                                                                                                                        | Besar                        | —                               |
| Estimasi WRA                 | ≤8 per phase                                                                                                                             | >8                           | —                               |
| Risiko & rollback            | Revert PR                                                                                                                                | Sulit                        | —                               |

## 3. Rekomendasi

Opsi A (program plan 5.5A, D10).

## 4. Dampak policy

- [x] Mengubah policy → ADR-046; `AUTH-001` diamandemen saat P5 di-build.

## 5. Keputusan

**Dipilih:** Opsi A — oleh Owner, 2026-11-17, chat "Setuju semua (Recommended)"
**Ditolak:** Organization entity; tetap per Workspace
