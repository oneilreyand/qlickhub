# TASK-READ-ACCESS — Tahap 4: Build Phase 01 — Fondasi dan route tasks/dokumen/lampiran

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1 sampai AC-5
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AI-020, AUTH-013, TEST-001

## 1. Approval Window

- Baseline: `main` @ `1c7e6251`; branch `fix/task-read-access-phase-1`.
- Path: `apps/api/src/modules/tasks/**`, `apps/api/src/http/middleware/requireTaskReadAccess.ts`,
  `apps/api/src/modules/qaDocuments/qaDocumentRoutes.ts`,
  `apps/api/src/modules/attachments/attachmentRoutes.ts`, `docs/adr/**`, `docs/1_ARCHITECTURE.md`,
  `docs/POLICY_REGISTRY.md`, folder Feature ini, `TODO.md`.
- Urutan: edit → test PostgreSQL → commit → PR Tier 2 → label `owner-approved` oleh Owner → merge.
- Berlaku sampai PR Phase 1 merge, paling lama 2026-11-19. Tanpa migrasi, tanpa mutasi Production.

## 2. Log perubahan

- `taskAccess.ts`: `assertTaskAccessForActor`, dipakai `getTaskImpl` (perilaku sama) dan middleware.
- `requireTaskReadAccess`: dipasang pada GET links, activity, acceptance-checks (tasks), GET
  product-brief dan documents (qaDocuments), GET daftar dan unduhan lampiran.
- GET comments sengaja tidak diubah (pengecualian ADR-043).

## 3. Pemeriksaan yang dijalankan

Lihat [../testing.md](../testing.md).

## 4. Deviasi dari rencana

Diskusi dikeluarkan dari Phase 1 setelah ditemukan perilaku teruji "setiap anggota Workspace dapat
berdiskusi"; dicatat sebagai pengecualian di ADR-043 untuk keputusan Owner.

## 5. Hasil

Kandidat lokal teruji; menunggu PR Tier 2 dan label Owner. Belum dirilis.
