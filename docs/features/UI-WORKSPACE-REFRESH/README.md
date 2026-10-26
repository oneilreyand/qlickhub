# UI-WORKSPACE-REFRESH — Feature Overview

**Status:** Draft
**Owner:** User (approval via Codex chat)
**Last reviewed:** 2026-10-23
**Applicable Policy IDs:** UI-001, UI-002, UI-003, UI-004, AUTH-001, AUTH-002, CONTRACT-001, DATA-001, FLOW-005, TEST-001, DOC-005, SDLC-001, SDLC-002

> Salin seluruh folder ke `docs/features/<FEATURE-ID>/`. File ini adalah pintu masuk kanonis.
> Sepuluh heading bernomor di bawah **wajib dipertahankan** karena divalidasi `npm run docs:check`.
> Buat folder dengan `npm run sdlc:new -- feature <ID>`. Tahap `Disetujui`/`Selesai` wajib mencatat
> penyetuju/tanggal dan dokumennya bebas placeholder (`SDLC-002`).
> Alur tahap dan Stage Card: [Agent Guidelines §2B](../../4_AGENT_DEV_GUIDELINES.md#2b-tahap-sdlc-feature-staged-feature-sdlc).
> Feature `Active` tidak boleh berisi placeholder.

## Stage Tracker

| Tahap             | Dokumen                                                                                | Status      | Gerbang         | Disetujui oleh / tanggal                                                    | Catatan                                                                                                                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | --------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 Problem         | [problem.md](problem.md)                                                               | Disetujui   | G0              | User 2026-10-23                                                             | Audit UI lokal dan konsep terintegrasi menjadi evidence awal.                                                                                                                                     |
| 1 Opsi Solusi     | [solution.md](solution.md)                                                             | Disetujui   | G1              | User 2026-10-23                                                             | Tidak perlu ADR: tidak ada perubahan kebijakan.                                                                                                                                                   |
| 2 PRD             | [product.md](product.md)                                                               | Disetujui   | G2              | User 2026-10-23                                                             | Jalur: Penuh karena lintas role dan halaman.                                                                                                                                                      |
| 3 Breakdown       | [breakdown.md](breakdown.md)                                                           | Disetujui   | G3              | User 2026-10-23; P2/P3 2026-10-24; P3.1/P3.2/P4 2026-10-25                  | Window P3 mencakup baseline visual Task Hub; P3.1 menambah kontrak tema dan guard regresi Light/Dark, lalu P3.2 mengaudit komponen bersama. P4 memetakan konteks antrean dan bukti Laporan.       |
| (shared)          | [contracts.md](contracts.md) · [authorization.md](authorization.md) · [roles/](roles/) | Disetujui   | bagian G2       | User 2026-10-23                                                             | Tetap memakai kontrak dan policy yang ada.                                                                                                                                                        |
| 4 Build           | [phases/](phases/)                                                                     | Draft       | dalam window G3 | User 2026-10-23; P2/P3 2026-10-24; P3.1/P3.2/P4 2026-10-25; P3.3 2026-10-26 | P3.3 mengganti Kanban kartu Feature root menjadi subtask paginated per Feature melalui endpoint existing; E2/E3/E4 termasuk halaman 1 → 2 → 1 kini tersedia. P4 diterima G5; P1/P2 masih tersisa. |
| 5 Test & Review   | [testing.md](testing.md)                                                               | Draft       | G5              | Independent P5 review 2026-10-26                                            | P4 Accepted. P3.3 E2/E3/E4 accepted. AC-1.1, AC-2.1/2.2, dan Feature-wide G5 belum dapat diterima.                                                                                                |
| 6 Release & Close | [release.md](release.md)                                                               | Belum mulai | G6              | —                                                                           |                                                                                                                                                                                                   |

Status tahap: `Belum mulai`, `Draft`, `Menunggu persetujuan`, `Disetujui`, `Blocked`, `Selesai`.
(Ini terpisah dari **Status** kartu di atas, yang tetap `Draft` / `Active` / `Superseded` / `Archived`.)

## 1. Tujuan dan Pengguna

Ringkasan masalah dan hasil yang diharapkan. Detail: [problem.md](problem.md) dan
[solution.md](solution.md).

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

User flow per layar ada di [product.md](product.md) §3. Referensi konsep interaktif hanya menjadi input desain; data dan role picker di dalamnya bukan perilaku produk.

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
