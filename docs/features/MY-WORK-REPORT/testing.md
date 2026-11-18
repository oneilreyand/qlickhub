# MY-WORK-REPORT — Tahap 5: Test & Review

**Status:** Belum mulai
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT.

## 1. Matriks AC → bukti

| AC     | Phase | Bukti dibutuhkan | Bukti tercapai | Unit/UI                                                                                                                          | API/PostgreSQL                                                         | UAT/runtime                  | Status         |
| ------ | ----- | ---------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ---------------------------- | -------------- |
| AC-1.1 | P1    | E3               | E3             | `MyWorkReportPage.test.tsx`                                                                                                      | `workReportApiIntegration.test.ts` (PostgreSQL lokal)                  | —                            | Kandidat lokal |
| AC-1.2 | P1    | E3               | E3             | —                                                                                                                                | `workReportApiIntegration.test.ts` (PostgreSQL lokal)                  | —                            | Kandidat lokal |
| AC-1.3 | P1    | E3               | E3             | —                                                                                                                                | `workReportApiIntegration.test.ts` (PostgreSQL lokal)                  | —                            | Kandidat lokal |
| AC-1.4 | P1    | E3               | E3             | `MyWorkReportPage.test.tsx`                                                                                                      | `workReportApiIntegration.test.ts` (PostgreSQL lokal)                  | —                            | Kandidat lokal |
| AC-1.5 | P1    | E4               | E2             | `MyWorkReportPage.test.tsx`; cek visual lokal desktop/ponsel/gelap                                                               | —                                                                      | UAT Production setelah merge | Kandidat lokal |
| AC-2.1 | P2    | E3               | E3             | `workReportRules.test.ts`, `MyWorkReportPage.test.tsx`                                                                           | `workReportApiIntegration.test.ts` (PostgreSQL lokal)                  | —                            | Kandidat lokal |
| AC-2.2 | P2    | E3               | E3             | `workReportRules.test.ts`, `MyWorkReportPage.test.tsx`                                                                           | `workReportApiIntegration.test.ts` (PostgreSQL lokal)                  | —                            | Kandidat lokal |
| AC-3.1 | P3    | E3               | E3             | `mapMyWorkReport.test.ts`, `CreateSubtaskModal.test.tsx`, `MyWorkReportPage.test.tsx`                                            | `fairnessApiIntegration.test.ts` (PostgreSQL lokal)                    | —                            | Kandidat lokal |
| AC-3.2 | P3    | E1               | E3             | `mapMyWorkReport.test.ts`                                                                                                        | `fairnessApiIntegration.test.ts`: respons baseline tanpa id/nama orang | —                            | Kandidat lokal |
| AC-4.1 | P4    | E3               | E3             | `TaskRelationsPanel.test.tsx`                                                                                                    | `taskRelationApiIntegration.test.ts` (PostgreSQL lokal)                | —                            | Kandidat lokal |
| AC-4.2 | P4    | E3               | E3             | `TaskRelationsPanel.test.tsx`                                                                                                    | `taskRelationApiIntegration.test.ts` (PostgreSQL lokal)                | —                            | Kandidat lokal |
| AC-4.3 | P4    | E3               | E3             | `MyWorkReportPage.test.tsx`                                                                                                      | `taskRelationApiIntegration.test.ts` (PostgreSQL lokal)                | —                            | Kandidat lokal |
| AC-5.1 | P5    | E4               | E2             | Diganti keputusan Owner 2026-11-18: halaman Laporan dihapus, `/reports` → `/my-report`; `Sidebar.test.tsx`, `AppRoutes.test.tsx` | —                                                                      | UAT setelah merge            | Kandidat lokal |

## 2. Outcome pemeriksaan

Diisi per phase saat build berjalan. Kegagalan tidak dihapus dari tabel.

## 3. Bukti UI (bila UI berubah)

Diisi per phase: phone 390, tablet 768, desktop 1440, terang dan gelap, keyboard.

## 4. Quality review (AI-010)

Diisi per phase: reuse/DRY, duplikasi, kode usang, boundary, bukti regresi.

## 5. Hasil verifier

Diisi per phase oleh verifier yang bukan pelaksana.
