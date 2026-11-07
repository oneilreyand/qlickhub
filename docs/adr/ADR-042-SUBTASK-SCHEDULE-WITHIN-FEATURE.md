# ADR-042 — Subtask schedule within Feature

- **Status:** Accepted
- **Date:** 2026-11-07
- **Decision owner:** Owner, chat `ok` menyetujui G0–G3 serta K1/L1/L2 dan ADR/SSoT sebelum build lokal.
- **Feature:** [SUBTASK-SCHEDULE-WITHIN-FEATURE](../features/SUBTASK-SCHEDULE-WITHIN-FEATURE/README.md)

## Context

Pasangan dan urutan tanggal sudah divalidasi (ADR-007), tetapi rentang parent/child belum dijaga.
Tanggal root juga dapat diubah melalui sinkronisasi Plan Feature Spec. Auto-shift akan mengubah
komitmen pekerjaan tanpa keputusan Planner.

## Decision

Aturan kanonikal DOMAIN-005 ada pada [Workflow §4](../2_WORKFLOW_AND_ROLES.md#jadwal-subtask-dalam-feature).
K1 memilih penolakan, bukan pergeseran otomatis. L1 mengizinkan edit non-tanggal pada data legacy;
perubahan tanggal harus menghasilkan rentang valid penuh. L2 menolak aktivasi ulang child terminal
yang tetap keluar rentang. Semua writer relevan memakai transaksi dan serialisasi pada root yang sama.
Tanggal opsional berpasangan, status done/canceled, izin planning, audit dan Workspace scope tetap.

## Alternatives and consequences

Guard server dipilih karena mencakup semua caller dan race; UI-only tidak cukup. Auto-shift ditolak
karena dampak jadwal/audit lebih luas. Status quo tidak menyelesaikan konflik. Metadata backend
membuat legacy terlihat tanpa rewrite, dengan biaya query batch tambahan; query count/EXPLAIN dan
concurrency diuji pada PostgreSQL disposable. Tidak ada migrasi/backfill. Error baru 400/409 adalah
perubahan perilaku mutation yang disengaja, metadata response additive. Rollback kode tidak memerlukan
pemulihan data karena tidak ada cascade perubahan jadwal.
