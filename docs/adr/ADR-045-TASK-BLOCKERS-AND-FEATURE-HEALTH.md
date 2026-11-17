# ADR-045 — Task blockers and Feature health

- **Status:** Accepted — G2 disetujui Owner 2026-11-17 ("Setuju G2 G3 semua")
- **Date:** 2026-11-17
- **Decision owner:** Owner, chat 2026-11-17: G0/G1 program WORK-VISIBILITY "Setuju semua (Recommended)" (D5, D9)
- **Feature:** [WORK-FOUNDATION](../features/WORK-FOUNDATION/README.md) (blocker), [LEADER-PIPELINE-HUB](../features/LEADER-PIPELINE-HUB/README.md) (kesehatan)

## Context

Tidak ada cara mencatat kenapa sebuah Subtask tertahan. Leader menanyakan status secara manual dan
tidak bisa melihat Feature mana yang terhambat beserta PIC-nya. Rencana: program plan §5.4, §6 F4.

## Decision

1. **Blocker adalah record terpisah (`task_blockers`), bukan status task.** Kategori: menunggu
   klarifikasi, menunggu dependency, menunggu review, lingkungan/infra, akses, pihak eksternal, lainnya.
   Satu task bisa punya beberapa blocker. Membuka dan menutup blocker tercatat di activity dan
   mengirim notifikasi ke PIC. Alur status task, gate QA, dan rilis tidak berubah.
2. **Kesehatan Feature dihitung di backend dan selalu membawa alasan yang bisa ditelusuri:**
   - _Terhambat_: ada blocker terbuka, atau Feature berada di satu tahap lebih lama dari ambang tahap itu.
   - _Berisiko_: ada Subtask Telat/Berisiko, `changes_requested` ≥2 kali pada satu Subtask, bug
     critical/high terbuka menjelang rilis, assignee melebihi kapasitas (ADR-044), atau Subtask aktif
     tanpa assignee/jadwal/effort.
   - _Aman_: tidak ada kondisi di atas.
3. **Semua aksi bersifat advisory** (ADR-024): "Ping PIC" hanya mengirim notifikasi; reassign dan
   ubah jadwal memakai endpoint dan aturan yang sudah ada. Tidak ada aksi otomatis.

## Alternatives and consequences

Status `blocked` di enum ditolak karena mengubah alur status, kanban, gate QA/rilis, dan menghilangkan
alasan serta histori. Konsekuensi: satu tabel baru, notifikasi baru, dan aturan kesehatan yang harus
diuji per kondisi dengan PostgreSQL.
