# DOC-PORTAL — Feature Overview

**Status:** Draft
**Owner:** reyand (Owner)
**Last reviewed:** 2026-10-14
**Applicable Policy IDs:** DOC-005, SDLC-001, SDLC-002, DOC-004

> Portal dokumentasi lokal + completeness check (ratchet) untuk qlickhub, disusun sebagai core +
> adapter agar bisa dipakai ulang di proyek lain. File ini adalah pintu masuk kanonis.
> Sepuluh heading bernomor di bawah **wajib dipertahankan** karena divalidasi `npm run docs:check`.
> Buat folder dengan `npm run sdlc:new -- feature <ID>`. Tahap `Disetujui`/`Selesai` wajib mencatat
> penyetuju/tanggal dan dokumennya bebas placeholder (`SDLC-002`).
> Alur tahap dan Stage Card: [Agent Guidelines §2B](../../4_AGENT_DEV_GUIDELINES.md#2b-tahap-sdlc-feature-staged-feature-sdlc).
> Feature `Active` tidak boleh berisi placeholder.

## Stage Tracker

| Tahap             | Dokumen                                                                                | Status      | Gerbang         | Disetujui oleh / tanggal  | Catatan                                  |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | --------------- | ------------------------- | ---------------------------------------- |
| 0 Problem         | [problem.md](problem.md)                                                               | Disetujui   | G0              | reyand (Owner) 2026-10-14 | Portal lokal; ratchet baseline           |
| 1 Opsi Solusi     | [solution.md](solution.md)                                                             | Disetujui   | G1              | reyand (Owner) 2026-10-14 | Opsi A; ADR baru di Phase 2              |
| 2 PRD             | [product.md](product.md)                                                               | Disetujui   | G2              | reyand (Owner) 2026-10-14 | Format Layer + lokasi UX matrix          |
| 3 Breakdown       | [breakdown.md](breakdown.md)                                                           | Disetujui   | G3              | reyand (Owner) 2026-10-14 | Jalur: Penuh; 3 phase                    |
| (shared)          | [contracts.md](contracts.md) · [authorization.md](authorization.md) · [roles/](roles/) | Disetujui   | bagian G2       | reyand (Owner) 2026-10-14 | bagian G2                                |
| 4 Build           | [phases/](phases/)                                                                     | Draft       | dalam window G3 | —                         | P1 #43, P2 #44 merge; P3 kandidat teruji |
| 5 Test & Review   | [testing.md](testing.md)                                                               | Draft       | G5              | —                         | Verifier: —                              |
| 6 Release & Close | [release.md](release.md)                                                               | Belum mulai | G6              | —                         |                                          |

Status tahap: `Belum mulai`, `Draft`, `Menunggu persetujuan`, `Disetujui`, `Blocked`, `Selesai`.
(Ini terpisah dari **Status** kartu di atas, yang tetap `Draft` / `Active` / `Superseded` / `Archived`.)

## 1. Tujuan dan Pengguna

Satu portal lokal (`npm run docs:portal`) yang menampilkan stack, fitur dan kontrak API, ERD,
governance, TODO aktif, dan UI/UX matrix dari repo, ditambah completeness check yang mencegah gap
dokumen baru. Detail: [problem.md](problem.md) dan [solution.md](solution.md).

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
