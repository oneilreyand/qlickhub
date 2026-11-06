# E2E-SDLC-FLOW — Tahap 4: Build Phase 02 — UX lanjutan dan Test Case untuk Developer (P7)

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-11 – AC-15
**Applicable Policy IDs:** AI-009, AI-013, AI-014, QA-010

## 1. Approval Window

| Item                             | Isi                                                                                                                     |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Task ID                          | E2E-SDLC-FLOW P7 (P7-BE-1, P7-FE-1, P7-FE-2, P7-QA-1)                                                                   |
| Branch / baseline commit         | `feat/e2e-sdlc-flow-p7` @ `cbd2196`                                                                                     |
| File/path yang diizinkan         | Task P7 di [breakdown.md](../breakdown.md), folder Feature ini, `TODO.md`, laporan rilis E2E-SDLC-FLOW                  |
| Urutan aksi yang diizinkan       | edit → test → validate → commit → Owner push branch → PR (Tier 1) → Owner merge                                         |
| Pemeriksaan yang akan dijalankan | Integration test PostgreSQL, Vitest, Playwright, `npm run validate`                                                     |
| Risiko & recovery                | Revert PR; tidak ada migrasi                                                                                            |
| Masa berlaku                     | Sampai PR dibuat; tidak ada merge, secret, atau perubahan Production oleh agent                                         |
| Disetujui                        | reyand (Owner), 2026-11-06, chat "tambahkan di plan sama dengan temuan tadi" lalu "bisa kita jalankan dalam satu round" |

## 2. Log perubahan

| Task    | File berubah                                                                                                                                                                                                                          |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P7-BE-1 | `workQueueService.ts` (`approve_product_brief`), `taskLifecycle.ts` (`updateTaskInTransaction`, `completeQaReviewImpl`), `taskController.ts`, `taskRoutes.ts`, `taskService.ts`, `packages/contracts/src/{task,workQueue}.ts`         |
| P7-FE-1 | `FeatureStagePanels.tsx`, `TaskDetailDrawer.tsx`, `MyTasksPage.tsx`, `workQueueRoute.ts`, `FeatureSpecDraftPanel/PrdEditor/TasksEditor.tsx`, `ReleaseAssurancePanel.tsx`, `OverviewStoreDashboard.tsx`, `RoleAwareWorkQueuePanel.tsx` |
| P7-FE-2 | `DeveloperTestCasesSection.tsx`, `SubtaskWorkView.tsx`, `SubtaskWorkPage.tsx`, `qaHandoff.ts`, `TestCaseRunPage.tsx`, `QaSubtaskWorkSection.tsx`, `QaSubtaskWorkView.tsx`, `taskService.ts` (web), `e2e/specs/e2e-sdlc-flow.spec.ts`  |

## 3. Pemeriksaan yang dijalankan

Hasil lengkap di [testing.md](../testing.md) §2.

## 4. Deviasi dari rencana

| Deviasi                                                                                | Alasan                                                                              | Masih dalam scope? | Perlu persetujuan ulang? |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ------------------ | ------------------------ |
| Build/lingkungan Developer disimpan sebagai baris berlabel di komentar `ready_for_qa`  | Tanpa migrasi (rencana: hindari migrasi bila bisa); kolom terstruktur bisa menyusul | Ya                 | Tidak                    |
| `updateTaskImpl` dipecah menjadi `updateTaskInTransaction` + notifikasi setelah commit | Agar setujui + selesaikan memakai aturan yang sama dalam satu transaksi (AC-15)     | Ya                 | Tidak                    |
| Tombol "Setujui" per item tetap ada di samping "Setujui semua & selesaikan eksekusi"   | QA tetap bisa menyetujui sebagian lebih dulu                                        | Ya                 | Tidak                    |

## 5. Hasil

- PR: [#107](https://github.com/oneilreyand/qlickhub/pull/107), di-merge Owner 2026-11-06 (`eaac5a0`) — Tier 1 (tidak ada migrasi, ADR, SSoT, Policy Registry, atau `quality/**`).
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
