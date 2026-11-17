# LEADER-PIPELINE-HUB — Tahap 4: Build Phase 01 — Mesin kesehatan + tahap pipeline

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1.1–AC-1.3
**Applicable Policy IDs:** AI-009, AI-013, AI-014

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P1-BE-1, P1-QA-1                                                                                                                                                                                                                                                                                                                   |
| Branch / baseline commit         | `feat/leader-pipeline-p1` dari `origin/main` @ `9941c5f2`                                                                                                                                                                                                                                                                          |
| File/path yang diizinkan         | `packages/contracts/src/leaderPipeline.ts` (file baru; `leader.ts` milik pekerjaan Codex tidak disentuh), `apps/api/src/modules/leader/leaderPipeline*.ts` dan test-nya (file baru; `leaderService/Controller/Routes` tidak disentuh), `apps/api/src/app.ts` (mount route), Workflow + Policy Registry (FLOW-011), dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch ke folder Owner → Owner push branch → PR → merge oleh Owner                                                                                                                                                                                                                                           |
| Pemeriksaan yang akan dijalankan | build, integration PostgreSQL, `npm run validate`                                                                                                                                                                                                                                                                                  |
| Risiko & recovery                | revert PR; endpoint baca saja, tanpa migrasi                                                                                                                                                                                                                                                                                       |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                                                                                         |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)" setelah merge PR #132                                                                                                                                                                                                                                          |

## 2. Log perubahan

| Task    | File berubah                                                                                                        | Ringkasan                                                                                                                                                                                                                                                                                                                                                                                                   | Commit       |
| ------- | ------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P1-BE-1 | `leaderPipeline.ts` (contracts), `leaderPipelineRules.ts`, `leaderPipeline.ts`, `leaderPipelineRoutes.ts`, `app.ts` | `GET /v1/leader/pipeline[?workspaceIds=a,b]`: Feature aktif (plus yang dirilis ≤14 hari) di Workspace yang dipimpin; tahap saat ini + umur; status sel per tahap (done/active/held/pending/untracked); kesehatan + alasan (task/hambatan/bug); hambatan terbuka dengan umur dan PIC; statistik ringkasan. Batch query per jenis data, tanpa N+1; memakai kalender Workspace untuk "hari ini" dan hari kerja | PR phase ini |
| P1-QA-1 | `leaderPipelineRules.test.ts`, `leaderPipelineApiIntegration.test.ts`                                               | 11 unit (setiap tahap dan setiap kondisi kesehatan), 3 integration (tahap/kesehatan/statistik, filter, 403/400)                                                                                                                                                                                                                                                                                             | PR phase ini |
| SSoT    | Workflow, Policy Registry                                                                                           | FLOW-011                                                                                                                                                                                                                                                                                                                                                                                                    | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                             | Environment         | Exit code | Pass / fail / skip                                  | AC             |
| ---------------------------------------------------- | ------------------- | --------- | --------------------------------------------------- | -------------- |
| `node --test …/leaderPipelineRules.test.js`          | lokal               | 0         | 11/11                                               | AC-1.1, AC-1.2 |
| `node --test …/leaderPipelineApiIntegration.test.js` | PostgreSQL 16 lokal | 0         | 3/3                                                 | AC-1.1–AC-1.3  |
| Suite API penuh                                      | PostgreSQL 16 lokal | 0         | 717/717 (di luar file `dist` basi dari branch lain) | regresi        |
| `npm run validate`                                   | lokal               | 0         | pass                                                | —              |

## 4. Deviasi dari rencana

| Deviasi                                                                                                                                                                                              | Alasan                                                                                           | Masih dalam scope? | Persetujuan baru? |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------ | ----------------- |
| Endpoint `/v1/leader/pipeline`, bukan `/v1/leader/summary`; kontrak di file baru `leaderPipeline.ts`                                                                                                 | Menghindari bentrok dengan pekerjaan Codex yang belum di-commit di `leader.ts`/`leaderRoutes.ts` | Ya                 | Tidak             |
| Kondisi "assignee melebihi kapasitas" belum dihitung                                                                                                                                                 | Butuh kapasitas (WORK-FOUNDATION P4); ditambahkan di P3                                          | Ya                 | Tidak             |
| Umur tahap Plan/PRD/Task dihitung dari perubahan Spec terakhir; Dev dari Subtask terbuka paling awal; Review dari perubahan terakhir Subtask in_review; QA dari Subtask Development terakhir selesai | Belum ada riwayat transisi tahap; perkiraan dicatat di contracts.md                              | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 2 (Policy Registry, Workflow); tanpa migrasi.
- Lanjut ke [testing.md](../testing.md).
