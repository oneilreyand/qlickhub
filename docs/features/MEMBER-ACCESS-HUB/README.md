# MEMBER-ACCESS-HUB — Feature Overview

**Status:** Draft
**Owner:** Owner Qlick Hub
**Last reviewed:** 2026-11-17
**Applicable Policy IDs:** AUTH-001, AUTH-002, AUTH-014, DATA-001, DATA-002, CONTRACT-001, UI-001, UI-002, TEST-001, SDLC-001

Halaman Anggota & Akses lintas Workspace untuk Owner/Admin, status undangan, template role, undangan CSV, akses berbatas waktu, dan penataan ulang Pengaturan Workspace menjadi tab.

## Stage Tracker

| Tahap             | Dokumen                                                                                | Status      | Gerbang         | Disetujui oleh / tanggal       | Catatan                              |
| ----------------- | -------------------------------------------------------------------------------------- | ----------- | --------------- | ------------------------------ | ------------------------------------ |
| 0 Problem         | [problem.md](problem.md)                                                               | Disetujui   | G0              | Owner melalui chat, 2026-11-17 | Program WORK-VISIBILITY              |
| 1 Opsi Solusi     | [solution.md](solution.md)                                                             | Disetujui   | G1              | Owner melalui chat, 2026-11-17 | ADR: [ADR 046](../../adr/README.md)  |
| 2 PRD             | [product.md](product.md)                                                               | Disetujui   | G2              | Owner melalui chat, 2026-11-17 |                                      |
| 3 Breakdown       | [breakdown.md](breakdown.md)                                                           | Disetujui   | G3              | Owner melalui chat, 2026-11-17 | Jalur: Penuh                         |
| (shared)          | [contracts.md](contracts.md) · [authorization.md](authorization.md) · [roles/](roles/) | Disetujui   | bagian G2       | Owner melalui chat, 2026-11-17 |                                      |
| 4 Build           | [phases/](phases/)                                                                     | Draft       | dalam window G3 | —                              | P1–P4, P6 di main; P5 kandidat lokal |
| 5 Test & Review   | [testing.md](testing.md)                                                               | Belum mulai | G5              | —                              | Verifier: CI + review independen     |
| 6 Release & Close | [release.md](release.md)                                                               | Belum mulai | G6              | —                              |                                      |

Status tahap: `Belum mulai`, `Draft`, `Menunggu persetujuan`, `Disetujui`, `Blocked`, `Selesai`.

## 1. Tujuan dan Pengguna

Owner/Admin perlu melihat dan mengatur siapa punya akses ke Workspace mana dari satu tempat. Detail: [problem.md](problem.md) dan [solution.md](solution.md); program: [WORK_VISIBILITY_PROGRAM_PLAN](../../plans/WORK_VISIBILITY_PROGRAM_PLAN.md).

## 2. Requirement dan Acceptance Criteria

Requirement dan AC ber-ID ada di [product.md](product.md).

## 3. Alur Lintas Peran

```mermaid
flowchart LR
  OA[Owner/Admin] --> HUB[Anggota & Akses]
  HUB -->|undang / ubah role / batas waktu| WS[(Keanggotaan per Workspace)]
  HUB -->|kirim ulang / batalkan| INV[Undangan]
  WS -->|expires_at lewat| OFF[Akses berhenti otomatis]
```

| Pembaca       | Baca berikutnya                              | Output / handoff                       |
| ------------- | -------------------------------------------- | -------------------------------------- |
| Owner / Admin | [roles/owner-admin.md](roles/owner-admin.md) | Matriks akses, undangan, batas waktu   |
| PO            | [roles/po.md](roles/po.md)                   | Tidak memperoleh aksi baru             |
| Developer     | [roles/developer.md](roles/developer.md)     | Menerima undangan; akses bisa berakhir |
| QA            | [roles/qa.md](roles/qa.md)                   | Bukti authz lintas Workspace           |

## 4. Data dan Relasi

Lihat [contracts.md](contracts.md).

## 5. API dan Shared Contract

Lihat [contracts.md](contracts.md); bentuk field mengikuti `packages/contracts`, tidak disalin di sini.

## 6. Authorization

Lihat [authorization.md](authorization.md).

## 7. UI dan Interaction States

Layar baru: Anggota & Akses (`03-anggota-akses.webp`) dan modal Undang (`04-undang-anggota.webp`); Pengaturan Workspace menjadi tab. Desain: [work-visibility/design](../../plans/work-visibility/design/README.md). User flow dan state per layar di [product.md](product.md) §3–§4.

## 8. Pengujian dan Evidence

Lihat [testing.md](testing.md); pembagian phase di [breakdown.md](breakdown.md).

## 9. Release dan Readiness

Lihat [release.md](release.md).

## 10. Traceability

`Problem → Solution/ADR → Requirement → AC → Phase → Task BE/FE/QA → contract/code → Test Result → Bug/retest → report → release decision`
