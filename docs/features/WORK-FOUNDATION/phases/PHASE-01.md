# WORK-FOUNDATION — Tahap 4: Build Phase 01 — Audit histori status

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1
**Applicable Policy IDs:** AI-009, AI-013, AI-014

## 1. Approval Window

| Item                             | Isi                                                                                                  |
| -------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Task ID                          | P1-BE-1, P1-QA-1                                                                                     |
| Branch / baseline commit         | dibuat dari `origin/main` saat G3 disetujui                                                          |
| File/path yang diizinkan         | `apps/api/src/scripts/auditStatusHistory.ts`, test-nya, `package.json` (script), dokumen Feature ini |
| Urutan aksi yang diizinkan       | edit → test → commit → patch ke folder Owner → Owner push branch → PR → merge oleh Owner             |
| Pemeriksaan yang akan dijalankan | build API, integration test PostgreSQL, `npm run validate`                                           |
| Risiko & recovery                | revert PR; migrasi aditif punya `down`                                                               |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                           |
| Disetujui                        | menunggu G3                                                                                          |

## 2. Log perubahan

| Task    | File berubah                                                                                                                    | Ringkasan                                                                                                                         | Commit       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P1-BE-1 | `apps/api/src/modules/tasks/internal/statusHistoryAudit.ts`, `apps/api/scripts/auditStatusHistory.cjs`, `apps/api/package.json` | Audit SELECT-only dalam transaksi `READ ONLY`; `npm run audit:status-history [-- --workspace <uuid>]` mencetak JSON per Workspace | PR phase ini |
| P1-QA-1 | `apps/api/src/modules/tasks/__tests__/statusHistoryAuditIntegration.test.ts`                                                    | Seed: lengkap, `done` tanpa event/`completedAt`, aktif tanpa event, todo, soft-deleted, Workspace lain                            | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                                         | Environment                 | Exit code          | Pass / fail / skip                            | AC     |
| -------------------------------------------------------------------------------- | --------------------------- | ------------------ | --------------------------------------------- | ------ |
| `node --test dist/modules/tasks/__tests__/statusHistoryAuditIntegration.test.js` | PostgreSQL 16 lokal (cloud) | 0                  | 2/2 pass                                      | AC-1.1 |
| `node scripts/auditStatusHistory.cjs` terhadap database test                     | PostgreSQL 16 lokal         | 0                  | JSON 60 Workspace; jumlah baris tidak berubah | AC-1.1 |
| suite API penuh, `npm run validate`                                              | lokal                       | lihat bagian Hasil | —                                             | —      |

## 4. Deviasi dari rencana

| Deviasi                                                                                             | Alasan                                                                                | Masih dalam scope? | Persetujuan baru? |
| --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Lokasi `apps/api/scripts/*.cjs` + modul di `modules/tasks/internal/`, bukan `apps/api/src/scripts/` | Mengikuti pola skrip `db:*` yang sudah ada; logika bisa diuji dengan integration test | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 2 (ADR berubah status) — lanjut ke [testing.md](../testing.md).
- Menjalankan audit ke database Production adalah stop condition: hanya read-only dan dengan izin Owner.
