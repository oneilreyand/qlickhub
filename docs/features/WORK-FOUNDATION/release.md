# WORK-FOUNDATION — Tahap 6: Release & Close

**Status:** Belum mulai
**Gerbang:** G6 — keputusan rilis oleh PO; label `owner-approved` oleh Owner untuk Tier 2
**Applicable Policy IDs:** AI-013, AI-020, RELEASE-001, RELEASE-002, DOC-003

## 1. Merge dan deploy

Merge ke `main` otomatis men-deploy Production (Vercel). Setiap phase dicatat di sini: PR, tier,
file Tier 2 (migrasi, ADR, middleware), merge commit, dan nama bundle setelah deploy.

| Phase | Branch / PR               | Tier                          | Migrasi Production                                                                                                                                                                                    | Catatan                            |
| ----- | ------------------------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| P1    | `feat/work-foundation-p1` | 2 (ADR)                       | —                                                                                                                                                                                                     | read-only audit                    |
| P2    | `feat/work-foundation-p2` | 2 (migrasi, registry)         | `20261117000098-add-workspace-work-calendar` dijalankan Owner 2026-11-17 dengan `npm run db:migrate:prod` (0,918 s; sebelumnya Production di `20261109000097`, dicek read-only lewat `SequelizeMeta`) | sebelum merge, sesuai gate ADR-039 |
| P3    | `feat/work-foundation-p3` | 2 (migrasi, policy, registry) | `20261117000099-add-task-effort` dijalankan Owner 2026-11-17 (0,765 s; sebelumnya Production di `20261117000098`)                                                                                     | sebelum merge                      |
| P5    | `feat/work-foundation-p5` | 2 (migrasi, registry)         | `20261117000100-create-task-blockers` dijalankan Owner sebelum merge; `/v1/health` Production 2026-11-17 09:00 UTC: `latest = 20261117000100-create-task-blockers.cjs`, `applied = 84`                | notifikasi baru ke PIC             |

P1, P2, P3 dan P5 masuk `main` bersama lewat PR #134 (`9941c5f2`, branch bertumpuk).

## 2. Verifikasi di environment target

Smoke Production read-only per phase setelah deploy; mutasi hanya pada data uji yang disetujui Owner.

## 3. QA sign-off dan keputusan rilis

Diisi saat phase terakhir siap rilis.

## 4. Metrik sukses (dari problem.md)

Diukur ulang 4 minggu setelah rilis phase terakhir di Workspace pilot.

## 5. Checklist penutupan

- [ ] Report di `docs/reports/` memakai `AGENT_REPORT_TEMPLATE.md`
- [ ] Stage Tracker di [README.md](README.md) diperbarui
- [ ] `docs/features/FEATURE_CATALOG.md` diperbarui
- [ ] SSoT/ADR terdampak sesuai implementasi
- [ ] `TODO.md` → Done dan dipindah ke arsip
