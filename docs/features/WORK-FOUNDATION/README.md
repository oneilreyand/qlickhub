# WORK-FOUNDATION — Feature Overview

**Status:** Draft
**Owner:** Owner Qlick Hub
**Last reviewed:** 2026-11-17
**Applicable Policy IDs:** AUTH-001, AUTH-002, FLOW-002, FLOW-008, FLOW-009, FLOW-010, FLOW-004, DATA-001, DATA-002, DATA-005, DATA-006, CONTRACT-001, UI-001, TEST-001, SDLC-001

Fondasi data untuk Laporan Saya dan Leader Hub: kalender kerja Workspace, effort Subtask, kapasitas orang, hambatan (blocker), dan audit histori status.

## Stage Tracker

| Tahap             | Dokumen                                                                                | Status      | Gerbang         | Disetujui oleh / tanggal       | Catatan                                                             |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | --------------- | ------------------------------ | ------------------------------------------------------------------- |
| 0 Problem         | [problem.md](problem.md)                                                               | Disetujui   | G0              | Owner melalui chat, 2026-11-17 | Program WORK-VISIBILITY                                             |
| 1 Opsi Solusi     | [solution.md](solution.md)                                                             | Disetujui   | G1              | Owner melalui chat, 2026-11-17 | ADR: [ADR 044](../../adr/README.md), [ADR 045](../../adr/README.md) |
| 2 PRD             | [product.md](product.md)                                                               | Disetujui   | G2              | Owner melalui chat, 2026-11-17 |                                                                     |
| 3 Breakdown       | [breakdown.md](breakdown.md)                                                           | Disetujui   | G3              | Owner melalui chat, 2026-11-17 | Jalur: Penuh                                                        |
| (shared)          | [contracts.md](contracts.md) · [authorization.md](authorization.md) · [roles/](roles/) | Disetujui   | bagian G2       | Owner melalui chat, 2026-11-17 |                                                                     |
| 4 Build           | [phases/](phases/)                                                                     | Draft       | dalam window G3 | —                              | P1–P3 PR; P5 kandidat lokal; P4 belum mulai                         |
| 5 Test & Review   | [testing.md](testing.md)                                                               | Belum mulai | G5              | —                              | Verifier: CI + review independen                                    |
| 6 Release & Close | [release.md](release.md)                                                               | Belum mulai | G6              | —                              |                                                                     |

Status tahap: `Belum mulai`, `Draft`, `Menunggu persetujuan`, `Disetujui`, `Blocked`, `Selesai`.

## 1. Tujuan dan Pengguna

Planner dan anggota tim butuh data yang bisa dihitung untuk menilai beban, ketepatan waktu, dan hambatan. Detail: [problem.md](problem.md) dan [solution.md](solution.md); program: [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md).

## 2. Requirement dan Acceptance Criteria

Requirement dan AC ber-ID ada di [product.md](product.md).

## 3. Alur Lintas Peran

```mermaid
flowchart LR
  OA[Owner/Admin atur kalender & kapasitas] --> CAL[(Kalender, kapasitas, cuti)]
  PO[PO isi effort saat menjadwalkan Subtask] --> EFF[(effort Subtask)]
  DQ[Dev/QA/PO buka hambatan] --> BLK[(task_blockers)]
  BLK -->|notifikasi| PIC[PIC hambatan]
  CAL & EFF & BLK --> REP[MY-WORK-REPORT & LEADER-PIPELINE-HUB]
```

| Pembaca       | Baca berikutnya                              | Output / handoff                                   |
| ------------- | -------------------------------------------- | -------------------------------------------------- |
| Owner / Admin | [roles/owner-admin.md](roles/owner-admin.md) | Kalender, hari libur, kapasitas default            |
| PO            | [roles/po.md](roles/po.md)                   | Effort pada Subtask terjadwal                      |
| Developer     | [roles/developer.md](roles/developer.md)     | Membuka/menutup hambatan, kapasitas & cuti sendiri |
| QA            | [roles/qa.md](roles/qa.md)                   | Membuka/menutup hambatan, bukti E3/E4              |

## 4. Data dan Relasi

Lihat [contracts.md](contracts.md).

## 5. API dan Shared Contract

Lihat [contracts.md](contracts.md); bentuk field mengikuti `packages/contracts`, tidak disalin di sini.

## 6. Authorization

Lihat [authorization.md](authorization.md).

## 7. UI dan Interaction States

Layar baru: tab Kalender & Kapasitas di Pengaturan Workspace (desain `05-pengaturan-kalender-kapasitas.webp`), field effort di form Subtask, dan panel Hambatan di detail Subtask (belum didesain; mengikuti pola panel yang ada). Desain: [work-visibility/design](../../plans/work-visibility/design/README.md). User flow dan state per layar di [product.md](product.md) §3–§4.

## 8. Pengujian dan Evidence

Lihat [testing.md](testing.md); pembagian phase di [breakdown.md](breakdown.md).

## 9. Release dan Readiness

Lihat [release.md](release.md).

## 10. Traceability

`Problem → Solution/ADR → Requirement → AC → Phase → Task BE/FE/QA → contract/code → Test Result → Bug/retest → report → release decision`
