# Laporan SDLC P0 — Paket Keputusan dan Audit Data

## Task

SDLC-P0-DECISION-DATA-AUDIT.

## Outcome

Paket keputusan K1–K3/K8, rekonsiliasi SSoT/kontrak, peta pembaca readiness/cancellation/deletion/
work queue, dan audit agregat read-only Lokal serta Production telah disusun. K1–K3/K8 kemudian
disetujui melalui instruksi pengguna untuk melanjutkan dan dicatat dalam ADR-013, Architecture,
Workflow, serta Policy Registry. Data Production saat ini tidak cukup untuk menghitung kualitas
Product, Dev, atau QA secara adil: belum ada histori transisi/pengembalian, Test Run/Result, Bug,
QA sign-off, atau release decision. Nilai metrik harus ditampilkan belum tersedia, bukan nol.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/4_AGENT_DEV_GUIDELINES.md`, dan `docs/POLICY_REGISTRY.md`.
- **Policy IDs:** `DOMAIN-002`, `DOMAIN-003`, `DOMAIN-004`, `AUTH-001`, `AUTH-002`, `FLOW-001`,
  `FLOW-002`, `FLOW-005`, `FLOW-006`, `QA-001`, `QA-002`, `QA-003`, `QA-004`, `QA-005`,
  `RELEASE-001`, `RELEASE-002`, `DATA-001`, `DATA-002`, `DATA-004`, `DATA-005`, `CONTRACT-001`,
  `TEST-001`, `DOC-002`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** tidak ada; database hanya dibaca dalam transaksi read-only dan hanya
  agregat non-PII yang dicatat.
- **Authorization impact:** tidak ada perubahan runtime. Policy menetapkan batas hak granular yang
  wajib ditegakkan backend saat P1/P2 diimplementasikan.
- **Migration risk:** tidak ada migrasi pada task ini. P1/P2 kelak harus additive, tanpa backfill
  spekulatif, dan memakai direktori kanonikal `apps/api/src/db/migrations/`.

## Changed files

- `docs/adr/ADR-013-SDLC-READINESS-TRIAGE-REVIEW-AND-LEGACY-GOVERNANCE.md` — keputusan K1–K3/K8.
- `docs/1_ARCHITECTURE.md` — baseline Feature, legacy evidence, dan lokasi migrasi kanonikal.
- `docs/2_WORKFLOW_AND_ROLES.md` — readiness, triage, review round, legacy metrics, serta penyelarasan label Bug/release.
- `docs/POLICY_REGISTRY.md` — menambahkan `FLOW-005`, `FLOW-006`, `QA-005`, dan `DATA-005`.
- `docs/plans/SDLC_P0_DECISION_AND_DATA_AUDIT.md` — paket keputusan, hasil audit, peta dampak, dan gate.
- `docs/plans/SDLC_QUALITY_AND_RELEASE_PLAN.md` — menghubungkan hasil P0 dan memperbarui batas bukti.
- `docs/features/SDLC_QUALITY_AND_RELEASE.md` — memperbarui traceability dan status P0.
- `TODO.md` — mencatat penyelesaian P0 dan evidence-nya.
- `docs/reports/SDLC_P0_DECISION_DATA_AUDIT_2026-09-13.md` — laporan evidence task ini.

## Validation

- Audit PostgreSQL Lokal dalam `BEGIN READ ONLY` — pass; 9 Workspace, 7 Feature, 5 Development
  Subtask, 3 QA Subtask, 19 activity, 0 event perubahan status, dan 0 Test Run/Result/Bug/release record.
- Audit PostgreSQL Production dalam `BEGIN READ ONLY` — pass; 1 Workspace, 1 Feature, 1 Development
  Subtask, 0 QA Subtask, 8 activity, 0 event perubahan status, 3 Requirement aktif/tertaut, 1 dengan
  AC aktif, serta 0 Test Run/Result/Bug/sign-off/release decision.
- Audit tabel legacy Lokal/Production — pass; `requirement_test_cases` ada dan berisi 0 record.
- Audit statis pembaca readiness, cancellation, task deletion, dan work queue — pass; pembaca backend
  dan frontend dicatat pada paket P0.
- `npm run docs:check` — pass; 5/5 test, 0 failed, 0 skipped, dan documentation governance passed.
- `npx prettier --check` pada 9 berkas dokumentasi/TODO yang berubah — pemeriksaan awal memberi
  warning pada Policy Registry dan ADR baru; keduanya diformat, lalu pemeriksaan akhir pass 9/9.
- `git diff --check` — pass; tidak ada whitespace error.
- Pemeriksaan governance sempat gagal 1 kali karena nama file ADR pada tautan Feature Card terbaca
  sebagai Policy ID oleh validator; tautan dialihkan melalui SSoT dan pemeriksaan akhir lulus.
- Pemeriksaan tautan lokal kustom — pemanggilan awal gagal sebelum inspeksi karena interpolasi shell;
  pemanggilan terkoreksi pass dengan 112 tautan diperiksa dan 0 rusak.
- Tidak ada test aplikasi atau build yang diperlukan karena tidak ada code/contract/schema/runtime change.

## Risks or follow-up

- K4–K7 dan K9–K10 masih memerlukan keputusan sebelum slice yang bergantung padanya.
- Data Production terlalu sedikit untuk KPI; pilot harus menghasilkan denominator baru.
- Test Run belum Feature-scoped dan deployment identity belum persisten pada domain aplikasi.

## TODO update

- `SDLC-P0-DECISION-DATA-AUDIT` → `Done` setelah K1–K3/K8, audit, ADR, dan SSoT selesai.
