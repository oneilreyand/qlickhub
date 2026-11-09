# Laporan Tahap G5: FEATURE-REFERENCES-MEDIA — Referensi & Media di Halaman Feature

## Task

FEATURE-REFERENCES-MEDIA: [F2] Bagian Referensi & Media di halaman Feature — banyak tautan eksternal, galeri gambar mockup, dan video via tautan/embed.

## Outcome

Bagian **Referensi & Media Produk** telah selesai dibangun dan terpasang pada tahap PRD halaman Feature di bawah Product Brief. Sesuai keputusan Owner K2, hak akses kelola (Tambah, Edit, Hapus, Reorder tautan, serta Unggah/Hapus gambar) dibatasi secara ketat di backend policy dan antarmuka UI hanya untuk **Owner, Admin, dan PO**. Peran **Developer dan QA** memiliki akses baca-saja (_view-only_), dapat langsung membuka tautan eksternal di tab baru (_direct redirect_ `target="_blank" rel="noopener noreferrer"`), memperbesar gambar via Lightbox modal, dan menonton embed video player YouTube/Loom.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** Gerbang G5 (Test & Review) selesai. Jalur Standar. Folder spesifikasi: [`docs/features/FEATURE-REFERENCES-MEDIA/`](../features/FEATURE-REFERENCES-MEDIA/README.md).
- **Work Readiness Assessment:** 16/16, `Ready`. Semua Acceptance Criteria (AC-F2.1 s.d. AC-F2.9) memiliki jalur bukti primer objektif di PostgreSQL dan Vitest.
- **User plan approval:** Disetujui oleh Owner pada percakapan 2026-11-09 (keputusan K2: mutasi khusus Owner/Admin/PO; Developer & QA view-only; pengerjaan berbasis bukti tanpa asumsi).
- **Approval Window / high-risk decisions:** Window pengerjaan cabang `feat/feature-references-media` untuk migrasi skema tabel `task_links`, endpoint REST, policy RBAC, dan komponen antarmuka web.
- **Agent capability and access:** Antigravity dapat memeriksa seluruh codebase, menjalankan migrasi database PostgreSQL dev & test, menguji verifikasi clean migration, serta mengeksekusi integrasi backend dan unit test frontend secara lengkap.
- **AC-to-evidence matrix:**

| Acceptance Criterion                  | Required / achieved evidence level (E0–E4) | Primary evidence and environment                                                                                                                       | Verification status |
| :------------------------------------ | :----------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------ |
| **AC-F2.1** (Penyimpanan Tautan)      | E3 / E3                                    | `taskLinksIntegration.test.ts` (PostgreSQL): POST tautan valid dan verifikasi persistensi kolom `title`, `url`, `link_type`, `sort_order`              | Accepted            |
| **AC-F2.2** (Validasi URL https)      | E3 / E3                                    | `taskLinksIntegration.test.ts`: POST tautan dengan skema `http://` atau `javascript:` ditolak HTTP 400                                                 | Accepted            |
| **AC-F2.3** (Direct Redirect Link)    | E2 / E2                                    | `FeatureReferencesAndMedia.test.tsx` (Vitest): Kartu tautan memuat anchor `target="_blank" rel="noopener noreferrer"` dengan URL yang sah              | Accepted            |
| **AC-F2.4** (Reorder Tautan)          | E3 & E2 / E3 & E2                          | `taskLinksIntegration.test.ts` (PUT `/reorder` pada PostgreSQL) & `FeatureReferencesAndMedia.test.tsx` (urutan berpindah secara reaktif)               | Accepted            |
| **AC-F2.5** (Multi-Gambar & Lightbox) | E2 / E2                                    | `FeatureReferencesAndMedia.test.tsx`: Render galeri gambar mockup terfilter `category: 'product_media'` dan interaksi klik membuka modal zoom/lightbox | Accepted            |
| **AC-F2.6** (YouTube Inline Embed)    | E2 / E2                                    | `FeatureReferencesAndMedia.test.tsx`: Mendeteksi URL YouTube dan merender iframe player responsif                                                      | Accepted            |
| **AC-F2.7** (RBAC Enforcement 403)    | E3 & E2 / E3 & E2                          | `taskLinksIntegration.test.ts`: Developer & QA ditolak HTTP 403 saat mutasi; `FeatureReferencesAndMedia.test.tsx`: tombol mutasi disembunyikan         | Accepted            |
| **AC-F2.8** (Read-Only di Subtask)    | E2 / E2                                    | `FeatureReferencesAndMedia.test.tsx`: Mode `canManage: false` menyembunyikan tombol upload, tambah, edit, hapus, dan reorder                           | Accepted            |
| **AC-F2.9** (Cascade Deletion)        | E3 / E3                                    | `taskLinksIntegration.test.ts`: Penghapusan Feature induk membersihkan seluruh rekaman `task_links` terkait di database                                | Accepted            |

