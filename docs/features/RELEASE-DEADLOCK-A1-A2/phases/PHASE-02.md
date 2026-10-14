# RELEASE-DEADLOCK-A1-A2 — Tahap 4: Build Phase 02 — Gate bug semua severity

**Status:** Selesai
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-3.1, AC-3.2, AC-3.3
**Applicable Policy IDs:** AI-009, AI-013, AI-014, RELEASE-001, RELEASE-004

## 1. Approval Window

| Item              | Isi                                                                                                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID           | RELEASE-DEADLOCK-A1-A2 / P2                                                                                                                                                                                                                               |
| Branch / baseline | `feat/release-deadlock-a2` dari `main` @ `9d42595`                                                                                                                                                                                                        |
| File/path         | `packages/contracts/src/releaseDecision.ts` + test, `readinessGateEvaluator.ts` + test, `releaseRejectionApiIntegration.test.ts`, `indonesianCopy.ts` + test, `ReleaseAssurancePanel.tsx`, Workflow §7, POLICY_REGISTRY (RELEASE-001), folder Feature ini |
| Urutan aksi       | edit → test → commit → patch → Owner publish → PR (Tier 2)                                                                                                                                                                                                |
| Disetujui         | reyand (Owner), 2026-10-14, chat "ok lanjutkan" atas Stage Card Phase 2                                                                                                                                                                                   |

## 2. Log perubahan

| Task     | File                                                                     | Ringkasan                                                                              |
| -------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| P2-BE-1  | `packages/contracts/src/releaseDecision.ts`                              | Enum gate ditambah `unverified_bugs`; `critical_high_bugs` tetap untuk snapshot lama   |
| P2-BE-1  | `apps/api/src/modules/releaseDecisions/readinessGateEvaluator.ts`        | Gate bug = `total − verified` (semua severity), alasan "N unverified bugs remain."     |
| P2-FE-1  | `apps/web/src/lib/i18n/indonesianCopy.ts`, `ReleaseAssurancePanel.tsx`   | Label "Bug belum terverifikasi", terjemahan alasan, ringkasan "Bug belum diverifikasi" |
| P2-DOC-1 | `docs/2_WORKFLOW_AND_ROLES.md` §7, `docs/POLICY_REGISTRY.md` RELEASE-001 | Aturan semua severity                                                                  |

## 3. Pemeriksaan

Lihat [testing.md](../testing.md) bagian Phase 2.

## 4. Deviasi dari rencana

| Deviasi                                                           | Alasan                                                                           | Masih dalam scope? |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------ |
| Tidak ada field kontrak baru untuk jumlah bug belum terverifikasi | Snapshot sudah memuat `total` dan `verified`; selisihnya cukup dan deterministik | Ya                 |
| Ringkasan panel kini menampilkan semua bug belum diverifikasi     | Konsisten dengan gate baru; berlaku juga untuk snapshot lama                     | Ya                 |

## 5. Hasil

- PR: #41 (`9d99e71`) — Tier 2 (`docs/POLICY_REGISTRY.md`, `docs/2_WORKFLOW_AND_ROLES.md`).
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
