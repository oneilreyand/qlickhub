# E2E-SDLC-FLOW — Tahap 5: Test & Review

**Status:** Berjalan
**Gerbang:** G5 — verifier independen atau CI yang mencakup seluruh AC
**Applicable Policy IDs:** AI-003, AI-004, AI-008, AI-010, TEST-001, DOC-005, QA-010

Level bukti mengikuti `docs/4_AGENT_DEV_GUIDELINES.md` §2A.C: E0 klaim · E1 inspeksi · E2 dieksekusi ·
E3 persisten (PostgreSQL) · E4 runtime/UAT.

## 1. Matriks AC → bukti

| AC   | Phase | Bukti dibutuhkan | Bukti tercapai | Unit/UI                                                                              | API/PostgreSQL                                                                                                   | UAT/runtime                                                     | Status               |
| ---- | ----- | ---------------- | -------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------- |
| AC-1 | P1    | E4               | E4 lokal       | `selectActiveWorkspaceRole.test.ts`, `QaSubtaskWorkPage.test.tsx`                    | —                                                                                                                | E2E langkah 3 (QA global `dev`)                                 | Passed               |
| AC-2 | P2    | E3               | E3 + E4 lokal  | `RoleAwareWorkQueuePanel`, `MyTasksPage` via E2E                                     | `workQueueApiIntegration` (kartu per subtask QA, alasan kesiapan)                                                | E2E `openQueueCard` tiap langkah                                | Passed               |
| AC-3 | P2    | E3               | E3             | —                                                                                    | `testManagementApiIntegration` "gates Test Runs … per Requirement" (409, 201, 400, 403)                          | E2E langkah 3–5                                                 | Passed               |
| AC-4 | P3    | E3               | E3 + E4 lokal  | `TestCasePages.test.tsx` "one write"                                                 | `bugApiIntegration` contextual retest → attempt `reopened` dalam satu penulisan                                  | E2E langkah 6                                                   | Passed               |
| AC-5 | P3    | E3               | E3             | —                                                                                    | `testManagementApiIntegration` "new QA cycle supersedes"                                                         | E2E langkah 6 (siklus kandidat baru)                            | Passed               |
| AC-6 | P3    | E2               | E2 + E4 lokal  | `TestCasePages.test.tsx` Developer Workspace, `BugWorkPage.test.tsx` origin QA       | —                                                                                                                | E2E langkah 5                                                   | Passed               |
| AC-7 | P4    | E4               | E4 lokal       | `FeatureDetailPage.test.tsx` panel rilis per role                                    | Endpoint rilis lama (sudah teruji)                                                                               | E2E langkah 7–8                                                 | Passed               |
| AC-8 | P5    | E3               | E3             | —                                                                                    | `featureSpecApplyApiIntegration` (REQ berurutan, Apply paralel), `requirementCodeMigrationIntegration` (up/down) | E2E langkah 3 (`REQ-\d{3}`)                                     | Passed               |
| AC-9 | P5    | E4               | E4 lokal       | `QaSubtaskWorkPage.test.tsx` setujui + selesai, `TaskDetailProductBriefTab.test.tsx` | —                                                                                                                | `e2e-sdlc-flow.spec.ts`; ulang manual Production setelah deploy | Planned (Production) |

## 2. Outcome pemeriksaan

| Perintah / observasi                                                              | Environment                                 | Exit code | Pass / fail / skip / warn | AC          | Outcome           | Tindak lanjut                                                          |
| --------------------------------------------------------------------------------- | ------------------------------------------- | --------- | ------------------------- | ----------- | ----------------- | ---------------------------------------------------------------------- |
| `node --test` seluruh `dist/**/__tests__/*.test.js` (API)                         | PostgreSQL 16 disposable, migrasi kanonikal | 0         | 647 / 0 / 0               | AC-2 – AC-8 | sukses            | —                                                                      |
| `npx vitest run` (web)                                                            | Vitest, jsdom                               | 0         | 818 / 0 / 0 (139 file)    | AC-1 – AC-9 | sukses            | —                                                                      |
| `node e2e/run.mjs` (Playwright, desktop + mobile)                                 | PostgreSQL 16 disposable, Chromium          | 0         | 33 / 0 / 1                | AC-1 – AC-9 | sukses            | Skip = alur penuh hanya di desktop                                     |
| `tsc --noEmit` API dan web; ESLint file berubah                                   | local                                       | 0         | 0 error                   | —           | sukses            | —                                                                      |
| E2E penuh pertama: siklus uji ditolak 409 (Brief draf), pesan umum                | Playwright                                  | 1         | gagal                     | AC-9        | gagal (bukti red) | Diperbaiki: status Brief di editor Feature; API client membaca `code`  |
| E2E penuh: subtask QA tidak bisa Done (400) karena subtask Developer masih Review | Playwright                                  | 1         | gagal                     | AC-9        | gagal (bukti red) | Diperbaiki: QA menyetujui pekerjaan Developer lalu Selesaikan Eksekusi |
| Satu test drawer lama mengharapkan editor Brief "tanpa status"                    | Vitest                                      | 1         | 1 gagal                   | AC-9        | gagal             | Ekspektasi diubah dengan alasan (lihat PHASE-01 §4)                    |

Kegagalan tidak dihapus dari tabel.

## 3. Bukti UI (bila UI berubah)

Playwright `apps/web/e2e/specs/e2e-sdlc-flow.spec.ts` menjalankan PO, Developer BE/FE, dan QA lewat
UI saja di desktop. Layar lain diuji di desktop dan mobile oleh suite yang sama.

## 4. Quality review (AI-010)

| Dimensi                     | Metode & scope                                                       | Temuan                                                                                                                | Status   |
| --------------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------- |
| Reuse / DRY                 | Baca `taskPolicy`, `qaEvidenceCompletionGate`, `createRetestAttempt` | Retest memakai `applyRetestAttempt` yang sama dengan endpoint lama; persetujuan QA memakai transisi reviewer yang ada | resolved |
| Duplikasi / tumpang tindih  | Cari aturan kesiapan lain                                            | Kesiapan hanya di `developerReadiness.ts`; hook web lama dihapus                                                      | resolved |
| Kode usang / tidak terpakai | `grep` `useDeveloperReadiness` lama, redirect review_subtask         | Perhitungan browser dan redirect tebakan dihapus                                                                      | resolved |
| Boundary & best practice    | Transaksi retest, advisory lock kode REQ, superseded cycle           | Satu transaksi; lock per Workspace; unique constraint tetap penjaga akhir                                             | resolved |
| Bukti regresi               | Seluruh suite API, web, Playwright                                   | 647/647 API, 818/818 web, 33 E2E + 1 skip                                                                             | resolved |

## 5. Hasil verifier

| Phase | Verifier (bukan pelaksana) | Bukti primer yang dicek ulang | Hasil    | AC terdampak / gap                                                            |
| ----- | -------------------------- | ----------------------------- | -------- | ----------------------------------------------------------------------------- |
| P1–P5 | CI PR (menunggu)           | Diff, suite API/web/E2E       | Berjalan | AC-9 di Production setelah deploy; notifikasi Bug masih membuka Feature (gap) |

Gap yang diterima harus disetujui eksplisit dan dicatat di [release.md](release.md).
