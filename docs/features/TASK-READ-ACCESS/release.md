# TASK-READ-ACCESS — Tahap 6: Release & Close

**Status:** Belum mulai
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003, AUTH-013

## 1. Merge dan deploy

| Phase | PR           | Tier | File Tier 2                                                                                           | Memicu deploy Production? |
| ----- | ------------ | ---- | ----------------------------------------------------------------------------------------------------- | ------------------------- |
| 1     | belum dibuat | 2    | `docs/adr/**`, `docs/1_ARCHITECTURE.md`, `docs/POLICY_REGISTRY.md`, `apps/api/src/http/middleware/**` | ya                        |

Tanpa migrasi. Rollback: revert PR.

## 2. Verifikasi di environment target

| AC   | Environment | Observasi                                                                          | Hasil |
| ---- | ----------- | ---------------------------------------------------------------------------------- | ----- |
| AC-1 | Production  | Akun QA tanpa penugasan: GET links, product-brief, activity pada Feature uji → 403 | belum |
| AC-2 | Production  | Akun QA pemegang Subtask QA pada Feature uji → 200                                 | belum |

## 3. QA sign-off dan keputusan rilis

Belum ada.

## 4. Metrik sukses (dari problem.md)

Diukur setelah Phase 2: seluruh route task-scoped menolak Developer/QA tanpa akses task.

## 5. Checklist penutupan

- [ ] Phase 1 dan Phase 2 merge dan terverifikasi di Production
- [ ] Stage Tracker, `FEATURE_CATALOG.md` dan `TODO.md` diperbarui
