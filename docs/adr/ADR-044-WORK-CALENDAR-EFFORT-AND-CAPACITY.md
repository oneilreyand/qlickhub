# ADR-044 — Work calendar, effort points, and personal capacity

- **Status:** Accepted — G2 disetujui Owner 2026-11-17 ("Setuju G2 G3 semua")
- **Date:** 2026-11-17
- **Decision owner:** Owner, chat 2026-11-17: G0/G1 program WORK-VISIBILITY "Setuju semua (Recommended)" (D3, D4, D5, D6)
- **Feature:** [WORK-FOUNDATION](../features/WORK-FOUNDATION/README.md), dipakai oleh
  [MY-WORK-REPORT](../features/MY-WORK-REPORT/README.md) dan [LEADER-PIPELINE-HUB](../features/LEADER-PIPELINE-HUB/README.md)

## Context

Task hanya punya `startDate`, `dueDate`, `status`, dan `priority`. Workspace tidak punya zona waktu,
hari kerja, atau hari libur. Beban kerja Leader dihitung dari jumlah subtask aktif (≥3 = overloaded),
sehingga tidak bisa membedakan kerjaan ringan dan berat, dan "telat" dihitung tanpa batas hari yang
jelas. Rencana: [WORK_VISIBILITY_PROGRAM_PLAN](../plans/WORK_VISIBILITY_PROGRAM_PLAN.md) §5.2–§5.3, §6 F1.

## Decision

1. **Kalender per Workspace.** Zona waktu IANA (default `Asia/Jakarta`), hari kerja (default Senin–Jumat)
   dan daftar hari libur bertanggal. "Hari ini", "telat", dan "hari kerja tersedia" untuk sebuah task
   dihitung di backend dengan kalender Workspace task itu.
2. **Effort ukuran kaos per Subtask:** `xs|s|m|l|xl` = 1/2/3/5/8 poin. Peta poin hanya ada di
   `packages/contracts`. Kolom nullable; wajib saat Planner membuat atau menjadwalkan Subtask baru
   setelah rilis, data lama boleh kosong dan ditampilkan sebagai "beban belum diukur". Effort adalah
   field perencanaan (`FLOW-002`).
3. **Satu kapasitas per orang lintas Workspace.** Kapasitas = poin per minggu. Nilai efektif: override
   milik user bila ada, selain itu default terkecil dari Workspace aktif user (konservatif). Cuti
   disimpan sebagai rentang tanggal tanpa alasan, sehingga tidak memuat data pribadi.
4. **Beban harian** = Σ (poin effort ÷ hari kerja task) untuk task aktif yang mencakup hari itu, dibagi
   kapasitas harian (kapasitas mingguan ÷ jumlah hari kerja). Hari cuti dan hari libur Workspace task
   tidak dihitung. >100% = melebihi kapasitas.
5. **Kewajaran waktu dinilai per task, bukan per orang.** Pembanding adalah median hari kerja aktual
   per ukuran effort di Workspace yang sama (90 hari terakhir, minimal 5 sampel): Terlalu ketat (<0,7×),
   Wajar, Longgar (>1,5×), atau "Data belum cukup". Ambang dapat diubah per Workspace setelah pilot.
   Tidak ada skor, ranking, atau perbandingan antar orang (`docs/2_WORKFLOW_AND_ROLES.md` §2 butir 5).
6. Histori lama tidak direka (`DATA-005`): Subtask tanpa event `in_progress` atau tanpa `completedAt`
   dikeluarkan dari baseline dan ditandai "tidak diketahui".

## Alternatives and consequences

Estimasi jam ditolak (berat diisi dan rawan menjadi penilaian orang). `priority` sebagai bobot ditolak
(urgensi bukan berat). Kapasitas per Workspace ditolak karena satu orang yang bekerja di tiga Workspace
akan terlihat "aman" di masing-masing. Konsekuensi: migrasi aditif di `workspaces`, `tasks`, dan dua
tabel baru; aturan `overloaded` Leader diganti di LEADER-PIPELINE-HUB. Aturan kanonis akan ditulis di
`docs/1_ARCHITECTURE.md` dan `docs/POLICY_REGISTRY.md` pada phase build pertama yang memakainya.
