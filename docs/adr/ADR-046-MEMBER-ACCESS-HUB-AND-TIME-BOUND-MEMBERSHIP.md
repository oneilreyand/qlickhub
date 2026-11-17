# ADR-046 — Member & Access hub and time-bound membership

- **Status:** Proposed — menjadi Accepted saat G2 [MEMBER-ACCESS-HUB](../features/MEMBER-ACCESS-HUB/README.md) disetujui
- **Date:** 2026-11-17
- **Decision owner:** Owner, chat 2026-11-17: G0/G1 program WORK-VISIBILITY "Setuju semua (Recommended)" (D10)
- **Feature:** [MEMBER-ACCESS-HUB](../features/MEMBER-ACCESS-HUB/README.md)

## Context

Pengelolaan anggota tersebar per Workspace. Undangan multi-Workspace sudah ada
([MULTI_WORKSPACE_MEMBER_ACCESS_UX](../features/MULTI_WORKSPACE_MEMBER_ACCESS_UX.md)), tetapi tidak ada
gambaran siapa punya akses ke mana, status undangan, atau akses sementara. `expiresAt` hanya ada pada
izin pembuatan task (`AUTH-003`), bukan pada keanggotaan.

## Decision

1. **Halaman Anggota & Akses di luar Workspace, tanpa entitas Organization.** Cakupannya adalah semua
   Workspace tempat aktor menjadi Owner/Admin. Setiap mutasi tetap memanggil aturan per Workspace yang
   sudah ada; aktor tidak dapat mengubah akses di Workspace yang tidak ia kelola, dan pemberian role
   Owner tetap dibatasi seperti sekarang.
2. **Status undangan diturunkan dari data yang ada:** _Menunggu aktivasi_ bila user belum menyetel
   password; _Aktif_ bila sudah. Kirim ulang membuat token baru dan mencabut token lama; batalkan
   menghapus keanggotaan yang belum aktif.
3. **Keanggotaan berbatas waktu:** kolom nullable `expires_at` di `workspace_members`. Keanggotaan
   dengan `expires_at` yang sudah lewat **tidak aktif** untuk `AUTH-001` dan diperiksa pada setiap
   request oleh middleware keanggotaan. Job terjadwal (ADR-040) hanya membersihkan dan mencatat
   activity; keamanan tidak bergantung pada job.
4. Riwayat perubahan akses memakai `workspace_membership_activities` yang sudah ada.

## Alternatives and consequences

Entitas Organization ditolak untuk sekarang (migrasi besar dan boundary otorisasi baru). Tetap per
Workspace ditolak karena masalah P6 tidak selesai. Konsekuensi: amandemen `AUTH-001` (keanggotaan
kedaluwarsa dianggap tidak aktif), migrasi aditif, dan middleware Tier 2 yang diubah.