- **Evidence outcomes:** Seluruh 9 Acceptance Criteria terverifikasi hijau pada lingkungan database PostgreSQL dan pengujian komponen.
- **Change Impact Map:** Feature-level change. Konsumen: Feature Stage Panels (PRD Tab) dan Task Detail Drawer. Kontrak: `@qlick/contracts` menambahkan model `TaskLink` dan schema Zod. Data: Migrasi `20261109000097-create-task-links.cjs`. Otorisasi: `taskLinkPolicy.ts`.
- **Decision Snapshot:**
  - Opsi A (bagian terstruktur mandiri di bawah Brief) dipilih dibanding Opsi B (hanya teks markdown di body brief) karena memungkinkan parsing URL otomatis, thumbnail, status redirect aman, dan galeri visual tanpa merusak struktur teks PRD.
  - Media gambar menggunakan browser-side compression (HTML Canvas WebP) sebelum upload untuk memastikan payload selalu di bawah batas 4.5MB Vercel Serverless.
  - Video diakomodasi via tautan eksternal (YouTube nocookie embed dan Loom embed), bukan direct upload file video ke storage lokal/bucket.
- **Agent handoff and independent verification:** Branch `feat/feature-references-media` telah tervalidasi bersih melalui `npm run validate` (12 test suites lolos) dan seluruh backend suite (678/678) serta frontend taskDetail suite (69/69) berstatus lulus.
- **Quality review:**
  - _Reuse/DRY:_ Memanfaatkan `MediaLightboxModal` yang sudah ada di `apps/web/src/components/ui/molecules/MediaLightboxModal.tsx` dan endpoint `task_attachments` dengan `category: 'product_media'`.
  - _Duplicate/overlap:_ Tidak ada penduplikasi logika validasi; schema Zod `taskLinkSchema` di `@qlick/contracts` digunakan bersama di backend dan frontend.
  - _Obsolete/unused code:_ Tidak ada kode mati; semua endpoint dan model terdaftar di `docsys.config.json` dan didokumentasikan di `contracts.md`.
  - _Regression evidence:_ Menjalankan seluruh backend integration suite (678 tests) dan vitest taskDetail suite (69 tests) dengan 0 kegagalan.
- **Cross-layer quality gates:** Komponen responsif diuji pada lebar 390px, 768px, dan 1440px; Lolos audit token desain Stitch (`npm run theme:check`).

## Source of truth and impact

