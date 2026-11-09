# FEATURE-REFERENCES-MEDIA — Tahap 3: Breakdown & Work Readiness Assessment

**Status:** Menunggu persetujuan
**Gerbang:** G3 — disetujui Owner
**Applicable Policy IDs:** SDLC-001, SDLC-002, CONTRACT-001, DATA-001, AUTH-001, AUTH-002, TEST-001, UI-001, UI-002, UI-003, UI-004, UI-005

## 1. Work Readiness Assessment (WRA)

- **Jalur SDLC**: Standar (Data/Migrasi + BE API + FE Atomic UI + QA Test Evidence).
- **Skor Kesiapan**: **Ready (16/16)** untuk perancangan spesifikasi; siap diimplementasikan ke runtime setelah G0–G3 disetujui Owner.
  - Requirement: Lengkap, keputusan K2 disetujui (Owner, Admin, PO mengelola; Dev/QA view-only).
  - Data / Migrasi: Terdefinisi jelas (tabel `task_links`, index `workspace_id` + `task_id`, `ON DELETE CASCADE`).
  - Otorisasi: RBAC terdefinisi di backend policy dan kontrak endpoint.
  - Kontrak Bersama: Tipe `TaskLink` dan input CRUD siap ditambahkan di `packages/contracts`.
  - UI Atomic: Komponen `TaskAttachmentsPanel.tsx` dan `link-preview` sudah ada, tinggal diintegrasikan.
  - Validasi & Testing: Rencana pengujian PostgreSQL disposable dan component testing telah terinci.

## 2. Peta Phase Pelaksanaan

| Phase  | Hasil Pengguna                                                                                 | Acceptance Criteria                | Dependensi            |
| :----- | :--------------------------------------------------------------------------------------------- | :--------------------------------- | :-------------------- |
| **P1** | Backend & Database: Tabel `task_links`, migrasi, model, service CRUD, policy RBAC, dan route   | AC-F2.1, AC-F2.2, AC-F2.6, AC-F2.9 | G0–G3 disetujui Owner |
| **P2** | Shared Contract & Frontend PRD: Kartu tautan dengan direct redirect, reorder, dan galeri media | AC-F2.3, AC-F2.4, AC-F2.5, AC-F2.6 | P1 selesai            |
| **P3** | Desk Developer & QA: Integrasi referensi baca-saja di subtask + E2E regression check           | AC-F2.7, AC-F2.8                   | P2 selesai            |

## 3. Estimasi File yang Berubah

| Task        | Layer     | Pekerjaan                                       | File / Path Perkiraan                                                                                 | Bukti Pengujian                   |
| :---------- | :-------- | :---------------------------------------------- | :---------------------------------------------------------------------------------------------------- | :-------------------------------- |
| **F2-DB-1** | DB        | Migrasi tabel `task_links` dan indeks           | `apps/api/src/db/migrations/*-create-task-links.cjs`                                                  | PostgreSQL clean migration        |
| **F2-BE-1** | BE        | Model Sequelize `TaskLinkModel` & relasi        | `apps/api/src/db/models/taskLink.ts`, `apps/api/src/db/models/index.ts`, `associations.ts`            | Model associations test           |
| **F2-BE-2** | BE        | Service CRUD & Policy RBAC                      | `apps/api/src/modules/tasks/taskLinkService.ts`, `apps/api/src/policies/taskLinkPolicy.ts`            | Integration tests (201, 400, 403) |
| **F2-BE-3** | BE        | REST API Router & Controller                    | `apps/api/src/modules/tasks/taskLinkController.ts`, `apps/api/src/modules/tasks/taskLinkRoutes.ts`    | Supertest HTTP API                |
| **F2-CT-1** | Contracts | Shared types & Zod schemas                      | `packages/contracts/src/taskLink.ts`, `packages/contracts/src/index.ts`                               | `npm run typecheck`               |
| **F2-FE-1** | FE        | Panel Referensi & Tautan dengan Direct Redirect | `apps/web/src/components/ui/organisms/taskDetail/FeatureReferencesPanel.tsx`                          | Vitest Component Tests            |
| **F2-FE-2** | FE        | Integrasi Galeri Media & YouTube Embed          | `apps/web/src/components/ui/organisms/taskDetail/FeatureMediaGallery.tsx`, `TaskAttachmentsPanel.tsx` | Vitest Component Tests            |
| **F2-FE-3** | FE        | Penempatan di Tahap PRD Feature                 | `apps/web/src/components/ui/organisms/taskDetail/FeatureStagePanels.tsx`                              | Responsive & Theme check          |
| **F2-FE-4** | FE        | Tampilan Baca-Saja di Desk Subtask              | `apps/web/src/components/ui/organisms/taskDetail/SubtaskDetailPanel.tsx`                              | Permission UI tests               |
| **F2-QA-1** | QA        | Test suite PostgreSQL & E2E Verification        | `apps/api/src/modules/tasks/__tests__/taskLinksIntegration.test.ts`                                   | Disposable PostgreSQL test report |

## 4. Batasan Approval Window Implementasi (Diajukan)

- Pelaksanaan runtime code baru dapat dimulai setelah persetujuan eksplisit G0–G3 oleh Owner.
- Runtime changes terbatas hanya pada file-file yang tercantum pada tabel task di atas.
- Tidak ada penghapusan data, tidak ada mutasi tabel lain, dan tidak ada bypass otorisasi.
- Kompresi gambar dilakukan di browser sebelum upload untuk menjaga performa serverless.
- Stop condition: Bila terjadi konflik skema, kegagalan migrasi bersih, atau kebutuhan perubahan skema di luar `task_links`, proses wajib dihentikan dan dilaporkan kepada Owner.
