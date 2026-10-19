# RELEASE-DEADLOCK-A1-A2 — Tahap 6: Release & Close

**Status:** Released
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, RELEASE-004, DOC-003

## 1. Merge dan deploy

| Phase | PR  | Tier | File Tier 2                                | Merge commit | Memicu deploy Production? | Deployment ID / waktu     |
| ----- | --- | ---- | ------------------------------------------ | ------------ | ------------------------- | ------------------------- |
| P1    | #36 | 2    | ADR-031, POLICY_REGISTRY, Workflow §7      | `221fa0a`    | ya (Vercel auto-deploy)   | Tidak dicatat; 2026-10-13 |
| P2    | #41 | 2    | POLICY_REGISTRY (RELEASE-001), Workflow §7 | `9d99e71`    | ya (Vercel auto-deploy)   | Tidak dicatat; 2026-10-14 |

Tidak ada migrasi database di kedua phase.

## 2. Verifikasi di environment target

| AC             | Environment | Observasi / perintah                                                                                                  | Level | Hasil           |
| -------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- | ----- | --------------- |
| AC-1.1–2.2     | CI / lokal  | `releaseRejectionApiIntegration.test.ts` pada PostgreSQL                                                              | E3    | Pass            |
| AC-3.1–3.3     | CI / lokal  | evaluator, contract, i18n, dan integration test (lihat testing.md Phase 2)                                            | E3    | Pass            |
| AC-1.1, AC-3.1 | Lokal       | Gate gagal → hanya Tolak; tanpa alasan ditolak; dengan alasan 201; gate "Bug belum terverifikasi" tampil (2026-10-19) | E3    | Pass            |
| AC-1.1, AC-3.1 | Production  | QA menolak sign-off saat gate gagal; gate menampilkan "Bug belum terverifikasi"                                       | E4    | Belum dilakukan |

## 3. QA sign-off dan keputusan rilis

| Item               | Isi                                                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| QA sign-off        | N/A — perubahan aturan rilis; bukti test di [testing.md](testing.md)                                                               |
| Keputusan rilis PO | approved — Owner merge PR #36 (2026-10-13) dan #41 (2026-10-14)                                                                    |
| Gap yang diterima  | Uji lokal E3 lulus ([report smoke test lokal](../../reports/LOCAL_SMOKE_TEST_2026-10-19.md)); uji Production (E4) dan AC-2.x belum |
| Rollback plan      | Revert PR; tidak ada perubahan schema, snapshot tersimpan tetap valid                                                              |

## 4. Metrik sukses (dari problem.md)

| Metrik                                          | Baseline            | Target                     | Hasil setelah rilis       | Kapan diukur ulang |
| ----------------------------------------------- | ------------------- | -------------------------- | ------------------------- | ------------------ |
| Sign-off `rejected` dengan gate bukti gagal     | Ditolak (409)       | Tersimpan (201)            | 201 di test integrasi     | Uji Production     |
| Release Decision `rejected` atas sign-off tolak | Tidak mungkin       | Tersimpan (201)            | 201 di test integrasi     | Uji Production     |
| Gate PO menghitung bug semua severity           | Hanya Critical/High | Semua bug belum `verified` | `unverified_bugs` di test | Uji Production     |

## 5. Checklist penutupan

- [x] Stage Tracker di [README.md](README.md) diperbarui
- [x] SSoT/ADR terdampak sudah sesuai implementasi (ADR-031, RELEASE-001, RELEASE-004, Workflow §7)
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui (follow-up)
- [ ] Uji Production E4 (follow-up, bersama smoke test QA-DESK-SIMPLIFY)
- [x] Follow-up dicatat: putuskan nasib field `criticalOrHighUnverified` di snapshot
