# LEADER-PIPELINE-HUB — Tahap 4: Build Phase 03 — Beban tim berbasis poin

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-3.1
**Applicable Policy IDs:** AI-009, AI-013, AI-014, FLOW-011, FLOW-012, FLOW-013, AUTH-011

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Task ID                          | P3-BE-1, P3-QA-1                                                                                                                                                                                                                                             |
| Branch / baseline commit         | `feat/leader-team-load` di atas `feat/my-work-report-p1` (isi `main` setelah PR #139)                                                                                                                                                                        |
| File/path yang diizinkan         | `packages/contracts/src/leaderPipeline.ts`; `apps/api/src/modules/leader/teamLoad.ts`, `leaderPipeline.ts` dan test-nya; Workflow + Policy Registry (FLOW-011); dokumen Feature. `leaderService.ts` dan `LeaderHubPage.tsx` (pekerjaan Codex) tidak disentuh |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner push → PR → `owner-approved` → merge                                                                                                                                                                                    |
| Pemeriksaan yang akan dijalankan | build, integration PostgreSQL, `npm run validate`                                                                                                                                                                                                            |
| Risiko & recovery                | revert PR; endpoint baca saja, tanpa migrasi                                                                                                                                                                                                                 |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                   |
| Disetujui                        | Owner melalui chat, 2026-11-17 — "Setuju G2 G3 semua (Recommended)"; urutan "ok jalankan"                                                                                                                                                                    |

## 2. Log perubahan

| Task    | File berubah                                                              | Ringkasan                                                                                                                                                                                                                                                                                                                                                                                                                                           | Commit       |
| ------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P3-BE-1 | `leaderPipeline.ts` (contracts), `teamLoad.ts`, `leaderPipeline.ts` (API) | `GET /v1/leader/pipeline` menambah `teamLoad` minggu berjalan (Senin–Minggu, zona waktu Workspace pertama): per anggota dari semua Workspace aktifnya memakai mesin beban Laporan Saya (`computeDailyLoad`) dan kapasitas efektif; per spesialisasi (Frontend/Backend/Mobile/Fullstack/Developer/QA/PO, Owner/Admin hanya bila memegang kerjaan); Subtask tanpa effort dihitung terpisah; alasan kesehatan baru `assignee_over_capacity` (Berisiko) | PR phase ini |
| P3-QA-1 | `leaderTeamLoadApiIntegration.test.ts`                                    | Angka manual: dev 2 Workspace 130%, QA 20%, area Backend/QA, judul dari Workspace yang tidak dipimpin tidak bocor, Feature menjadi Berisiko                                                                                                                                                                                                                                                                                                         | PR phase ini |
| SSoT    | Workflow, Policy Registry                                                 | FLOW-011 diperluas                                                                                                                                                                                                                                                                                                                                                                                                                                  | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                              | Environment         | Exit code | Pass / fail / skip | AC                    |
| --------------------------------------------------------------------- | ------------------- | --------- | ------------------ | --------------------- |
| `node --test …/leader/__tests__/*.test.js …/taskBlockerPing*.test.js` | PostgreSQL 16 lokal | 0         | 22/22              | AC-3.1, regresi P1/P4 |
| Suite API penuh                                                       | PostgreSQL 16 lokal | 0         | 739/739            | regresi               |
| `npm run validate`                                                    | lokal               | 0         | pass               | —                     |

## 4. Deviasi dari rencana

| Deviasi                                                                                             | Alasan                                                                                                           | Masih dalam scope? | Persetujuan baru? |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Beban tim ditambahkan ke `/v1/leader/pipeline`, bukan dengan mengganti aturan di `leaderService.ts` | `leaderService.ts` masih diubah Codex tanpa commit; aturan lama diganti saat tab Ringkasan (P2) memakai data ini | Ya                 | Tidak             |
| Belum ada UI baru                                                                                   | `TeamLoadPanel` sudah ada di galeri; dipasang di halaman bersama P2                                              | Ya                 | Tidak             |

## 5. Hasil

- PR: Tier 2 (Workflow, Policy Registry); tanpa migrasi.
- Lanjut ke [testing.md](../testing.md).
