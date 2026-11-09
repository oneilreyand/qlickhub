# FEATURE-REFERENCES-MEDIA — Tahap 4: Build Phase 01 — Backend API & Frontend PRD UI

**Status:** Kandidat teruji
**Breakdown:** [../breakdown.md](../breakdown.md)
**AC phase ini:** AC-F2.1–AC-F2.9
**Applicable Policy IDs:** AI-009, AI-013, AI-014, AUTH-001, AUTH-002, CONTRACT-001, DATA-001, TEST-001, UI-001, UI-002, UI-003, UI-004, UI-005

## 1. Approval Window

| Item                             | Isi                                                                       |
| -------------------------------- | ------------------------------------------------------------------------- |
| Task ID                          | FEATURE-REFERENCES-MEDIA                                                  |
| Branch / baseline commit         | `feat/feature-references-media`                                           |
| File/path yang diizinkan         | `packages/contracts/**`, `apps/api/**`, `apps/web/**`, `docs/features/**` |
| Urutan aksi yang diizinkan       | edit → test → commit → push branch → PR → auto-merge (tier 2)             |
| Pemeriksaan yang akan dijalankan | `npm run validate`, integration tests PostgreSQL, unit tests Vitest       |
| Risiko & recovery                | Skema tabel baru non-destruktif; rollback via migration down              |
| Masa berlaku                     | 2026-11-09 sampai PR dibuat                                               |
| Disetujui                        | Owner reyand (percakapan 2026-11-09 "ok kerjakan")                        |

## 2. Log perubahan

| Task    | File berubah                                                                                   | Ringkasan                                     | Commit  |
| ------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------- | ------- |
| P1-BE-1 | `packages/contracts/src/taskLink.ts`                                                           | Kontrak tipe TaskLink & schema Zod            | pending |
| P1-BE-2 | `apps/api/src/db/migrations/20261109000097-create-task-links.cjs`                              | DDL pembuatan tabel task_links                | pending |
| P1-BE-3 | `apps/api/src/db/models/taskLink.ts`                                                           | Model Sequelize TaskLinkModel                 | pending |
| P1-BE-4 | `apps/api/src/policies/taskLinkPolicy.ts`                                                      | Kebijakan otorisasi RBAC (Owner/Admin/PO)     | pending |
| P1-BE-5 | `apps/api/src/modules/tasks/taskLinkService.ts`                                                | Service logika bisnis tautan (CRUD & Reorder) | pending |
| P1-BE-6 | `apps/api/src/modules/tasks/taskLinkController.ts`                                             | Controller Express tautan                     | pending |
| P1-BE-7 | `apps/api/src/modules/tasks/taskRoutes.ts`                                                     | Pemasangan rute REST tautan                   | pending |
| P1-BE-8 | `apps/api/src/modules/tasks/internal/taskDeletion.ts`                                          | Cascade deletion task_links saat task dihapus | pending |
| P1-BE-9 | `apps/api/src/modules/tasks/__tests__/taskLinksIntegration.test.ts`                            | Test integrasi PostgreSQL                     | pending |
| P2-FE-1 | `apps/web/src/lib/api/taskLinkService.ts`                                                      | Service client API frontend                   | pending |
| P2-FE-2 | `apps/web/src/components/ui/organisms/taskDetail/FeatureReferencesPanel.tsx`                   | UI daftar tautan referensi & modal            | pending |
| P2-FE-3 | `apps/web/src/components/ui/organisms/taskDetail/FeatureMediaGallery.tsx`                      | UI galeri mockup gambar & embed video         | pending |
| P2-FE-4 | `apps/web/src/components/ui/organisms/taskDetail/FeatureReferencesAndMedia.tsx`                | Kontainer Referensi & Media                   | pending |
| P2-FE-5 | `apps/web/src/components/ui/organisms/taskDetail/FeatureStagePanels.tsx`                       | Integrasi tab PRD Feature                     | pending |
| P2-FE-6 | `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx`                                    | Integrasi drawer task                         | pending |
| P2-FE-7 | `apps/web/src/components/ui/organisms/taskDetail/__tests__/FeatureReferencesAndMedia.test.tsx` | Vitest unit test                              | pending |

## 3. Pemeriksaan yang dijalankan

| Perintah                                                                                             | Environment  | Exit code | Pass / fail / skip | AC                          |
| ---------------------------------------------------------------------------------------------------- | ------------ | --------- | ------------------ | --------------------------- |
| `NODE_ENV=test node --test dist/modules/tasks/__tests__/taskLinksIntegration.test.js`                | PostgreSQL   | 0         | 7 pass, 0 fail     | AC-F2.1, 2.2, 2.4, 2.7, 2.9 |
| `npx vitest run src/components/ui/organisms/taskDetail/__tests__/FeatureReferencesAndMedia.test.tsx` | Vitest/JSDOM | 0         | 10 pass, 0 fail    | AC-F2.3 s.d. 2.8            |
| `npm run validate`                                                                                   | local        | 0         | 12 suites pass     | seluruhnya                  |

## 4. Deviasi dari rencana

| Deviasi   | Alasan                                                                                               | Masih dalam scope? | Persetujuan baru? |
| --------- | ---------------------------------------------------------------------------------------------------- | ------------------ | ----------------- |
| Tidak ada | Implementasi mengikuti opsi A dan keputusan K2 Owner persis sesuai spesifikasi yang telah disetujui. | Ya                 | Tidak             |

## 5. Hasil

- PR: Menunggu pembuatan branch PR ke `main` — Tier 2 — file Tier 2 yang cocok: `apps/api/src/db/migrations/20261109000097-create-task-links.cjs`, `apps/api/src/policies/taskLinkPolicy.ts`.
- Lanjut ke [testing.md](../testing.md) untuk tahap 5.
