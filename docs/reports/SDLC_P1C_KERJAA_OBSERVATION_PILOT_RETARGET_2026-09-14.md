## Task

SDLC-P1C-KERJAA-OBSERVATION-PILOT — memindahkan target pilot observasi P1A/P1B empat minggu dari
Workspace development `essensial` ke `kerjaa` tanpa mengaktifkan hard gate.

## Outcome

Instruksi pengguna 14 September 2026 menetapkan Workspace development `kerjaa` sebagai target pilot
baru. Workspace aktif tersebut ditemukan dengan nama dan slug `kerjaa`. Audit baca-saja tidak
mengubah record apa pun dan menemukan bahwa kohor belum siap: hanya terdapat satu Owner aktif,
tanpa anggota Development atau QA, root Feature, Subtask, Requirement/Acceptance Criteria, Product
Brief, review kesiapan, baseline, atau Temuan Requirement.

Pilot tetap berstatus blocked. Setelah peserta dan Feature nyata tersedia, tanggal mulai baru harus
ditetapkan secara eksplisit agar jendela observasi empat minggu tidak dipendekkan. Laporan kickoff
Workspace `essensial` tetap dipertahankan sebagai histori keputusan sebelumnya, bukan status aktif.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md),
  [Workflow](../2_WORKFLOW_AND_ROLES.md),
  [ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md),
  [rencana SDLC](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md), dan
  [Feature Card](../features/SDLC_QUALITY_AND_RELEASE.md).
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-002`,
  `FLOW-005`, `QA-005`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`, `TEST-001`,
  `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** tidak ada. Audit hanya membaca agregat database development dan tidak
  membuat atau mengubah anggota, Task, Requirement, dokumen, review, baseline, maupun temuan.
- **Authorization impact:** tidak ada. Batas peran P1A/P1B dan kewajiban assignee Development/QA
  tetap mengikuti policy backend yang ada.
- **Migration risk:** tidak ada migrasi baru atau eksekusi migrasi; additive migration 67–69 yang
  sudah `up` tetap menjadi fondasi mode observasi.

## Changed files

- `TODO.md` — mengganti target aktif P1C dan mencatat blocker faktual Workspace `kerjaa`.
- `docs/plans/SDLC_QUALITY_AND_RELEASE_PLAN.md` — menyelaraskan target serta langkah pertama pilot.
- `docs/features/SDLC_QUALITY_AND_RELEASE.md` — memperbarui status Feature Card dan baseline target.
- `docs/reports/SDLC_P1C_KERJAA_OBSERVATION_PILOT_RETARGET_2026-09-14.md` — mencatat keputusan,
  audit baca-saja, dan handoff.

## Validation

- Daftar Workspace development baca-saja — menemukan tepat satu Workspace aktif bernama `kerjaa`
  dengan slug `kerjaa`.
- Audit agregat Sequelize baca-saja pada Workspace `kerjaa` — anggota aktif: Owner 1, Admin 0,
  Product Owner 0, Developer 0, QA 0; root Feature 0; Subtask 0; Requirement aktif 0; Acceptance
  Criteria aktif 0; Product Brief 0; review kesiapan 0; baseline 0; Temuan Requirement 0.
- `npm run docs:check` — lulus 5/5 test governance, 0 gagal dan 0 dilewati; validasi tautan dan
  policy registry lulus.
- `git diff --check` — lulus tanpa whitespace error.

## Risks or follow-up

- **Blocker:** Owner perlu menambahkan anggota Product/Development/QA nyata sesuai kebutuhan kohor,
  membuat root Feature pilot nyata, serta membuat dan menugaskan Subtask Development dan QA.
- Planner kemudian perlu menyetujui Product Brief, menautkan minimal satu Requirement aktif dengan
  Acceptance Criteria aktif, meminta review kesiapan Development dan QA, lalu menetapkan baseline.
- Jangan membuat identitas, histori, Test Result, atau bukti QA palsu untuk membuka blocker.
- Tanggal mulai pilot lama tidak dibawa ke target baru; tetapkan jendela empat minggu setelah semua
  prasyarat tersedia.

## TODO update

- `SDLC-P1C-KERJAA-OBSERVATION-PILOT` → `Blocked`.
