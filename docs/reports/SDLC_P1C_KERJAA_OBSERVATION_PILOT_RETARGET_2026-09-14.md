## Task

SDLC-P1C-KERJAA-OBSERVATION-PILOT — memindahkan target pilot observasi P1A/P1B empat minggu dari
Workspace development `essensial` ke `kerjaa` tanpa mengaktifkan hard gate.

## Outcome

Instruksi pengguna 14 September 2026 menetapkan Workspace development `kerjaa` sebagai target pilot
baru. Audit baca-saja awal menemukan Workspace tersebut masih kosong selain satu Owner. Audit ulang
pada database Production kemudian mengonfirmasi data nyata telah ditambahkan: satu Owner, satu
Developer, satu QA, root Feature `billing v3`, tiga Subtask, dua Requirement aktif beserta Acceptance
Criteria aktif, dan Product Brief utama versi 1 yang approved.

Kohor dan artefak planning dasar kini tersedia. Atas persetujuan eksplisit pengguna, Subtask QA
`test billing v3` dipindahkan dari assignee QA lama ke akun QA Production baru
`mandorreyand01@gmail.com`. Mutasi atomik mempertahankan role/delivery area, mencatat Activity
perubahan assignee, dan membuat notifikasi in-app. Smoke test terotentikasi kemudian membuktikan
login `200`, role `qa`, readiness `200`, `canSubmitReview: true`, dan `reviewRole: qa`; sesi uji
diakhiri melalui logout tanpa mengirim review. Pengguna kemudian menyetujui rekomendasi `ready` dan
catatan “QA menyatakan Feature siap untuk memulai pilot observasi empat minggu.” API Production
menyimpan review tersebut sebagai identitas QA yang terautentikasi dan state readiness membacanya
kembali sebagai review QA terbaru.

Pilot tetap berstatus blocked karena belum ada review kesiapan Developer maupun baseline Feature.
Assignee Developer harus mengirim reviewnya sendiri melalui panel **Kesiapan Feature**, kemudian
Owner menetapkan baseline normal bila kelima pemeriksaan backend lulus. Tanggal mulai dan akhir empat
minggu ditetapkan eksplisit setelah baseline tersedia, tanpa backdate. Laporan kickoff Workspace
`essensial` tetap dipertahankan sebagai histori keputusan sebelumnya, bukan status aktif.

## Source of truth and impact

- **Applicable SSoT:** [Architecture](../1_ARCHITECTURE.md),
  [Workflow](../2_WORKFLOW_AND_ROLES.md),
  [ADR-013](../adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md),
  [rencana SDLC](../plans/SDLC_QUALITY_AND_RELEASE_PLAN.md), dan
  [Feature Card](../features/SDLC_QUALITY_AND_RELEASE.md).
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-002`,
  `FLOW-005`, `QA-005`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`, `TEST-001`,
  `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** assignee satu Subtask QA Production berubah ke anggota QA baru; satu
  Activity perubahan assignee dan satu notifikasi in-app ditambahkan. Satu review QA append-only
  dengan rekomendasi/catatan yang disetujui pengguna juga ditambahkan. Tidak ada perubahan Feature,
  Requirement, dokumen, baseline, temuan, Test Result, kontrak, atau schema.
- **Authorization impact:** akun QA baru kini menjadi assignee Subtask QA dan backend readiness
  mengizinkannya mengirim review QA. Batas peran P1A/P1B lainnya tidak berubah.
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
- Audit kohor Production — anggota aktif setelah provisioning: Owner 1, Admin 0, Product Owner 0,
  Developer 1, QA 2;
  root Feature 1 (`billing v3`); Subtask 3, termasuk satu Development yang ditugaskan kepada
  Developer dan satu QA yang ditugaskan kepada QA.
- Audit artefak Feature `billing v3` — dua Requirement aktif, masing-masing memiliki satu Acceptance
  Criterion aktif; satu Product Brief utama versi 1 berstatus approved; review kesiapan 0; baseline
  0; Temuan Requirement 0.
- Transaksi reassignment Production terarah — lulus; tepat satu Subtask QA `todo` berpindah dari
  assignee lama ke akun QA baru, dengan Activity `subtask.assigneeId_updated` dan notifikasi
  `assignment` persisten. Tidak ada review yang tersedia saat guard reassignment diperiksa.
- Smoke test API Production terotentikasi — login `200`, readiness `200`, role akun `qa`,
  `canSubmitReview: true`, `reviewRole: qa`, `qaReviewExists: false`, `readyToBaseline: false`, dan
  logout `204`; 0 review/baseline dibuat.
- Pengiriman review QA melalui API Production — `201`; role review `qa`, rekomendasi `ready`, dan
  catatan yang disetujui pengguna kembali terbaca sebagai review QA terbaru. State sesudahnya:
  review Developer belum ada dan `readyToBaseline: false`; sesi ditutup kembali.
- `npm run docs:check` — lulus 5/5 test governance, 0 gagal dan 0 dilewati; validasi tautan dan
  policy registry lulus.
- `git diff --check` — lulus tanpa whitespace error.

## Risks or follow-up

- **Blocker:** assignee Developer perlu mengirim review kesiapan autentiknya pada Feature
  `billing v3`; identitas dan pendapat review Developer tidak boleh diwakili atau direkayasa oleh
  agen.
- Setelah kedua review tersedia, Owner perlu menetapkan baseline normal melalui UI bila kelima
  pemeriksaan backend lulus.
- Jangan membuat identitas, histori, Test Result, atau bukti QA palsu untuk membuka blocker.
- Tanggal mulai pilot lama tidak dibawa ke target baru; tetapkan jendela empat minggu setelah
  baseline tersedia, tanpa backdate.

## TODO update

- `SDLC-P1C-KERJAA-OBSERVATION-PILOT` → `Blocked`.
