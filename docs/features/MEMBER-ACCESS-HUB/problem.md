# MEMBER-ACCESS-HUB — Tahap 0: Problem Statement

**Status:** Disetujui
**Gerbang:** G0 — disetujui oleh PO/Owner
**Disetujui:** Owner melalui chat, 2026-11-17 — "Setuju semua (Recommended)" dan "Semua 4 Feature" untuk G0/G1 program WORK-VISIBILITY
**Applicable Policy IDs:** SDLC-001, AUTH-001

Turunan dari [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §3.

## 1. Masalah

Owner/Admin yang mengelola beberapa Workspace tidak punya satu tempat untuk melihat siapa punya akses ke mana, status undangan, atau memberi akses sementara.

## 2. Bukti masalah

| Bukti                                                                      | Sumber                                                                                                                        | Level |
| -------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----- |
| Undangan multi-Workspace sudah ada, tetapi pengelolaan hanya per Workspace | `workspaceMembership.ts`, `InviteMemberModal.tsx`, [MULTI_WORKSPACE_MEMBER_ACCESS_UX](../MULTI_WORKSPACE_MEMBER_ACCESS_UX.md) | E1    |
| `expiresAt` hanya ada di izin pembuatan task, bukan keanggotaan            | `workspaceService.ts`                                                                                                         | E1    |
| Tidak ada status "menunggu aktivasi" yang terlihat                         | `user.ts` (`passwordHash` null sampai aktivasi)                                                                               | E1    |

## 3. Siapa yang terdampak

| Role              | Situasi                                            | Seberapa sering | Dampak                                  |
| ----------------- | -------------------------------------------------- | --------------- | --------------------------------------- |
| Owner/Admin       | Onboarding/offboarding orang di beberapa Workspace | Mingguan        | Kerja berulang, akses lupa dicabut      |
| Vendor/kontraktor | Butuh akses sementara                              | Per proyek      | Akses tertinggal setelah proyek selesai |

## 4. Bila tidak dikerjakan

Akses tetap tersebar dan akses sementara harus dicabut manual.

## 5. Metrik sukses

| Metrik                                                        | Baseline saat ini | Target      | Cara mengukur            |
| ------------------------------------------------------------- | ----------------- | ----------- | ------------------------ |
| Undangan multi-Workspace yang statusnya terlihat sampai aktif | tidak terlihat    | 100% di hub | UAT                      |
| Keanggotaan kedaluwarsa yang masih bisa mengakses             | belum ada fitur   | 0           | integration test + query |

## 6. Batasan dan di luar scope

- Entitas Organization dan billing.
- SSO/SCIM.
- Integrasi GitHub/Vercel di Pengaturan (kandidat lanjutan).

## 7. Unknown

| Pertanyaan                                         | Mengapa penting | Siapa bisa menjawab |
| -------------------------------------------------- | --------------- | ------------------- |
| Perlukah alokasi kapasitas % per Workspace di hub? | Terkait D6      | Owner setelah pilot |
