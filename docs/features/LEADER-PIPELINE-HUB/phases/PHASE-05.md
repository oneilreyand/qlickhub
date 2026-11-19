# LEADER-PIPELINE-HUB — Tahap 4: Build Phase 05 — Pembaruan langsung (realtime)

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-5.1
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AUTH-001, AUTH-013

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P5-BE-1, P5-FE-1, P5-QA-1                                                                                                                                                                                                                                                                 |
| Branch / baseline commit         | `feat/leader-p5` dari `origin/main` @ `3d9ded04` (PR #149)                                                                                                                                                                                                                                |
| File/path yang diizinkan         | `apps/api/src/modules/leader/` (`leaderLiveUpdates.ts`, `leaderPipelineRoutes.ts`, test), `services/realtimeEventBus.ts` (jenis event); Web `features/leader/` (`useLeaderLiveUpdates.ts`, `LeaderSummaryTab.tsx`, test), `organisms/leaderHub/LeaderHubSummaryView.tsx`; dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner push → PR → merge                                                                                                                                                                                                                                    |
| Pemeriksaan yang akan dijalankan | integration PostgreSQL (stream SSE nyata), suite API penuh, Vitest, `npm run validate`                                                                                                                                                                                                    |
| Risiko & recovery                | tanpa migrasi; event hanya berisi id Workspace; bila stream gagal, UI kembali ke muat ulang berkala. Revert PR                                                                                                                                                                            |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                                                |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)"; lanjut 2026-11-19 ("ok jalankan satu raund semua bisa")                                                                                                                                                              |

## 2. Log perubahan

| Task    | File berubah                                                                  | Ringkasan                                                                                                                                                                                                                                                                                              | Commit       |
| ------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------ |
| P5-BE-1 | `leaderLiveUpdates.ts`, `leaderPipelineRoutes.ts`, `realtimeEventBus.ts`      | Hook `afterCreate` pada `TaskActivityModel` (setelah transaksi commit) → `leader:pipeline_changed` `{ workspaceId }` di kanal `leader:<workspaceId>`, digabung 1,5 dtk per Workspace. `GET /v1/leader/stream`: satu stream SSE untuk semua Workspace aktif yang dipimpin (Owner/Admin); non-leader 403 | PR phase ini |
| P5-FE-1 | `useLeaderLiveUpdates.ts`, `LeaderSummaryTab.tsx`, `LeaderHubSummaryView.tsx` | Tab Ringkasan berlangganan stream; event → muat ulang senyap (tanpa skeleton) dengan debounce 2 dtk; indikator "Langsung · diperbarui hh.mm" / "Menyambung ulang…" / "Diperbarui berkala tiap 2 menit"; cadangan muat ulang tiap 2 menit saat stream putus                                             | PR phase ini |
| P5-QA-1 | `leaderLiveStreamIntegration.test.ts`, `LeaderSummaryTab.test.tsx`            | 3 integration (stream nyata), 2 component                                                                                                                                                                                                                                                              | PR phase ini |
| Dokumen | breakdown, testing, README, contracts, catalog, PHASE-01–04                   | Status P1–P4 diselaraskan ke "Di main"; P7 ditandai ditunda                                                                                                                                                                                                                                            | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                               | Environment         | Exit code      | Pass / fail / skip                       | AC      |
| ---------------------------------------------------------------------- | ------------------- | -------------- | ---------------------------------------- | ------- |
| `node --test …/leaderLiveStreamIntegration.test.js`                    | PostgreSQL 16 lokal | 0              | 3/3                                      | AC-5.1  |
| `vitest run src/features/leader src/components/ui/organisms/leaderHub` | lokal               | 0              | 15/15                                    | AC-5.1  |
| Suite API + Vitest penuh, `npm run validate`                           | lokal               | lihat PHASE-06 | dijalankan pada branch P6 yang memuat P5 | regresi |

## 4. Deviasi dari rencana

| Deviasi                                                                        | Alasan                                                                                               | Masih dalam scope? | Persetujuan baru? |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Satu stream untuk semua Workspace yang dipimpin, bukan satu per Workspace (D7) | Klien realtime yang ada hanya menjaga satu Workspace; satu koneksi menghindari batas koneksi browser | Ya                 | Tidak             |
| Event tidak membawa data task                                                  | Hindari kebocoran ke pembaca yang tidak berhak (AUTH-013); data tetap lewat endpoint berizin         | Ya                 | Tidak             |

## 5. Hasil dan batasan

- PR: Tier 1 (tanpa migrasi, tanpa middleware/SSoT Tier 2).
- Bus event di memori: di Vercel, event hanya sampai ke klien yang tersambung ke instance yang sama, dan koneksi SSE dibatasi durasi fungsi lalu tersambung ulang otomatis. Karena itu ada cadangan muat ulang tiap 2 menit; perilaku sama dengan stream diskusi yang sudah ada.
- Lanjut ke [testing.md](../testing.md).
