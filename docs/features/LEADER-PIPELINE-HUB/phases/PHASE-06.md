# LEADER-PIPELINE-HUB — Tahap 4: Build Phase 06 — Metrik alur + timeframe kualitas

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-6.1
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AUTH-001, DATA-005

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                           |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P6-BE-1, P6-FE-1, P6-QA-1                                                                                                                                                                                                                                                                                     |
| Branch / baseline commit         | `feat/leader-p6` dari `feat/leader-p5` (di atas `origin/main` @ `3d9ded04`)                                                                                                                                                                                                                                   |
| File/path yang diizinkan         | contracts `leader.ts`, `leaderPipeline.ts`; API `modules/leader/` (`flowMetrics.ts`, `leaderPipelineRoutes.ts`, `leaderService.ts`, test); Web `features/leader/LeaderQualityTab.tsx`, `organisms/leaderHub/FlowMetricsPanel.tsx`, `leaderService.ts`, `LeaderHubPage.tsx` (label tab), test; dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner push → PR (setelah P5 merge) → merge                                                                                                                                                                                                                                     |
| Pemeriksaan yang akan dijalankan | integration PostgreSQL, suite API penuh, Vitest penuh, `npm run validate`, tangkapan layar                                                                                                                                                                                                                    |
| Risiko & recovery                | hanya baca; tanpa migrasi. Angka kualitas kini default 30 hari (sebelumnya semua waktu) — diberi label periode. Revert PR                                                                                                                                                                                     |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                                                                    |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)"; lanjut 2026-11-19 ("ok jalankan satu raund semua bisa")                                                                                                                                                                                  |

## 2. Log perubahan

| Task    | File berubah                                                                                                           | Ringkasan                                                                                                                                                                                                                              | Commit       |
| ------- | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P6-BE-1 | `flowMetrics.ts`, `leaderPipelineRoutes.ts`, `leaderPipeline.ts` (contracts)                                           | `GET /v1/leader/flow`: throughput (+ per minggu), lead time, cycle time, median hari per status, % tepat waktu untuk Subtask yang selesai di periode, hanya Workspace yang dipimpin. Subtask tanpa histori status tidak diperkirakan   | PR phase ini |
| P6-BE-2 | `leaderService.ts`, `leader.ts` (contracts)                                                                            | Kualitas memakai `timeframe` (bug yang dilaporkan di periode; default 30 hari) dan mengembalikan periodenya; `workspaceIds` dipisah koma kini diterima (sebelumnya beberapa Workspace sekaligus ditolak 400); digest memakai 7/30 hari | PR phase ini |
| P6-FE-1 | `FlowMetricsPanel.tsx`, `LeaderQualityTab.tsx`, `leaderService.ts`, `LeaderHubPage.tsx`                                | Tab "Alur & Kualitas": pilihan periode (7/30/90 hari, semua) untuk metrik alur dan kualitas; kartu throughput, lead time, cycle time, tepat waktu; batang waktu per tahap dan selesai per minggu                                       | PR phase ini |
| P6-QA-1 | `leaderFlowApiIntegration.test.ts`, `leaderFlowMetrics.test.ts`, `LeaderQualityTab.test.tsx`, `LeaderHubPage.test.tsx` | 3 integration, 3 unit, 2 component                                                                                                                                                                                                     | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                                               | Environment         | Exit code | Pass / fail / skip                                   | AC             |
| -------------------------------------------------------------------------------------- | ------------------- | --------- | ---------------------------------------------------- | -------------- |
| `node --test …/leaderFlow*.test.js …/leaderApiIntegration.test.js`                     | PostgreSQL 16 lokal | 0         | lulus                                                | AC-6.1         |
| Suite API penuh (memuat P5)                                                            | PostgreSQL 16 lokal | 0         | 762/762 (berkas dist sisa build MAH P5 dikecualikan) | regresi        |
| Vitest penuh (memuat P5)                                                               | lokal               | 0         | 934/934 (156 file)                                   | regresi        |
| `npm run validate`                                                                     | lokal               | 0         | pass (0 error)                                       | —              |
| Tangkapan layar panel alur (desktop, ponsel 390 px, gelap) dan indikator "Langsung" P5 | Vite + Playwright   | 0         | tanpa error, tanpa scroll horizontal                 | AC-5.1, AC-6.1 |

## 4. Deviasi dari rencana

| Deviasi                                                                        | Alasan                                                                                  | Masih dalam scope? | Persetujuan baru? |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Endpoint baru `/v1/leader/flow` di modul pipeline, bukan di `leaderService.ts` | Menjaga `leaderService.ts` (kode lama) tetap kecil; kualitas tetap di sana              | Ya                 | Tidak             |
| Metrik dihitung atas Subtask, bukan Feature                                    | Feature belum punya `completed_at` yang konsisten; Subtask punya histori status (WF P1) | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 1 (tanpa migrasi, tanpa SSoT Tier 2). Merge setelah P5.
- Lanjut ke [testing.md](../testing.md).
