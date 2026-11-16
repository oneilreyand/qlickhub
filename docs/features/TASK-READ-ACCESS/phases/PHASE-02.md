# TASK-READ-ACCESS — Tahap 4: Build Phase 02 — Route requirement, trace, rilis, readiness, handoff

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-6
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AI-020, AUTH-013, TEST-001

## 1. Approval Window

- Baseline: `main` @ `cb8d23be`; branch `fix/task-read-access-phase-2`.
- Persetujuan: Owner (Reyand), 2026-11-12 (cakupan bertahap) dan 2026-11-13 chat "ok lanjutkan"
  atas usulan mengerjakan Phase 2.
- Path: file route modul `requirements`, `traceability`, `releaseDecisions`, `featureReadiness`,
  `workQueue`, `testManagement`; `testManagementService.ts`; test read-access; `docs/adr/**`,
  `docs/1_ARCHITECTURE.md`, folder Feature ini, `TODO.md`, `FEATURE_CATALOG.md`.
- Urutan: edit → test PostgreSQL → commit → PR Tier 2 → label `owner-approved` → merge.
- Berlaku sampai PR Phase 2 merge, paling lama 2026-11-20. Tanpa migrasi, tanpa mutasi Production.

## 2. Log perubahan

- `requireTaskReadAccess()` pada GET `tasks/:taskId/requirements`, `delivery-trace`,
  `test-executions`, `qa-workflow-summary`.
- `requireTaskReadAccess('featureTaskId')` pada GET `features/:featureTaskId/release-records`,
  `readiness`, `readiness/findings`, `handoffs`.
- `getTaskTestExecutions` memakai `assertTaskAccessForActor` (perilaku sama, satu definisi).
- GET `tasks/:taskId/comments` kini memakai `requireTaskReadAccess()` atas keputusan Owner
  2026-11-16 (pengecualian diskusi dicabut).
- `developer-readiness` tidak diubah: handler sudah memuat task lewat `taskService.getTask` dengan
  role aktor; dibuktikan test.

## 3. Pemeriksaan yang dijalankan

Lihat [../testing.md](../testing.md).

## 4. Deviasi dari rencana

Ditambah `qa-workflow-summary` dan temuan readiness, yang tidak disebut eksplisit pada breakdown
awal tetapi termasuk baca task-scoped. Mutasi (mis. membuat temuan readiness, review readiness)
tetap di luar scope.

## 5. Hasil

Kandidat lokal teruji; menunggu PR Tier 2 dan label Owner. Belum dirilis.
