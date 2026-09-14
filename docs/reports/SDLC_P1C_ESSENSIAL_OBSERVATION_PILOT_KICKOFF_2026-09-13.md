## Task

SDLC-P1C-ESSENSIAL-OBSERVATION-PILOT — menyiapkan pilot P1A/P1B empat minggu pada Workspace
development `essensial` tanpa mengaktifkan hard gate.

## Outcome

Workspace aktif bernama `essensial` telah dicocokkan pada database development. Migrasi additive
67–69 berhasil diterapkan sehingga schema Development kini mendukung penambahan anggota lintas
Workspace, baseline kesiapan P1A, dan Temuan Requirement/triage P1B.

Audit awal tidak mengarang atau mengubah histori. Pilot belum dinyatakan mulai karena kohor belum
memiliki peserta QA: Workspace memiliki satu Owner dan satu Developer, tanpa anggota QA. Satu root
Feature masih berstatus `todo`, memiliki dua Subtask Development yang sudah ditugaskan, tetapi belum
memiliki Ringkasan Produk disetujui, Requirement/Acceptance Criteria tertaut, review kesiapan,
baseline, atau Temuan Requirement. Periode 13 September–11 Oktober 2026 tetap periode yang
direncanakan; jam observasi yang sah belum berjalan sampai prasyarat lintas peran tersedia.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md),
  [Workflow](../2_WORKFLOW_AND_ROLES.md),
  [ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md),
  [rencana SDLC](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md), dan
  [Feature Card](../features/SDLC_QUALITY_AND_RELEASE.md).
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-002`,
  `FLOW-005`, `QA-005`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`, `TEST-001`,
  `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** tiga migrasi additive yang sudah ada diterapkan pada database
  development. Tidak ada record bisnis pilot, baseline, review, temuan, anggota, atau Task yang
  dibuat/diubah oleh audit ini.
- **Authorization impact:** tidak ada perubahan. Owner tetap dapat mewakili kelompok Product dan
  menetapkan baseline; review QA tetap memerlukan anggota QA aktif yang menjadi assignee Subtask QA.
- **Migration risk:** Development bergerak dari migrasi 66 ke 69. Migrasi 67–69 lulus tanpa error;
  tidak ada down migration. Preview dan Production tidak disentuh.

## Changed files

- `TODO.md` — mencatat P1C sebagai blocked beserta prasyarat konkret.
- `docs/plans/SDLC_QUALITY_AND_RELEASE_PLAN.md` — mencatat hasil preflight pilot Essensial tanpa
  mengubah kebijakan enforcement.
- `docs/features/SDLC_QUALITY_AND_RELEASE.md` — menyelaraskan status implementasi dan pilot.
- `docs/reports/SDLC_P1C_ESSENSIAL_OBSERVATION_PILOT_KICKOFF_2026-09-13.md` — bukti kickoff dan
  baseline kelengkapan awal.

## Validation

- Pencocokan Workspace development baca-saja — menemukan tepat satu Workspace aktif bernama
  `essensial`; pencarian awal berdasarkan slug tidak cocok karena slug kanonikalnya berbeda.
- Status migrasi development sebelum perubahan — migrasi 1–66 `up`; migrasi 67, 68, dan 69 `down`.
- `NODE_ENV=development npm run db:migrate --workspace=@qlick/api` — lulus; migrasi 67, 68, dan 69
  diterapkan secara berurutan tanpa error.
- Status migrasi development setelah perubahan — migrasi 67, 68, dan 69 seluruhnya `up`.
- Audit agregat P1A/P1B pada Workspace `essensial` — 1 root Feature (`todo`), 0/1 Ringkasan Produk
  disetujui, 0/1 Feature dengan Requirement aktif, 0/1 dengan Acceptance Criteria lengkap, 0/1
  review Development siap, 0/1 review QA siap, 0 baseline, 0 temuan terbuka, dan 0 temuan kritis.
- Audit peran/penugasan — anggota aktif: Owner 1, Developer 1, QA 0; Subtask aktif: Backend 1/1
  ditugaskan dan Mobile 1/1 ditugaskan, tanpa Subtask QA.
- Tidak ada tes aplikasi yang diulang karena source runtime tidak berubah pada task kickoff ini;
  P1A/P1B sebelumnya lulus 419/419 API, 69/69 kontrak, dan 438/438 frontend.

## Risks or follow-up

- **Blocker:** Owner perlu menambahkan minimal satu anggota QA aktif dan membuat/menugaskan satu
  Subtask QA pada Feature pilot. Agen tidak memilih atau membuat identitas pegawai palsu.
- Setelah peserta lengkap, Planner perlu menyetujui Ringkasan Produk, menautkan minimal satu
  Requirement aktif dengan Acceptance Criteria aktif, lalu meminta review kesiapan Development dan
  QA sebelum menetapkan baseline.
- Setelah baseline tercatat, tim memakai Temuan Requirement untuk gap nyata selama observasi.
  Hard gate tetap nonaktif sampai review kelengkapan Product–Development–QA selesai.
- Bila blocker melewati tanggal mulai, periode empat minggu perlu digeser agar sampel tidak
  dipendekkan diam-diam.

## TODO update

- `SDLC-P1C-ESSENSIAL-OBSERVATION-PILOT` → `Blocked`.
