# LEADER-PIPELINE-HUB — Feature Overview

**Status:** Draft
**Owner:** Owner Qlick Hub
**Last reviewed:** 2026-11-17
**Applicable Policy IDs:** AUTH-001, AUTH-002, AUTH-011, FLOW-007, FLOW-011, DATA-001, DATA-005, CONTRACT-001, UI-001, TEST-001, SDLC-001

Leader Hub tab Ringkasan: pipeline SDLC per Feature, kesehatan dengan alasan, hambatan terbuka, dan beban tim berbasis poin. Berbeda dari LEADER-SDLC-HUB (Codex, tab "Aktivitas periode").

## Stage Tracker

| Tahap             | Dokumen                                                                                | Status      | Gerbang         | Disetujui oleh / tanggal       | Catatan                                                             |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | --------------- | ------------------------------ | ------------------------------------------------------------------- |
| 0 Problem         | [problem.md](problem.md)                                                               | Disetujui   | G0              | Owner melalui chat, 2026-11-17 | Program WORK-VISIBILITY                                             |
| 1 Opsi Solusi     | [solution.md](solution.md)                                                             | Disetujui   | G1              | Owner melalui chat, 2026-11-17 | ADR: [ADR 044](../../adr/README.md), [ADR 045](../../adr/README.md) |
| 2 PRD             | [product.md](product.md)                                                               | Disetujui   | G2              | Owner melalui chat, 2026-11-17 |                                                                     |
| 3 Breakdown       | [breakdown.md](breakdown.md)                                                           | Disetujui   | G3              | Owner melalui chat, 2026-11-17 | Jalur: Penuh                                                        |
| (shared)          | [contracts.md](contracts.md) · [authorization.md](authorization.md) · [roles/](roles/) | Disetujui   | bagian G2       | Owner melalui chat, 2026-11-17 |                                                                     |
| 4 Build           | [phases/](phases/)                                                                     | Draft       | dalam window G3 | —                              | P1–P4 di main; P5–P6 kandidat lokal; P7 ditunda (SIMPLE-UI)         |
| 5 Test & Review   | [testing.md](testing.md)                                                               | Belum mulai | G5              | —                              | Verifier: CI + review independen                                    |
| 6 Release & Close | [release.md](release.md)                                                               | Belum mulai | G6              | —                              |                                                                     |

Status tahap: `Belum mulai`, `Draft`, `Menunggu persetujuan`, `Disetujui`, `Blocked`, `Selesai`.

## 1. Tujuan dan Pengguna

Owner/Admin bisa menyebut Feature yang terhambat beserta penyebab dan PIC-nya dalam kurang dari satu menit. Detail: [problem.md](problem.md) dan [solution.md](solution.md); program: [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md).

## 2. Requirement dan Acceptance Criteria

Requirement dan AC ber-ID ada di [product.md](product.md).

## 3. Alur Lintas Peran

```mermaid
flowchart LR
  OA[Owner/Admin] --> LH[Leader Hub › Ringkasan]
  LH --> H[(Mesin kesehatan + tahap pipeline)]
  H --> WF[WORK-FOUNDATION: hambatan, effort, kapasitas]
  H --> MW[MY-WORK-REPORT: mesin beban]
  LH -->|Ping PIC| N[Notifikasi]
  LH -->|Buka| T[Detail Feature/Subtask]
```

| Pembaca       | Baca berikutnya                              | Output / handoff                         |
| ------------- | -------------------------------------------- | ---------------------------------------- |
| Owner / Admin | [roles/owner-admin.md](roles/owner-admin.md) | Pipeline, kesehatan, hambatan, beban tim |
| PO            | [roles/po.md](roles/po.md)                   | Menerima ping; data tahap PRD/Plan       |
| Developer     | [roles/developer.md](roles/developer.md)     | Menerima ping sebagai PIC                |
| QA            | [roles/qa.md](roles/qa.md)                   | Data tahap QA; bukti aturan kesehatan    |

## 4. Data dan Relasi

Lihat [contracts.md](contracts.md).

## 5. API dan Shared Contract

Lihat [contracts.md](contracts.md); bentuk field mengikuti `packages/contracts`, tidak disalin di sini.

## 6. Authorization

Lihat [authorization.md](authorization.md).

## 7. UI dan Interaction States

Tab Ringkasan mengikuti desain `02-leader-hub-ringkasan.webp`; komponen sudah di-slice di `organisms/leaderHub/` (PR #130). Tab Beban kerja, Hambatan, Alur & Kualitas, Laporan berkala, dan Detail Feature sudah didesain (gambar 06–10, 2026-11-19) dan masuk PRD sebagai REQ-8–REQ-12 — menunggu G2. Desain: [work-visibility/design](../../plans/work-visibility/design/README.md). User flow dan state per layar di [product.md](product.md) §3–§4.

## 8. Pengujian dan Evidence

Lihat [testing.md](testing.md); pembagian phase di [breakdown.md](breakdown.md).

## 9. Release dan Readiness

Lihat [release.md](release.md).

## 10. Traceability

`Problem → Solution/ADR → Requirement → AC → Phase → Task BE/FE/QA → contract/code → Test Result → Bug/retest → report → release decision`
