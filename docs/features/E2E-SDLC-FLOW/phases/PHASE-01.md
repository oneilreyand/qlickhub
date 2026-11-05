# E2E-SDLC-FLOW — Tahap 4: Build Phase 01 — Alur E2E satu putaran (P1–P5)

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-1 – AC-9
**Applicable Policy IDs:** AI-009, AI-013, AI-014, QA-010

## 1. Approval Window

| Item                             | Isi                                                                                                                                                 |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | E2E-SDLC-FLOW P1–P5                                                                                                                                 |
| Branch / baseline commit         | `feat/e2e-sdlc-flow` @ `51f9244`                                                                                                                    |
| File/path yang diizinkan         | Task di [breakdown.md](../breakdown.md), folder Feature ini, ADR-041, Workflow SSoT, Policy Registry, `TODO.md`, `docs/features/FEATURE_CATALOG.md` |
| Urutan aksi yang diizinkan       | edit → test → validate → commit → Owner push branch → PR (Tier 2) → Owner menerapkan migrasi ke Production → label dan merge                        |
| Pemeriksaan yang akan dijalankan | Integration test PostgreSQL, Vitest, Playwright, `npm run validate`                                                                                 |
| Risiko & recovery                | Revert PR; `down` migrasi kode Requirement                                                                                                          |
| Masa berlaku                     | Sampai PR dibuat; tidak ada merge, secret, atau perubahan Production oleh agent                                                                     |
| Disetujui                        | reyand (Owner), 2026-11-05, chat "ok jalankan" + "aku ingin jalannya 1 round semua" dengan K1–K5                                                    |

## 2. Log perubahan

| Task       | File berubah                                                                                                                                                                                | Ringkasan                                                            | Commit               |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- | -------------------- |
| P1-FE-1    | `workspaceSlice.ts`, `QaSubtaskWorkSection.tsx`, `TestCaseRunPage.tsx`, `TestCaseNewPage.tsx`, `BugWorkPage.tsx`, `SubtaskWorkPage.tsx`                                                     | Role Workspace; alasan "hanya melihat"                               | `feat/e2e-sdlc-flow` |
| P2-BE-1/FE | `developerReadiness.ts`, `testManagementController/Routes/Service.ts`, `workQueueService.ts`, `bugService.ts`, `useDeveloperReadiness.ts`, `MyTasksPage.tsx`, `RoleAwareWorkQueuePanel.tsx` | Kesiapan per Requirement di server; kartu QA per subtask QA          | `feat/e2e-sdlc-flow` |
| P3-BE-1/FE | `bugService.ts` (`applyRetestAttempt`), `testManagementService.ts`, `contracts/src/bug.ts`, `TestCaseRunPage.tsx`, `BugWorkPage.tsx`                                                        | Retest satu transaksi; siklus `superseded`; Bug routing              | `feat/e2e-sdlc-flow` |
| P4-FE-1    | `FeatureDetailPage.tsx`, `MyTasksPage.tsx`                                                                                                                                                  | Panel rilis di Feature                                               | `feat/e2e-sdlc-flow` |
| P5-BE-1    | `requirementCodes.ts`, `aiTaskDraftPersistence.ts`, migrasi `20261105000095`                                                                                                                | `REQ-001` + rename                                                   | `feat/e2e-sdlc-flow` |
| P5-FE-1/QA | `TaskDetailProductBriefTab.tsx`, `QaSubtaskWorkSection.tsx`, `QaSubtaskWorkView.tsx`, `apiClient.ts`, `e2e/specs/e2e-sdlc-flow.spec.ts`                                                     | Brief disetujui di Feature; QA menutup eksekusi; pesan spesifik; E2E | `feat/e2e-sdlc-flow` |

## 3. Pemeriksaan yang dijalankan

Hasil lengkap di [testing.md](../testing.md) §2.

## 4. Deviasi dari rencana

| Deviasi                                                                                | Alasan                                                                                                   | Masih dalam scope? | Persetujuan baru? |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Editor Brief sederhana kembali menampilkan Status (test lama "tanpa status" diubah)    | E2E: tanpa Brief disetujui QA tidak bisa memulai siklus, dan halaman Feature tidak punya cara menyetujui | Ya                 | Tidak             |
| QA menyetujui subtask Developer `in_review` dari halaman QA sebelum menutup subtask QA | E2E: aturan penyelesaian QA menuntut semua subtask Developer selesai, tanpa tombol di UI                 | Ya                 | Tidak             |
| API client membaca `code` di level atas problem details                                | Semua pesan CONFLICT spesifik sebelumnya jatuh ke pesan umum                                             | Ya                 | Tidak             |
| Satu PR untuk P1–P5, bukan satu PR per phase                                           | Permintaan Owner: satu putaran                                                                           | Ya                 | Tidak (diminta)   |
| Notifikasi Bug masih membuka Feature                                                   | Butuh kolom baru di `notifications`; dicatat sebagai gap                                                 | Ya (gap)           | Tidak             |

## 5. Hasil

- PR: dibuat Owner dari branch `feat/e2e-sdlc-flow` — Tier 2 — file Tier 2 yang cocok: migrasi
  `apps/api/src/db/migrations/**`, `docs/adr/**`, `docs/POLICY_REGISTRY.md`,
  `docs/2_WORKFLOW_AND_ROLES.md`, `quality/doc-baseline.json` (bila berubah).
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
