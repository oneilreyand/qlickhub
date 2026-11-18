# LEADER-PIPELINE-HUB — Tahap 5: Test & Review

**Status:** Berjalan
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT.

## 1. Matriks AC → bukti

| AC     | Phase | Bukti dibutuhkan | Bukti tercapai | Unit/UI                                                                                                     | API/PostgreSQL                                            | UAT/runtime                  | Status         |
| ------ | ----- | ---------------- | -------------- | ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------- | -------------- |
| AC-1.1 | P1    | E3               | E3             | `leaderPipelineRules.test.ts`, `leaderPipelineApiIntegration.test.ts`                                       | PostgreSQL lokal                                          | —                            | Kandidat lokal |
| AC-1.2 | P1    | E3               | E3             | `leaderPipelineRules.test.ts`, `leaderPipelineApiIntegration.test.ts`                                       | PostgreSQL lokal                                          | —                            | Kandidat lokal |
| AC-1.3 | P1    | E3               | E3             | `leaderPipelineRules.test.ts`, `leaderPipelineApiIntegration.test.ts`                                       | PostgreSQL lokal                                          | —                            | Kandidat lokal |
| AC-2.1 | P2    | E4               | E2             | `LeaderSummaryTab.test.tsx`, `LeaderHubPage.test.tsx`, `LeaderHubSummaryView.test.tsx`                      | `/v1/leader/pipeline` (P1/P3/P4)                          | UAT Production setelah merge | Kandidat lokal |
| AC-2.2 | P2    | E4               | E2             | `LeaderSummaryTab.test.tsx` (403 → denied, error + Coba lagi), filter Workspace di `LeaderHubPage.test.tsx` | —                                                         | UAT Production setelah merge | Kandidat lokal |
| AC-3.1 | P3    | E3               | E3             | —                                                                                                           | `leaderTeamLoadApiIntegration.test.ts` (PostgreSQL lokal) | —                            | Kandidat lokal |
| AC-4.1 | P4    | E3               | E3             | `taskBlockerPingApiIntegration.test.ts`, `LeaderHubSummaryView.test.tsx`                                    | PostgreSQL lokal                                          | —                            | Kandidat lokal |
| AC-4.2 | P2    | E2               | E2             | `LeaderSummaryTab.test.tsx`: Buka → `/work/subtasks/:id`                                                    | —                                                         | —                            | Kandidat lokal |
| AC-5.1 | P5    | E3               | —              | —                                                                                                           | —                                                         | —                            | Planned        |
| AC-6.1 | P6    | E3               | —              | —                                                                                                           | —                                                         | —                            | Planned        |
| AC-7.1 | P7    | E3               | —              | —                                                                                                           | —                                                         | —                            | Planned        |

## 2. Outcome pemeriksaan

Diisi per phase saat build berjalan. Kegagalan tidak dihapus dari tabel.

## 3. Bukti UI (bila UI berubah)

Diisi per phase: phone 390, tablet 768, desktop 1440, terang dan gelap, keyboard.

## 4. Quality review (AI-010)

Diisi per phase: reuse/DRY, duplikasi, kode usang, boundary, bukti regresi.

## 5. Hasil verifier

Diisi per phase oleh verifier yang bukan pelaksana.
