# LEADER-PIPELINE-HUB — Tahap 4: Build Phase 04 — Papan hambatan + Ping PIC

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-4.1 (AC-4.2 dipasang bersama P2)
**Applicable Policy IDs:** AI-009, AI-013, AI-014, FLOW-011

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Task ID                          | P4-BE-1, P4-FE-1, P4-QA-1                                                                                                                                                                                                                                                                                                                        |
| Branch / baseline commit         | `feat/leader-blocker-ping` dari `feat/leader-pipeline-p1` (di atas `feat/member-access-p1`, `origin/main` @ `9941c5f2`)                                                                                                                                                                                                                          |
| File/path yang diizinkan         | `packages/contracts/src/blocker.ts`, `leaderPipeline.ts`; `apps/api/src/modules/tasks/` (service, controller, route ping, test); `apps/api/src/modules/leader/leaderPipeline.ts`; `organisms/leaderHub/*` (panel, view, types, fixture, test); dokumen Feature. `LeaderHubPage.tsx` dan `features/leader/*` milik pekerjaan Codex tidak disentuh |
| Urutan aksi yang diizinkan       | edit → test → commit → patch ke folder Owner → Owner push branch → PR → merge oleh Owner                                                                                                                                                                                                                                                         |
| Pemeriksaan yang akan dijalankan | build, integration PostgreSQL, Vitest, `npm run validate`                                                                                                                                                                                                                                                                                        |
| Risiko & recovery                | revert PR; tanpa migrasi; notifikasi baru hanya saat leader menekan Ping PIC                                                                                                                                                                                                                                                                     |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                                                                                                       |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)"; urutan Leader dulu disetujui "ok jalankan"                                                                                                                                                                                                                                  |

## 2. Log perubahan

| Task    | File berubah                                                                                                                    | Ringkasan                                                                                                                                                                                                                                                 | Commit       |
| ------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P4-BE-1 | `blocker.ts` (contracts), `taskBlockers.ts`, `taskBlockerController.ts`, `taskRoutes.ts`, `leaderPipeline.ts` (contracts + API) | `POST …/blockers/:blockerId/ping` khusus Owner/Admin; kunci baris hambatan; batas 60 menit per hambatan dari aktivitas `*.blocker_pinged`; satu notifikasi `blocker` ke PIC lewat outbox; pipeline leader melaporkan `lastPingedAt`/`nextPingAvailableAt` | PR phase ini |
| P4-FE-1 | `OpenBlockersPanel.tsx`, `LeaderHubSummaryView.tsx`, `types.ts`, fixture                                                        | Ping PIC nonaktif selama batas 1 jam dengan alasan "PIC sudah di-ping · bisa lagi pukul HH.MM" (`aria-describedby`); status memuat saat ping berjalan; contoh di galeri                                                                                   | PR phase ini |
| P4-QA-1 | `taskBlockerPingApiIntegration.test.ts`, `LeaderHubSummaryView.test.tsx`                                                        | 4 integration (peran, notifikasi + log + batas per hambatan + boleh lagi setelah 1 jam, 409/400/404, data pipeline), 2 component                                                                                                                          | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                       | Environment         | Exit code | Pass / fail / skip      | AC                       |
| -------------------------------------------------------------- | ------------------- | --------- | ----------------------- | ------------------------ |
| `node --test …/taskBlocker*.test.js …/leaderPipeline*.test.js` | PostgreSQL 16 lokal | 0         | 21/21                   | AC-4.1, regresi P1/WF P5 |
| `npx vitest run …/leaderHub`                                   | lokal               | 0         | 10/10                   | AC-4.1                   |
| Cek visual galeri (desktop, ponsel 390 px, gelap)              | Chromium lokal      | —         | tanpa scroll horizontal | AC-4.1                   |
| `npm run validate`                                             | lokal               | 0         | pass                    | —                        |

## 4. Deviasi dari rencana

| Deviasi                                                                                                      | Alasan                                                                                          | Masih dalam scope? | Persetujuan baru? |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Batas 1 jam dihitung dari log aktivitas, tanpa kolom baru                                                    | Menghindari migrasi; log aktivitas sudah menjadi catatan ping                                   | Ya                 | Tidak             |
| Tombol Buka (AC-4.2) dan pemasangan ke halaman Leader Hub menunggu P2                                        | `LeaderHubPage.tsx` masih dikerjakan Codex                                                      | Ya                 | Tidak             |
| Aturan peran dan batas ping dicatat di `authorization.md` dan contracts.md Feature, belum di Policy Registry | Bagian dari FLOW-011 + matriks otorisasi Feature; dinaikkan ke registry bila Owner menginginkan | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 1 (tanpa Architecture/Workflow/Policy Registry, tanpa migrasi).
- Lanjut ke [testing.md](../testing.md).
