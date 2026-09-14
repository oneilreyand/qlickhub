## Task

SDLC-P1A-FEATURE-READINESS-BASELINE — masukan kesiapan Development/QA dan baseline Feature
append-only dalam mode observasi.

## Outcome

Root Feature kini memiliki panel kesiapan yang menyatukan lima pemeriksaan backend: Product Brief
disetujui, Requirement aktif tersedia tanpa tautan draft/deprecated, setiap Requirement aktif
memiliki Kriteria Penerimaan aktif, serta masukan terbaru Development dan QA sama-sama siap.

Dev dan QA hanya dapat menambahkan masukan jika menjadi assignee Subtask sesuai area. Planner dapat
membuat baseline normal setelah semua pemeriksaan lulus; Owner/Admin dapat memakai pengecualian
sementara dengan alasan dan batas waktu. Review serta baseline bersifat append-only, perubahan acuan
atau pergantian assignee membuat baseline terbaca usang, dan riwayat terkait melindungi Task serta
Requirement dari penghapusan. Mode ini belum menghalangi pembuatan atau dimulainya Subtask.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md),
  [Workflow](../2_WORKFLOW_AND_ROLES.md),
  [UI Design System](../3_UI_ATOMIC_DESIGN_SYSTEM.md),
  [ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md), dan
  [Feature Card](../features/SDLC_QUALITY_AND_RELEASE.md).
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-002`,
  `FLOW-005`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`, `UI-001`, `UI-002`,
  `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** kontrak `featureReadiness`, tiga endpoint Workspace-scoped, dua record
  append-only, satu relasi baseline–Requirement, snapshot JSON tervalidasi, dan dua Task Activity.
- **Authorization impact:** read untuk anggota aktif; review untuk assignee Dev/QA yang sesuai;
  baseline normal untuk Owner/Admin/PO; pengecualian hanya Owner/Admin.
- **Migration risk:** migrasi 68 additive dan non-destruktif. Migrasi menambah unique key komposit
  pada versi QA Document, tiga tabel, foreign key Workspace, index, trigger immutable, serta
  memperluas guard soft-delete Task. Production belum dimigrasikan.

## Changed files

- `packages/contracts/src/featureReadiness.ts` — kontrak state, review, baseline, snapshot, dan input.
- `apps/api/src/db/migrations/20260913000068-create-feature-readiness-baselines.cjs` — skema additive,
  integritas Workspace, immutability, dan deletion guard.
- `apps/api/src/db/models/featureReadiness*.ts` — model Sequelize dan relasi baseline–Requirement.
- `apps/api/src/modules/featureReadiness/` — policy-backed state, review, baseline, staleness, API,
  serta pengujian PostgreSQL.
- `apps/api/src/modules/tasks/internal/taskDeletion.ts` dan
  `apps/api/src/modules/requirements/requirementService.ts` — perlindungan bukti readiness.
- `apps/web/src/components/ui/organisms/FeatureReadinessPanel.tsx` — panel observasi yang responsif
  dan role-aware pada detail root Feature.
- `apps/web/src/lib/api/featureReadinessService.ts` — adapter API tervalidasi kontrak.
- `apps/web/src/lib/api/apiClient.ts` — pesan konflik readiness yang dapat ditindaklanjuti.
- `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/features/SDLC_QUALITY_AND_RELEASE.md`, dan `docs/plans/SDLC_QUALITY_AND_RELEASE_PLAN.md` —
  status enforcement dan traceability P1A.

## Validation

- `npm --prefix apps/api run db:verify:clean-migrations` — lulus; 52 migrasi kanonikal diterapkan
  dari database PostgreSQL disposable yang kosong, termasuk migrasi 68.
- `npm --prefix apps/api run db:migrate:test` — lulus; migrasi 68 diterapkan pada PostgreSQL test.
- fokus `featureReadinessApiIntegration.test.ts` — 6/6 lulus, 0 gagal, 0 skip; membuktikan RBAC,
  cross-Workspace isolation, validasi, append-only, baseline normal/pengecualian, staleness,
  reassignment, audit, serta deletion guard terhadap PostgreSQL nyata.
- `npm --prefix apps/api run test:integration` — 414/414 lulus dalam 95 suite, 0 gagal, 0 skip;
  PostgreSQL test.
- `npm --prefix packages/contracts run test` — 67/67 lulus dalam 19 suite, 0 gagal, 0 skip.
- `npm --prefix apps/web run test` — 431/431 lulus pada 82 file, 0 gagal, 0 skip. Runner mencetak
  peringatan lama JSDOM navigation dan React `act(...)`; tidak berasal dari panel P1A.
- fokus `FeatureReadinessPanel.test.tsx` — 5/5 lulus, 0 gagal, 0 skip.
- `npm run validate` — lulus: docs check 5/5 dan governance pass, type-check tiga Workspace lulus,
  lint 0 error dengan 22 warning lama di luar P1A.
- `npm run build` — lulus; contracts/API TypeScript dan frontend production build, 1.704 modul
  ditransformasi.
- `git diff --check` — lulus tanpa whitespace error.
- Browser lokal terotentikasi pada viewport 1.280×720 — panel, fokus tab, state kosong, pemeriksaan,
  form pengecualian, scroll drawer, serta kontras light/dark diperiksa tanpa error browser. Layout
  ponsel memakai satu kolom default dan beralih menjadi dua kolom hanya pada breakpoint `sm`;
  interaksi dan markup responsif tercakup pada tes komponen. Fixture PostgreSQL dan server lokal
  dibersihkan setelah pemeriksaan.

## Risks or follow-up

- P1A adalah observasi; hard gate untuk memulai Subtask menunggu pilot, remediasi data, dan keputusan
  rollout. P1b untuk temuan/klarifikasi/triage formal belum diimplementasikan.
- Belum ada deployment, status migrasi, atau smoke test Production pada task ini.
- UAT perangkat ponsel fisik tetap menjadi follow-up rollout; tidak diperlukan untuk mengaktifkan
  mode observasi lokal ini.

## TODO update

- `SDLC-P1A-FEATURE-READINESS-BASELINE` → `Done`.
