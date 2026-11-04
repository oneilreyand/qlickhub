# DEADLINE-REMINDER-CRON — Feature Overview

**Status:** Draft
**Owner:** reyand (Owner)
**Last reviewed:** 2026-11-04
**Applicable Policy IDs:** DOC-005, SDLC-001, SDLC-002, AUTH-012, DATA-001, TEST-001

> Salin seluruh folder ke `docs/features/<FEATURE-ID>/`. File ini adalah pintu masuk kanonis.
> Sepuluh heading bernomor di bawah **wajib dipertahankan** karena divalidasi `npm run docs:check`.
> Buat folder dengan `npm run sdlc:new -- feature <ID>`. Tahap `Disetujui`/`Selesai` wajib mencatat
> penyetuju/tanggal dan dokumennya bebas placeholder (`SDLC-002`).
> Alur tahap dan Stage Card: [Agent Guidelines §2B](../../4_AGENT_DEV_GUIDELINES.md#2b-tahap-sdlc-feature-staged-feature-sdlc).
> Feature `Active` tidak boleh berisi placeholder.

## Stage Tracker

| Tahap             | Dokumen                                                                                | Status               | Gerbang         | Disetujui oleh / tanggal  | Catatan                                     |
| ----------------- | -------------------------------------------------------------------------------------- | -------------------- | --------------- | ------------------------- | ------------------------------------------- |
| 0 Problem         | [problem.md](problem.md)                                                               | Disetujui            | G0              | reyand (Owner) 2026-11-04 | Dari PROD-LATENCY-FOLLOWUP butir 1–2        |
| 1 Opsi Solusi     | [solution.md](solution.md)                                                             | Disetujui            | G1              | reyand (Owner) 2026-11-04 | ADR: lihat solution.md                      |
| 2 PRD             | [product.md](product.md)                                                               | Disetujui            | G2              | reyand (Owner) 2026-11-04 | G0–G2 disetujui sekaligus (jalur Standar)   |
| 3 Breakdown       | [breakdown.md](breakdown.md)                                                           | Disetujui            | G3              | reyand (Owner) 2026-11-04 | Jalur: Standar (WRA 8/16), satu phase       |
| (shared)          | [contracts.md](contracts.md) · [authorization.md](authorization.md) · [roles/](roles/) | Disetujui            | bagian G2       | reyand (Owner) 2026-11-04 |                                             |
| 4 Build           | [phases/](phases/)                                                                     | Selesai              | dalam window G3 | reyand (Owner) 2026-11-04 | P1 kandidat teruji                          |
| 5 Test & Review   | [testing.md](testing.md)                                                               | Menunggu persetujuan | G5              | —                         | Verifier: review agent terpisah + CI PR     |
| 6 Release & Close | [release.md](release.md)                                                               | Belum mulai          | G6              | —                         | Butuh setup Supabase Cron oleh Owner (AC-8) |

Status tahap: `Belum mulai`, `Draft`, `Menunggu persetujuan`, `Disetujui`, `Blocked`, `Selesai`.
(Ini terpisah dari **Status** kartu di atas, yang tetap `Draft` / `Active` / `Superseded` / `Archived`.)

## 1. Tujuan dan Pengguna

Pengingat deadline dibuat sekali sehari oleh job terjadwal Supabase Cron yang memanggil
`POST /v1/cron/deadline-reminders`, bukan lagi oleh browser Admin/Owner. Penerima: assignee dan
reporter task terbuka yang jatuh tempo dari 7 hari lalu sampai besok. Detail:
[problem.md](problem.md) dan [solution.md](solution.md).

## 2. Requirement dan Acceptance Criteria

Link Requirement dan AC ber-ID di [product.md](product.md).

## 3. Alur Lintas Peran

```mermaid
flowchart LR
  OA[Owner / Admin: workspace guard] --> PO[PO: scope and acceptance criteria]
  PO --> DEV[Developer: implementation candidate]
  DEV --> QA[QA: test evidence and sign-off]
  QA -->|passed| PO
  QA -->|failed / Bug| DEV
  PO --> REL[Release decision]
```

| Pembaca       | Baca berikutnya                              | Output / handoff                    |
| ------------- | -------------------------------------------- | ----------------------------------- |
| Owner / Admin | [roles/owner-admin.md](roles/owner-admin.md) | Batas workspace dan akses           |
| PO            | [roles/po.md](roles/po.md)                   | Scope disetujui dan keputusan rilis |
| Developer     | [roles/developer.md](roles/developer.md)     | Kandidat dan bukti implementasi     |
| QA            | [roles/qa.md](roles/qa.md)                   | Test result, Bug/retest, sign-off   |

User flow per layar ada di [product.md](product.md) §3.

## 4. Data dan Relasi

Lihat [contracts.md](contracts.md).

## 5. API dan Shared Contract

Lihat [contracts.md](contracts.md); jangan menyalin field kontrak.

## 6. Authorization

Lihat [authorization.md](authorization.md).

## 7. UI dan Interaction States

User flow dan wireframe per state di [product.md](product.md) §3–§4.

## 8. Pengujian dan Evidence

Lihat [testing.md](testing.md); pembagian phase di [breakdown.md](breakdown.md).

## 9. Release dan Readiness

Lihat [release.md](release.md).

## 10. Traceability

`Problem → Solution/ADR → Requirement → AC → Phase → Task BE/FE/QA → contract/code → Test Result →
Bug/retest → report → release decision`
