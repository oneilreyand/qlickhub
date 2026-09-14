## Task

SDLC-P1C-KERJAA-OBSERVATION-PILOT — memindahkan target pilot observasi P1A/P1B empat minggu dari
Workspace development `essensial` ke `kerjaa` tanpa mengaktifkan hard gate.

## Outcome

Instruksi pengguna 14 September 2026 menetapkan Workspace development `kerjaa` sebagai target pilot
baru. Audit baca-saja awal menemukan Workspace tersebut masih kosong selain satu Owner. Audit ulang
pada database Production kemudian mengonfirmasi data nyata telah ditambahkan: satu Owner, satu
Developer, satu QA, root Feature `billing v3`, tiga Subtask, dua Requirement aktif beserta Acceptance
Criteria aktif, dan Product Brief utama versi 1 yang approved.

Kohor dan artefak planning dasar kini tersedia, tetapi pilot tetap berstatus blocked karena belum
ada review kesiapan Developer/QA maupun baseline Feature. Assignee Developer dan QA harus mengirim
review mereka sendiri melalui panel **Kesiapan Feature**, kemudian Owner menetapkan baseline normal
bila kelima pemeriksaan backend lulus. Tanggal mulai dan akhir empat minggu ditetapkan eksplisit
setelah baseline tersedia, tanpa backdate. Laporan kickoff Workspace `essensial` tetap dipertahankan
sebagai histori keputusan sebelumnya, bukan status aktif.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md),
  [Workflow](../2_WORKFLOW_AND_ROLES.md),
  [ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md),
  [rencana SDLC](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md), dan
  [Feature Card](../features/SDLC_QUALITY_AND_RELEASE.md).
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-002`,
  `FLOW-005`, `QA-005`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`, `TEST-001`,
  `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** tidak ada. Audit hanya membaca agregat database Production dan tidak
  membuat atau mengubah anggota, Task, Requirement, dokumen, review, baseline, maupun temuan.
- **Authorization impact:** tidak ada. Batas peran P1A/P1B dan kewajiban assignee Development/QA
  tetap mengikuti policy backend yang ada.
- **Migration risk:** tidak ada migrasi baru atau eksekusi migrasi; additive migration 67–69 yang
  sudah `up` tetap menjadi fondasi mode observasi.

## Changed files

- `TODO.md` — mencatat kelengkapan kohor terbaru dan blocker review/baseline.
- `docs/plans/SDLC_QUALITY_AND_RELEASE_PLAN.md` — menyelaraskan status Production serta langkah
  berikutnya untuk memulai pilot.
- `docs/features/SDLC_QUALITY_AND_RELEASE.md` — memperbarui status Feature Card dengan bukti terbaru.
- `docs/reports/SDLC_P1C_KERJAA_OBSERVATION_PILOT_RETARGET_2026-09-14.md` — mencatat keputusan,
  audit baca-saja, dan handoff.

## Validation

- Audit PostgreSQL baca-saja menggunakan alias database Production eksplisit — menemukan tepat satu
  Workspace aktif bernama dan berslug `kerjaa`; transaksi diakhiri tanpa commit data bisnis.
- Audit kohor Production — anggota aktif: Owner 1, Admin 0, Product Owner 0, Developer 1, QA 1;
  root Feature 1 (`billing v3`); Subtask 3, termasuk satu Development yang ditugaskan kepada
  Developer dan satu QA yang ditugaskan kepada QA.
- Audit artefak Feature `billing v3` — dua Requirement aktif, masing-masing memiliki satu Acceptance
  Criterion aktif; satu Product Brief utama versi 1 berstatus approved; review kesiapan 0; baseline
  0; Temuan Requirement 0.
- `npm run docs:check` — lulus 5/5 test governance, 0 gagal dan 0 dilewati; validasi tautan dan
  policy registry lulus.
- `git diff --check` — lulus tanpa whitespace error.

## Risks or follow-up

- **Blocker:** assignee Developer dan QA perlu mengirim review kesiapan mereka sendiri pada Feature
  `billing v3`; identitas dan pendapat review tidak boleh diwakili atau direkayasa oleh agen.
- Setelah kedua review tersedia, Owner perlu menetapkan baseline normal melalui UI bila kelima
  pemeriksaan backend lulus.
- Jangan membuat identitas, histori, Test Result, atau bukti QA palsu untuk membuka blocker.
- Tanggal mulai pilot lama tidak dibawa ke target baru; tetapkan jendela empat minggu setelah
  baseline tersedia, tanpa backdate.

## TODO update

- `SDLC-P1C-KERJAA-OBSERVATION-PILOT` → `Blocked`.