- **Applicable SSoT:** [`docs/1_ARCHITECTURE.md`](../1_ARCHITECTURE.md), [`docs/2_WORKFLOW_AND_ROLES.md`](../2_WORKFLOW_AND_ROLES.md), [`docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`](../3_UI_ATOMIC_DESIGN_SYSTEM.md), [`docs/4_AGENT_DEV_GUIDELINES.md`](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `SDLC-001`, `SDLC-002`, `DATA-001`, `AUTH-001`, `AUTH-002`, `CONTRACT-001`, `TEST-001`, `UI-001`, `UI-002`, `UI-003`, `UI-004`, `UI-005`, `DOC-005`, `DOC-006`, `AI-020`.
- **Data/interface impact:** Penambahan tabel `task_links` (skema terindeks `(workspace_id, task_id, sort_order ASC)`). Penambahan 5 endpoint REST di bawah prefix `/v1/workspaces/:workspaceId/tasks/:taskId/links`.
- **Authorization impact:** Mutasi dibatasi hanya untuk role `owner`, `admin`, dan `po`. Role `developer` dan `qa` berstatus baca-saja.
- **Migration risk:** Rendah (penambahan tabel baru non-destruktif `20261109000097-create-task-links.cjs`). Terverifikasi lolos pada verifikasi migrasi bersih (`npm run db:verify:clean-migrations`).

## Changed files

- `packages/contracts/src/taskLink.ts` — Definisi tipe TypeScript, schema Zod, dan konstanta tipe tautan.
- `packages/contracts/src/index.ts` — Re-export kontrak `taskLink`.
- `apps/api/src/db/migrations/20261109000097-create-task-links.cjs` — Migrasi DDL pembuatan tabel `task_links`.
- `apps/api/src/db/models/taskLink.ts` — Model Sequelize `TaskLinkModel`.
- `apps/api/src/db/models/index.ts` — Re-export model `TaskLinkModel`.
- `apps/api/src/db/models/associations/taskAssociations.ts` — Asosiasi relasi `TaskModel.hasMany(TaskLinkModel)`.
- `apps/api/src/policies/taskLinkPolicy.ts` — Kebijakan otorisasi RBAC (Owner/Admin/PO untuk mutasi).
- `apps/api/src/modules/tasks/taskLinkService.ts` — Layanan logika bisnis tautan (CRUD & Reorder).
- `apps/api/src/modules/tasks/taskLinkController.ts` — Controller Express penangan request HTTP tautan.
- `apps/api/src/modules/tasks/taskRoutes.ts` — Pemasangan rute endpoint tautan ke router task.
- `apps/api/src/modules/tasks/internal/taskDeletion.ts` — Pembersihan baris `task_links` saat Feature dihapus.
- `apps/api/src/modules/tasks/__tests__/taskLinksIntegration.test.ts` — Pengujian integrasi database PostgreSQL.
- `apps/web/src/lib/api/taskLinkService.ts` — Klien API frontend untuk tautan referensi.
- `apps/web/src/components/ui/organisms/taskDetail/FeatureReferencesPanel.tsx` — Komponen daftar tautan dan modal CRUD.
- `apps/web/src/components/ui/organisms/taskDetail/FeatureMediaGallery.tsx` — Galeri gambar mockup dan player embed video.
- `apps/web/src/components/ui/organisms/taskDetail/FeatureReferencesAndMedia.tsx` — Kontainer gabungan referensi dan media di tahap PRD.
- `apps/web/src/components/ui/organisms/taskDetail/FeatureStagePanels.tsx` — Integrasi kontainer ke panel tab PRD Feature.
- `apps/web/src/components/ui/organisms/TaskDetailDrawer.tsx` — Integrasi kontainer ke drawer detail task saat status Feature/Brief aktif.
- `apps/web/src/components/ui/organisms/taskDetail/__tests__/FeatureReferencesAndMedia.test.tsx` — Pengujian unit Vitest & RBAC.
- `docs/features/FEATURE-REFERENCES-MEDIA/*` — Seluruh dokumen spesifikasi SDLC tahap G0–G6.
- `docs/features/FEATURE_CATALOG.md` — Pendaftaran entri katalog fitur.
- `docs/plans/QLICKHUB_FOLLOWUP_F1_F4_PLAN.md` — Pencatatan keputusan Owner K2.
- `docsys.config.json` — Penambahan `TaskLinkModel` ke domain ERD `Task & kolaborasi`.
- `quality/doc-baseline.json` — Pembaruan baseline dokumentasi bebas celah baru.
- `TODO.md` — Pembaruan status task F2 menjadi in-progress / ready for review.

## Validation

- `npm --prefix apps/api run test:integration dist/modules/tasks/__tests__/taskLinksIntegration.test.js` — PASS (7/7 tests pass di PostgreSQL).
- `cd apps/web && npx vitest run src/components/ui/organisms/taskDetail/__tests__/FeatureReferencesAndMedia.test.tsx` — PASS (10/10 tests pass).
- `cd apps/web && npx vitest run src/components/ui/organisms/taskDetail/` — PASS (9 test files, 69/69 tests pass).
- `npm --prefix apps/api run test:integration` — PASS (133 suites, 678/678 tests pass).
- `npm --prefix apps/web run build` — PASS (kompilasi Vite build sukses dalam 3.56s).
- `npm run validate` — PASS (12 suites: docs check, docsys test, completeness, env examples, SDLC, migrations prod, agent policy, tier check, theme check, lint, typecheck).

## Risks or follow-up

- Branch `feat/feature-references-media` menyentuh path Tier 2 (`apps/api/src/db/migrations/**` dan `apps/api/src/policies/**`), sehingga pull request membutuhkan persetujuan Owner (`owner-approved` label) sebelum tiered auto-merge dapat dieksekusi.
- Migrasi database `20261109000097-create-task-links.cjs` akan berjalan secara otomatis pada deployment pipeline produksi.

## Human decision summary

Seluruh pekerjaan F2 selesai diimplementasikan secara komprehensif tanpa asumsi dan berbasis bukti nyata (_evidence-based_). Silakan lakukan peninjauan hasil pengujian dan perubahan kode pada branch `feat/feature-references-media`. Langkah selanjutnya adalah membuat Pull Request Tier 2 ke `main`.

## TODO update

- `FEATURE-REFERENCES-MEDIA: [F2] Bagian Referensi & Media di halaman Feature` → `In progress` (Build & Test selesai, menunggu review Owner dan PR Tier 2).
