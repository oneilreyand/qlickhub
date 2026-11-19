# LEADER-PIPELINE-HUB — Tahap 4: Build Phase 02 — Tab Ringkasan

**Status:** Di main
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-2.1, AC-2.2, AC-4.2 (serta sisa AC-3.1 di Timeline)
**Applicable Policy IDs:** AI-009, AI-013, AI-014, FLOW-011, FLOW-013

## 1. Approval Window

| Item                             | Isi                                                                                                                                                                                                                                                                                                               |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | P2-FE-1, P3-BE-1 (sisa), P2-QA-1, MY-WORK-REPORT P5 (diganti)                                                                                                                                                                                                                                                     |
| Branch / baseline commit         | `feat/leader-summary-tab` dari `origin/main` setelah MY-WORK-REPORT P4                                                                                                                                                                                                                                            |
| File/path yang diizinkan         | `LeaderHubPage.tsx`, `features/leader/*`, `leaderService.ts` (web + API), `organisms/leaderHub/*`, `teamLoad.ts` dan test; navigasi: `App.tsx`, `Sidebar.tsx`, `sectionLabel.ts`, `OverviewStoreDashboard.tsx`, `UserFlowGuide.tsx`, hapus `ReportPage.tsx`; `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`; dokumen Feature |
| Urutan aksi yang diizinkan       | edit → test → commit → patch → Owner push → PR → merge                                                                                                                                                                                                                                                            |
| Pemeriksaan yang akan dijalankan | build, integration PostgreSQL, Vitest, `npm run validate`                                                                                                                                                                                                                                                         |
| Risiko & recovery                | revert PR; tanpa migrasi. Perubahan Codex yang belum di-commit di `codex/leader-release-activity` akan bentrok dengan `LeaderHubPage.tsx`                                                                                                                                                                         |
| Masa berlaku                     | sampai PR phase ini dibuat                                                                                                                                                                                                                                                                                        |
| Disetujui                        | Owner melalui chat, 2026-11-18: "1. ambil alih, 2. hilangkan laporan dan pertahankan laporan saya, 3. tetap di grup lainnya"                                                                                                                                                                                      |

## 2. Log perubahan

| Task             | File berubah                                                                                                                           | Ringkasan                                                                                                                                                                                                                                                                                                                                                                       | Commit       |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| P2-FE-1          | `LeaderHubPage.tsx`, `features/leader/LeaderSummaryTab.tsx`, `mapLeaderPipeline.ts`, `leaderService.ts` (web), `organisms/leaderHub/*` | Tab "Ringkasan" menjadi tab bawaan Leader Hub: 6 kartu statistik, pipeline 9 tahap (tahap belum dilacak tampil "–" bergaris putus, bukan selesai), hambatan terbuka dengan Ping PIC (status memuat + batas 1 jam) dan Buka (ke Subtask/Feature), beban tim per spesialisasi + anggota melebihi kapasitas; filter Workspace dari pemilih yang sudah ada; state loading/error/403 | PR phase ini |
| P3-BE-1 (sisa)   | `leaderService.ts` (API), `teamLoad.ts`                                                                                                | Timeline Leader: status "overloaded" = poin effort di atas kapasitas pada periode timeline atau bentrok jadwal; aturan "≥3 Subtask aktif" dihapus                                                                                                                                                                                                                               | PR phase ini |
| MWR P5 (diganti) | `App.tsx`, `Sidebar.tsx`, `sectionLabel.ts`, `OverviewStoreDashboard.tsx`, `UserFlowGuide.tsx`, `ReportPage.tsx` (dihapus)             | Keputusan Owner: menu dan halaman "Laporan" (timeline kapasitas tim) dihapus; `/reports` diarahkan ke `/my-report`; "Laporan Saya" tetap di grup Lainnya; menu utama kini Ringkasan, Task Hub, Tugas Saya                                                                                                                                                                       | PR phase ini |
| P2-QA-1          | `LeaderSummaryTab.test.tsx`, `LeaderHubPage.test.tsx`, `leaderTeamLoadApiIntegration.test.ts`, test navigasi                           | 3 component (render, Ping + cooldown + Buka, 403/error), aturan overloaded baru (3 Subtask kecil = seimbang)                                                                                                                                                                                                                                                                    | PR phase ini |

## 3. Pemeriksaan yang dijalankan

| Perintah                                   | Environment         | Exit code | Pass / fail / skip       | AC      |
| ------------------------------------------ | ------------------- | --------- | ------------------------ | ------- |
| `node --test …/leader/__tests__/*.test.js` | PostgreSQL 16 lokal | 0         | lulus                    | AC-3.1  |
| Suite API penuh + Vitest penuh             | PostgreSQL 16 lokal | 0         | API 746/746, Web 910/910 | regresi |
| `npm run validate`                         | lokal               | 0         | pass                     | —       |

## 4. Deviasi dari rencana

| Deviasi                                                           | Alasan                                                                                  | Masih dalam scope? | Persetujuan baru? |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Pekerjaan Codex LEADER-SDLC-HUB yang belum di-commit diambil alih | Keputusan Owner 2026-11-18                                                              | Ya                 | Ya (chat)         |
| Filter periode tidak ada di tab Ringkasan                         | Pipeline dan hambatan menggambarkan kondisi saat ini; beban tim memakai minggu berjalan | Ya                 | Tidak             |
| MWR P5 "pindahkan Timeline Tim" diganti "hapus halaman Laporan"   | Keputusan Owner 2026-11-18                                                              | Ya                 | Ya (chat)         |

## 5. Hasil

- PR: Tier 1 (tanpa migrasi, tanpa Architecture/Workflow/Policy Registry).
- Lanjut ke [testing.md](../testing.md).
