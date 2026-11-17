# WORK-FOUNDATION — Tahap 4: Build Phase 05 — Hambatan (blocker)

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-5.1, AC-5.2, AC-5.3, AC-5.4
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AUTH-013, FLOW-010, DATA-002

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P5-BE-1, P5-FE-1, P5-QA-1                                                                                                                                                                                                                                                                                                                                                                                                   |
| Branch / baseline commit         | `feat/work-foundation-p5` di atas `feat/work-foundation-p3`                                                                                                                                                                                                                                                                                                                                                                 |
| File/path yang diizinkan         | migrasi `20261117000100-create-task-blockers.cjs`; model `taskBlocker.ts`; contracts `blocker.ts`, `notification.ts` (tipe `blocker`); `modules/tasks` (route, `taskBlockerController.ts`, `internal/taskBlockers.ts`, test); Web `TaskBlockersPanel`, `features/tasks/TaskBlockersSection`, `taskService.ts`, `SubtaskWorkPage.tsx` dan test; `docsys.config.json`; Workflow + Policy Registry (FLOW-010); dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner jalankan migrasi Production (gate ADR-039) → push → PR → merge setelah P3                                                                                                                                                                                                                                                                                                              |
| Pemeriksaan yang akan dijalankan | migrasi, integration PostgreSQL, suite API + web, `npm run validate`, screenshot                                                                                                                                                                                                                                                                                                                                            |
| Risiko & recovery                | tabel baru tanpa mengubah tabel lain; `down` menghapus tabel; notifikasi baru hanya ke PIC yang dipilih                                                                                                                                                                                                                                                                                                                     |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                                                                                                                                                                                  |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)" setelah merge PR #132                                                                                                                                                                                                                                                                                                                                   |

## 2. Log perubahan

| Task    | File berubah                                                                                                                        | Ringkasan                                                                                                                                                                                                                                                                                                          | Commit       |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| P5-BE-1 | migrasi, `taskBlocker.ts`, `blocker.ts`, `notification.ts`, `internal/taskBlockers.ts`, `taskBlockerController.ts`, `taskRoutes.ts` | Tabel `task_blockers` (kategori CHECK, CASCADE ikut task/Workspace, indeks hambatan terbuka); GET/POST + resolve dengan `requireTaskReadAccess`; PIC wajib anggota; activity `*.blocker_opened` / `*.blocker_resolved`; notifikasi `blocker` ke PIC lewat outbox; tutup hanya pembuka/PIC/Planner, tutup ulang 409 | PR phase ini |
| P5-FE-1 | `TaskBlockersPanel.tsx`, `features/tasks/TaskBlockersSection.tsx`, `taskService.ts`, `SubtaskWorkPage.tsx`                          | Panel Hambatan di halaman kerja Subtask (Dev dan QA): daftar terbuka dengan kategori, umur, PIC; form buka; tombol Tutup sesuai hak; riwayat; loading/error/retry                                                                                                                                                  | PR phase ini |
| P5-QA-1 | `taskBlockerApiIntegration.test.ts`, `TaskBlockersPanel.test.tsx`                                                                   | 3 integration, 4 komponen                                                                                                                                                                                                                                                                                          | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                                        | Environment             | Exit code   | Pass / fail / skip      | AC            |
| ------------------------------------------------------------------------------- | ----------------------- | ----------- | ----------------------- | ------------- |
| `node --test …/taskBlockerApiIntegration.test.js`                               | PostgreSQL 16 lokal     | 0           | 3/3                     | AC-5.1–AC-5.3 |
| `vitest run TaskBlockersPanel.test.tsx` + `SubtaskWorkPage`/`QaSubtaskWorkPage` | jsdom                   | 0           | 4/4, 21/21              | AC-5.4        |
| Screenshot Playwright 720 terang/gelap dan 390                                  | harness lokal sementara | 0           | tanpa scroll horizontal | AC-5.4        |
| Suite API penuh, suite web penuh, `npm run validate`                            | lokal                   | lihat Hasil | —                       | regresi       |

## 4. Deviasi dari rencana

| Deviasi                                                                                                   | Alasan                                                                                | Masih dalam scope? | Persetujuan baru? |
| --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Panel ditaruh di halaman kerja Subtask (`/work/subtasks/:id`), belum di accordion Subtask halaman Feature | Halaman kerja adalah detail Subtask untuk semua role; accordion menyusul bila diminta | Ya                 | Tidak             |
| Tombol Ping PIC belum ada                                                                                 | Milik LEADER-PIPELINE-HUB P4                                                          | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 2 (migrasi, Policy Registry). Migrasi `20261117000100` dijalankan di Production sebelum merge.
- Lanjut ke [testing.md](../testing.md).
