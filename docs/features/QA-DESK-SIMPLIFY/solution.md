# QA-DESK-SIMPLIFY — Tahap 1: Opsi Solusi (Decision Snapshot)

**Status:** Menunggu persetujuan
**Gerbang:** G1 — disetujui oleh Owner
**Problem:** [problem.md](problem.md)
**ADR:** [ADR-032](../../adr/ADR-032-AUTO-READINESS-BASELINE-AND-QA-TEST-CASE-LIFECYCLE.md) (Proposed)
**Applicable Policy IDs:** AI-006, SDLC-001, FLOW-005, QA-001

Format mengikuti Decision Snapshot di `docs/4_AGENT_DEV_GUIDELINES.md` §2A.E; dokumen ini tidak
mengubah aturan tersebut.

## 1. Kondisi sekarang

- Baseline kesiapan dibuat manual oleh Planner setelah review Dev dan QA siap (ADR-013 butir 1,
  FLOW-005; `featureReadinessService.ts` baris 171–178).
- QA membuat test case sebagai draft, lalu mengaktifkannya bila scope subtask terbukti (ADR-015,
  QA-001). Definisi hanya bisa diubah selama draft (ADR-015 butir 4). Tidak ada hapus.
- Branch AGY `feat/qa-desk-backend-b1` (5 commit, sudah di-rebase bersih ke `main` `221fa0a`) sudah
  mengimplementasikan Opsi A di bawah, tetapi tanpa ADR, tanpa pembaruan SSoT, dan tanpa folder SDLC.

## 2. Opsi

|                              | Opsi A: adopsi B0+B1 (keputusan K1, D1–D5)                                                                                                | Opsi B: hanya B1, baseline tetap manual PO (D3 versi awal)                           | Opsi 0: tidak dikerjakan   |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------- |
| Ringkasan                    | Baseline otomatis saat Brief disetujui + Requirement/AC lengkap; test case QA langsung active; hapus bila 0 run; edit in-place bila 0 run | Test case seperti A, tetapi QA melihat "Menunggu PO mengunci kesiapan" + Ingatkan PO | Biarkan seperti sekarang   |
| Pro                          | QA tidak pernah menunggu langkah administratif; kode sudah ada dan teruji                                                                 | Tidak mengubah ADR-013 butir 1                                                       | Tanpa risiko perubahan     |
| Kontra                       | Mengubah ADR-013 butir 1 dan ADR-015 butir 4; review Dev/QA menjadi informatif                                                            | Kode B0 dibuang; QA tetap bergantung pada PO                                         | Masalah tetap; branch mati |
| Lapisan terdampak (FE/BE/DB) | BE + DB (2 migrasi) + contract; FE di Feature terpisah                                                                                    | BE + DB (088) + contract                                                             | —                          |
| Data / migrasi               | 087 backfill baseline; 088 ganti fungsi trigger immutability                                                                              | 088 saja                                                                             | —                          |
| Authorization                | `testManagementPolicy`: edit active dalam scope, `assertCanDeleteTestCase`                                                                | Sama                                                                                 | —                          |
| Shared contract              | `packages/contracts/src/testManagement.ts` (+40/−?) — additive                                                                            | Sama                                                                                 | —                          |
| Estimasi WRA                 | 12/16                                                                                                                                     | 10/16                                                                                | —                          |
| Risiko & rollback            | Backfill sulit di-undo bila baseline sudah dipakai test cycle (down() melewatinya); revert kode + `down` 088                              | Revert kode + `down` 088                                                             | —                          |

## 3. Rekomendasi

**Opsi A**, dengan dua koreksi sebelum merge:

1. **Backfill 087 (D6):** hanya membuat baseline bila ada event `product_brief_approved` yang
   mencatat penyetuju; Feature tanpa event itu dilewati dan tetap tanpa baseline. Fallback ke
   `document_owner_id`/`reporter_id` dihapus karena itu identitas hasil tebakan (ADR-013 butir 6).
   Ini juga mencegah migrasi gagal total bila fallback menunjuk user yang bukan anggota workspace
   (FK `fk_feature_readiness_baselines_establisher`).
2. **Atribusi baseline otomatis (D7):** `established_by` = aktor aksi pemicu, dengan
   `autoEstablished: true` di activity. ADR-032 menyatakan baseline otomatis adalah konsekuensi
   sistem, bukan keputusan pribadi aktor tersebut.

Opsi A memenuhi semua metrik di [problem.md](problem.md) §5; Opsi B tidak memenuhi metrik baseline.

## 4. Dampak policy

- [ ] Tidak mengubah policy → tidak perlu ADR
- [x] Mengubah policy → ADR-032 dibuat **sebelum** tahap 2, lalu SSoT terdampak diperbarui (`DOC-002`):
      docs/1 "Baseline Kesiapan Feature", docs/2 §2 dan §5, FLOW-005 dan QA-001 di POLICY_REGISTRY,
      Feature Card SDLC_QUALITY_AND_RELEASE.

## 5. Keputusan

**Dipilih:** menunggu Owner (G1).
**Ditolak:** —
