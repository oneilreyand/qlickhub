## Task

SDLC-P1B-REQUIREMENT-FINDING-TRIAGE — Temuan Requirement, klarifikasi, triage lintas peran,
keputusan berversi, dan riwayat penyelesaian dalam mode observasi.

## Outcome

Root Feature kini memiliki panel Temuan Requirement pada tab Requirement. Anggota aktif dapat
mencatat kekurangan yang menunjuk Requirement dalam cakupan Feature, menambahkan klarifikasi, dan
merekam posisi sesuai kelompok Product, Development, atau QA. Jika tiga posisi terbaru sama,
backend membuat konsensus deterministik; bila berbeda, hanya Owner/Admin yang dapat mencatat
keputusan tata kelola dan seluruh posisi yang tidak sepakat tetap tersimpan.

Keputusan triage memiliki versi dan mengacu tepat pada tiga posisi yang mendasarinya. Planner dapat
menandai temuan selesai atau membukanya kembali dengan alasan, tetapi penyelesaian hanya diterima
bila keputusan masih sesuai posisi terbaru. Temuan kritis terbuka ditampilkan sebagai penghalang
pekerjaan baru menurut kebijakan, namun P1B masih observasi dan belum menolak transisi Subtask.
Klarifikasi tidak membuat Test Result atau Bug palsu dan klasifikasi ditujukan untuk perbaikan
proses, bukan skor individu.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md),
  [Workflow](../2_WORKFLOW_AND_ROLES.md),
  [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md),
  [ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md), dan
  [Feature Card](../features/SDLC_QUALITY_AND_RELEASE.md).
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-002`,
  `FLOW-005`, `QA-005`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`, `UI-001`,
  `UI-002`, `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** satu kontrak bersama, lima tabel append-only, enam endpoint
  terotentikasi, lima jenis Task Activity, snapshot identitas Requirement, dan state agregat yang
  dihitung backend. Pembersihan permanen Workspace juga mencakup histori P1A/P1B.
- **Authorization impact:** semua anggota aktif dapat membaca, mencatat temuan/klarifikasi, dan
  menyampaikan posisi kelompoknya; hanya Owner/Admin dapat memutus sengketa; hanya
  Owner/Admin/PO dapat menyelesaikan atau membuka kembali temuan. Semua batas diterapkan backend.
- **Migration risk:** migrasi 69 additive dan non-destruktif. Migrasi membuat lima tabel, key
  komposit Workspace, foreign key, check, index, trigger immutable, dan memperluas guard
  soft-delete Task. Production belum dimigrasikan.

## Changed files

- `packages/contracts/src/requirementFinding.ts` — kontrak kategori, severity, penyebab, posisi,
  keputusan, histori status, kapabilitas, serta payload API.
- `apps/api/src/db/migrations/20260913000069-create-requirement-findings-and-triage.cjs` — skema
  additive, integritas Workspace, histori append-only, dan deletion guard.
- `apps/api/src/db/models/requirementFinding*.ts` — lima model Sequelize dan asosiasinya.
- `apps/api/src/modules/featureReadiness/requirementFindingService.ts` — scope Feature, triage,
  konsensus, sengketa, versioning, resolve/reopen, audit, dan agregasi state.
- `apps/api/src/modules/featureReadiness/featureReadinessController.ts` dan
  `featureReadinessRoutes.ts` — enam endpoint P1B terotentikasi.
- `apps/api/src/policies/featureReadinessPolicy.ts` — pemetaan kelompok triage dan otorisasi
  tata kelola/penyelesaian.
- `apps/api/src/modules/tasks/internal/taskDeletion.ts` dan
  `apps/api/src/modules/requirements/requirementService.ts` — perlindungan konteks temuan.
- `apps/api/src/modules/workspaces/internal/workspaceLifecycle.ts` — penghapusan permanen Workspace
  membersihkan histori P1A/P1B dalam urutan aman.
- `apps/api/src/modules/featureReadiness/__tests__/requirementFindingApiIntegration.test.ts` dan
  `apps/api/src/modules/workspaces/__tests__/workspacePermanentDeletionApiIntegration.test.ts` —
  bukti PostgreSQL untuk P1B dan kompatibilitas lifecycle Workspace.
- `apps/web/src/components/ui/organisms/RequirementFindingPanel.tsx` — panel observasi responsif,
  disclosure detail, peringatan kritis, form, state izin, loading/kosong/gagal, dan aksi triage.
- `apps/web/src/components/ui/organisms/taskDetail/TaskDetailSpecsTab.tsx` — menempatkan panel pada
  tab Requirement root Feature setelah panel kesiapan.
- `apps/web/src/lib/api/requirementFindingService.ts` dan `apiClient.ts` — adapter kontrak serta
  pesan konflik Indonesia yang dapat ditindaklanjuti.
- `apps/web/src/components/ui/organisms/__tests__/RequirementFindingPanel.test.tsx` — enam skenario
  rendering dan interaksi peran.
- `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/features/SDLC_QUALITY_AND_RELEASE.md`, dan
  `docs/plans/SDLC_QUALITY_AND_RELEASE_PLAN.md` — definisi, alur, lokasi UI, status, dan traceability.

## Validation

- `npm run db:verify:clean-migrations --workspace=@qlick/api` — lulus; 53 migrasi kanonikal
  diterapkan dari database PostgreSQL disposable yang kosong, termasuk migrasi 69.
- `npm run db:migrate:test --workspace=@qlick/api` — lulus; migrasi 69 diterapkan pada PostgreSQL
  test yang sudah memiliki histori migrasi sebelumnya.
- fokus `requirementFindingApiIntegration.test.ts` — 5/5 lulus, 0 gagal, 0 skip; membuktikan scope
  Requirement/Feature, isolasi Workspace, immutability, audit, klarifikasi, konsensus, dissent,
  governance, koreksi berversi, resolve/reopen, dan guard penghapusan pada PostgreSQL nyata.
- fokus `workspacePermanentDeletionApiIntegration.test.ts` — 2/2 lulus, 0 gagal, 0 skip; fixture
  memuat review P1A dan seluruh jenis histori P1B serta membuktikan penghapusan Workspace tetap
  lengkap dan mempertahankan akun pengguna.
- `npm test --workspace=@qlick/api` — 419/419 lulus dalam 96 suite, 0 gagal, 0 batal, 0 skip;
  PostgreSQL test. Log yang diharapkan: pengiriman FCM dilewati tanpa token perangkat dan SMTP
  tidak mengirim karena tidak dikonfigurasi pada test.
- `npm test --workspace=@qlick/contracts` — 69/69 lulus dalam 20 suite, 0 gagal, 0 skip.
- fokus `RequirementFindingPanel.test.tsx` — 6/6 lulus, 0 gagal, 0 skip.
- `npm test --workspace=@qlick/web` — 438/438 lulus pada 83 file, 0 gagal, 0 skip. Runner mencetak
  peringatan lama JSDOM navigation dan React `act(...)`; tidak berasal dari P1B.
- `npm run validate` — lulus: docs check 5/5 dan governance pass, type-check tiga Workspace lulus,
  lint 0 error dengan 22 warning lama di luar P1B.
- `npm run build` — lulus; contracts/API TypeScript dan frontend production build, 1.707 modul
  ditransformasi.
- `git diff --check` — lulus tanpa whitespace error.
- Browser lokal terotentikasi pada viewport 1.280×720 — lokasi panel, peringatan kritis, disclosure,
  tiga posisi lintas peran, keputusan sengketa, klarifikasi, aksi sesuai izin, scroll drawer, dan
  kontras light/dark diperiksa. Layout ponsel memakai satu kolom default, beralih menjadi dua/tiga
  kolom hanya mulai breakpoint `sm`, dan target disclosure minimum 48 px; interaksi serta markup
  responsif tercakup pada tes komponen. Fixture PostgreSQL dan server lokal dibersihkan sesudahnya.

## Risks or follow-up

- P1B tetap mode observasi. Hard gate Subtask, ambang enforcement, durasi pilot, retensi histori,
  dan akses analitik individu menunggu keputusan P1C berbasis hasil pilot.
- UAT pada perangkat ponsel fisik tetap menjadi follow-up rollout; tidak diperlukan untuk
  mengaktifkan mode observasi lokal.
- Belum ada commit, deployment, migrasi Production, atau mutasi data Production pada task ini.

## TODO update

- `SDLC-P1B-REQUIREMENT-FINDING-TRIAGE` → `Done`.
