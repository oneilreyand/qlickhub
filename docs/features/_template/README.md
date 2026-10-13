# [FEATURE-ID] — Feature Overview

**Status:** Draft
**Owner:** TBD
**Last reviewed:** YYYY-MM-DD
**Applicable Policy IDs:** DOC-005, SDLC-001, TBD

> Salin seluruh folder ke `docs/features/<FEATURE-ID>/`. File ini adalah pintu masuk kanonis.
> Sepuluh heading bernomor di bawah **wajib dipertahankan** karena divalidasi `npm run docs:check`.
> Buat folder dengan `npm run sdlc:new -- feature <ID>`. Tahap `Disetujui`/`Selesai` wajib mencatat
> penyetuju/tanggal dan dokumennya bebas placeholder (`SDLC-002`).
> Alur tahap dan Stage Card: [Agent Guidelines §2B](../../4_AGENT_DEV_GUIDELINES.md#2b-tahap-sdlc-feature-staged-feature-sdlc).
> Feature `Active` tidak boleh berisi placeholder.

## Stage Tracker

| Tahap             | Dokumen                                                                                | Status      | Gerbang         | Disetujui oleh / tanggal | Catatan                            |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | --------------- | ------------------------ | ---------------------------------- |
| 0 Problem         | [problem.md](problem.md)                                                               | Draft       | G0              | —                        |                                    |
| 1 Opsi Solusi     | [solution.md](solution.md)                                                             | Belum mulai | G1              | —                        | ADR: —                             |
| 2 PRD             | [product.md](product.md)                                                               | Belum mulai | G2              | —                        |                                    |
| 3 Breakdown       | [breakdown.md](breakdown.md)                                                           | Belum mulai | G3              | —                        | Jalur: Standar / Penuh             |
| (shared)          | [contracts.md](contracts.md) · [authorization.md](authorization.md) · [roles/](roles/) | Belum mulai | bagian G2       | —                        | file yang sudah ada di `_template` |
| 4 Build           | [phases/](phases/)                                                                     | Belum mulai | dalam window G3 | —                        |                                    |
| 5 Test & Review   | [testing.md](testing.md)                                                               | Belum mulai | G5              | —                        | Verifier: —                        |
| 6 Release & Close | [release.md](release.md)                                                               | Belum mulai | G6              | —                        |                                    |

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
