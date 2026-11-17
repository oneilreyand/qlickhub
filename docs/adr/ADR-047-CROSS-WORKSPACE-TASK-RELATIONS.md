# ADR-047 — Cross-workspace task relations and redaction

- **Status:** Accepted — G2 disetujui Owner 2026-11-17 ("Setuju G2 G3 semua")
- **Date:** 2026-11-17
- **Decision owner:** Owner, chat 2026-11-17: G0/G1 program WORK-VISIBILITY "Setuju semua (Recommended)"
- **Feature:** [MY-WORK-REPORT](../features/MY-WORK-REPORT/README.md); mengamandemen ADR-024 dan `AUTH-011`

## Context

Laporan Saya perlu menunjukkan kerjaan yang saling bergantung atau terkait antar Workspace. Tabel
`task_links` yang sudah ada menyimpan tautan URL referensi (Figma, dokumen) per task, bukan relasi antar
task. ADR-024/`AUTH-011` hanya mengizinkan ringkasan bentrok lintas Workspace yang diredaksi.

## Decision

1. **Tabel baru `task_relations`** (nama sengaja berbeda dari `task_links`): `blocks`, `relates_to`,
   `duplicates`, antar dua task yang boleh berada di Workspace berbeda. Hanya Planner (Owner/Admin/PO)
   yang boleh membuat atau menghapus relasi, dan ia harus Planner di Workspace task sumber serta
   anggota aktif Workspace task tujuan.
2. **Redaksi:** detail task tujuan (judul, Feature, Workspace) hanya ditampilkan bila pembaca boleh
   membaca task itu (`AUTH-013`). Selain itu yang terlihat hanya jenis relasi dan rentang tanggal,
   sama dengan aturan `AUTH-011`.
3. **Jadwal bentrok** milik user sendiri ditampilkan lengkap di Laporan Saya karena semua task-nya
   memang ditugaskan ke pembaca. Ringkasan bentrok untuk orang lain tetap mengikuti `AUTH-011`.

## Alternatives and consequences

Memakai ulang `task_links` ditolak (makna dan bentuk data berbeda). Relasi hanya dalam satu Workspace
ditolak karena irisan lintas Workspace adalah inti masalah P3. Konsekuensi: migrasi aditif,
pemeriksaan akses dua sisi, dan test redaksi untuk setiap pembaca yang tidak berhak.
