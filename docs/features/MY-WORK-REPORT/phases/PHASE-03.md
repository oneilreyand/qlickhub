# MY-WORK-REPORT — Tahap 4: Build Phase 03 — Kewajaran waktu

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-3.1, AC-3.2
**Applicable Policy IDs:** AI-009, AI-013, AI-014, FLOW-013, DATA-005

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P3-BE-1, P3-FE-1, P3-QA-1                                                                                                                                                                                                                                                          |
| Branch / baseline commit         | `feat/my-work-fairness` di atas `feat/leader-team-load` (LEADER-PIPELINE-HUB P3)                                                                                                                                                                                                   |
| File/path yang diizinkan         | `packages/contracts/src/myWorkReport.ts`; `apps/api/src/modules/myWork/**`; Web `features/myWork/*`, `myWorkReportService.ts`, `lib/hooks/useEffortBaseline.ts`, `EffortPicker.tsx`, `CreateSubtaskModal.tsx` dan test-nya; Workflow + Policy Registry (FLOW-013); dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner push → PR → `owner-approved` → merge                                                                                                                                                                                                          |
| Pemeriksaan yang akan dijalankan | build, integration PostgreSQL, Vitest, `npm run validate`                                                                                                                                                                                                                          |
| Risiko & recovery                | revert PR; baca saja, tanpa migrasi                                                                                                                                                                                                                                                |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                                         |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)"; lanjut P3 "ok jalankan" 2026-11-18                                                                                                                                                                            |

## 2. Log perubahan

| Task    | File berubah                                                                                                            | Ringkasan                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | Commit       |
| ------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P3-BE-1 | `myWorkReport.ts` (contracts), `modules/myWork/fairness.ts`, `workReport.ts`, `myWorkRoutes.ts`                         | Baseline per Workspace per effort: Subtask selesai 90 hari terakhir yang punya effort dan tercatat pindah ke "in progress" (tanpa rekonstruksi, DATA-005); hari kerja nyata = mulai dikerjakan → selesai pada kalender Workspace (minimal 1); median, minimal 5 sampel. Tiap item Laporan Saya membawa `timeFairness` (rencana ÷ median: <0,7 Terlalu ketat, >1,5 Longgar, selain itu Wajar; Data belum cukup; Tanpa effort/jadwal). `GET /v1/workspaces/:workspaceId/effort-baseline` untuk anggota aktif, hanya angka gabungan | PR phase ini |
| P3-FE-1 | `mapMyWorkReport.ts`, `useEffortBaseline.ts`, `EffortPicker.tsx` (prop `hint`), `CreateSubtaskModal.tsx`                | Kolom Kewajaran waktu terisi ("Terlalu ketat (0,4×)" dst.); saran di form "+ Subtask": "Di workspace ini, Subtask M biasanya selesai dalam ±3 hari kerja (median 12 Subtask, 90 hari terakhir)"                                                                                                                                                                                                                                                                                                                                  | PR phase ini |
| P3-QA-1 | `fairnessApiIntegration.test.ts`, `mapMyWorkReport.test.ts`, `CreateSubtaskModal.test.tsx`, `MyWorkReportPage.test.tsx` | Sampel dari dua orang, satu sampel tanpa riwayat dikeluarkan; label tiap level; baseline tanpa id/nama; non-anggota 403                                                                                                                                                                                                                                                                                                                                                                                                          | PR phase ini |
| SSoT    | Workflow, Policy Registry                                                                                               | FLOW-013 diperluas                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                   | Environment         | Exit code | Pass / fail / skip       | AC                            |
| ------------------------------------------ | ------------------- | --------- | ------------------------ | ----------------------------- |
| `node --test …/myWork/__tests__/*.test.js` | PostgreSQL 16 lokal | 0         | 13/13                    | AC-3.1, AC-3.2, regresi P1/P2 |
| Suite API penuh + Vitest penuh             | PostgreSQL 16 lokal | 0         | API 742/742, Web 908/908 | regresi                       |
| `npm run validate`                         | lokal               | 0         | pass                     | —                             |

## 4. Deviasi dari rencana

| Deviasi                                                                                           | Alasan                                                                                     | Masih dalam scope? | Persetujuan baru? |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------ | ----------------- |
| Ambang 0,7× / 1,5× dan jendela 90 hari tetap di kode (contracts), belum bisa diubah per Workspace | ADR-044: diubah setelah pilot                                                              | Ya                 | Tidak             |
| Saran di form hanya menampilkan median, belum menilai jadwal yang sedang diisi                    | Hitung hari kerja di klien butuh kalender Workspace; penilaian lengkap ada di Laporan Saya | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 2 (Workflow, Policy Registry); tanpa migrasi.
- Lanjut ke [testing.md](../testing.md).
