# QA-DESK-SIMPLIFY — Tahap 4: Build Phase 01 — Adopsi B0+B1

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1, AC-1.2, AC-1.3, AC-2.1, AC-2.2, AC-2.3, AC-3.1, AC-3.2, AC-4.1, AC-4.2, AC-5.1, AC-5.2, AC-5.3, AC-6.1
**Applicable Policy IDs:** AI-009, AI-013, AI-014, FLOW-005, QA-001

## 1. Approval Window

| Item              | Isi                                                                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Task ID           | QA-DESK-SIMPLIFY / P1                                                                                                   |
| Branch / baseline | `feat/qa-desk-simplify` dari `main` @ `221fa0a` (PR #37)                                                                |
| File/path         | Kode B0/B1 dari branch AGY, migrasi 087/088, test terkait, ADR-032, docs/1, docs/2, POLICY_REGISTRY, folder Feature ini |
| Urutan aksi       | rebase → edit → test → commit → patch → Owner publish → PR                                                              |
| Disetujui         | reyand (Owner), 2026-10-13, G3 "setuju"                                                                                 |

## 2. Log perubahan

| Task    | File                                                               | Ringkasan                                                            |
| ------- | ------------------------------------------------------------------ | -------------------------------------------------------------------- |
| P1-BE-1 | 5 commit AGY (`780c57b` … `bede9f8`)                               | B0 baseline otomatis; B1 auto-active, hapus 0 run, edit, gate retest |
| P1-BE-2 | Migrasi 087 + `featureReadinessBackfillMigration.test.ts`          | Backfill hanya atas nama penyetuju Brief tercatat (D6)               |
| P1-DOC  | ADR-032, docs/1, docs/2 §2/§5, FLOW-005, QA-001, Feature Card SDLC | Aturan diselaraskan dengan kode                                      |

## 3. Pemeriksaan

Lihat [testing.md](../testing.md).

## 4. Deviasi dari rencana

| Deviasi                                     | Alasan                                                            | Masih dalam scope? |
| ------------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| Kode dibangun AGY sebelum tahap 0–3 dicatat | Adopsi branch yang sudah ada; seluruh kode diuji ulang di Tahap 5 | Ya                 |
| Perbaikan D6 disiapkan sebelum G3 disetujui | Owner menyetujui G3 setelah melihat perbaikannya                  | Ya                 |

## 5. Hasil

- PR: https://github.com/oneilreyand/qlickhub/pull/37 — Tier 2 (authorization `testManagementPolicy`, migrasi).
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
