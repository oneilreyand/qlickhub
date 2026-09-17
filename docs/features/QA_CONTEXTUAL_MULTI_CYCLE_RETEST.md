# QA-E2E-S1 — Contextual Multi-Cycle Bug Retest

**Status:** Active pada development/test; belum dideploy ke Production
**Owner:** Product, Engineering, dan QA
**Last reviewed:** 2026-09-16
**Applicable Policy IDs:** `AUTH-001`, `AUTH-002`, `AUTH-009`, `QA-002`, `QA-003`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `DATA-001`, `DATA-002`, `DATA-005`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`

## 1. Tujuan dan Pengguna

QA dapat memulai retest langsung dari Bug tanpa menyalin ID teknis, sementara Developer dan QA
melihat histori perbaikan sebagai siklus bernomor yang tidak menimpa evidence siklus sebelumnya.
Pengguna utama adalah Developer assignee dan QA assignee. Slice ini tidak mengubah release gate,
rollout Production, struktur penuh QA Desk, atau aturan break-glass Owner/Admin.

## 2. Requirement dan Acceptance Criteria

- Developer mengirim fingerprint kandidat, catatan resolusi, dan tautan evidence perbaikan dalam satu
  Resolution Event atomik.
- QA memilih **Mulai Retest** pada Bug; backend menentukan Feature, QA Subtask, Test Case revision,
  Test Cycle, baseline, build, environment, Bug, dan Resolution Event tanpa input UUID dari pengguna.
- Satu Resolution Event memiliki paling banyak satu contextual Test Run dan satu Retest Attempt.
- Result `passed` menghasilkan `verified`; Result `failed` atau `blocked` menghasilkan `reopened`;
  `skipped` tidak dapat menentukan outcome Bug.
- Siklus dapat berulang tanpa batas produk yang dibuat-buat. Siklus #1, #2, dan seterusnya tetap
  menampilkan evidence Developer serta Result/Evidence Manifest QA masing-masing.
- Record legacy tanpa scope deterministik tidak direkayasa; record tersebut tidak masuk antrean
  contextual retest dan tetap terbaca sebagai histori legacy.

## 3. Alur Lintas Peran

QA mencatat Result gagal/blocked dan membuat Bug. Developer assignee memulai pekerjaan, lalu membuat
Resolution Event berikut evidence perbaikannya. QA assignee membuka antrean retest dan memilih
**Mulai Retest**. Backend menggunakan Test Cycle aktif yang fingerprint-nya sama dengan Resolution
Event dan membuka QA Subtask asal. Setelah QA mencatat Result beserta evidence, Retest Attempt dibuat
otomatis. Outcome gagal/blocked mengembalikan Bug kepada Developer; Developer dapat membuat
Resolution Event berikutnya dan alur yang sama berulang sampai QA menghasilkan Result passed.

## 4. Data dan Relasi

Migrasi `20260916000082-link-contextual-bug-retest-evidence.cjs` menambahkan:

- `bug_evidence_links.evidence_stage` dan `resolution_event_id` untuk mengikat evidence perbaikan ke
  Resolution Event yang tepat;
- `test_runs.retest_bug_id` dan `retest_resolution_event_id` untuk provenance contextual retest;
- foreign key komposit, check constraint, unique constraint satu Run per Resolution Event, dan index
  timeline.

Migrasi bersifat additive. Evidence lama di-backfill sebagai `triage` bila audit lama membuktikannya;
sisanya menjadi `legacy_unassigned`, bukan dipasangkan secara spekulatif. Risiko migrasi utama adalah
constraint baru terhadap data historis; verifikasi clean migration telah dijalankan pada PostgreSQL
disposable.

## 5. API dan Shared Contract

Kontrak berada di `packages/contracts/src/bug.ts` dan `packages/contracts/src/testManagement.ts`.

- `POST /workspaces/:workspaceId/bugs/:bugId/resolution-events` menerima `evidenceLinks` bersama
  fingerprint dan catatan resolusi.
- `POST /workspaces/:workspaceId/bugs/:bugId/retest-runs` membuat atau mengembalikan kembali Run
  contextual yang masih aktif secara idempotent.
- `POST /workspaces/:workspaceId/bugs/:bugId/retest-attempts` hanya menerima Result dari Run yang
  terikat pada Bug dan Resolution Event terbaru.
- `GET /workspaces/:workspaceId/bugs/:bugId/retest-history` mengembalikan `cycles`, selain daftar
  Resolution Event dan Retest Attempt untuk kompatibilitas.

Error validasi dan konflik tetap memakai Problem Details yang dipetakan controller bersama.

## 6. Authorization

Backend mewajibkan membership aktif. Hanya Developer yang ditugaskan pada Bug dapat membuat
Resolution Event. Hanya QA assignee pada QA Subtask asal dapat memulai Run dan memfinalkan Retest
Attempt. PO, Owner, dan Admin tidak mendapat hak eksekusi QA melalui UI ini. Visibilitas tombol tidak
menggantikan pemeriksaan authorization backend.

## 7. UI dan Interaction States

`BugExperiencePanel` memakai Card, Badge, Alert, Button, Input, Textarea, Modal, EmptyState,
EvidenceCard, dan BugStatusBadge yang sudah ada. Developer memperoleh satu dialog resolusi; QA
memperoleh satu tombol **Mulai Retest** dan langsung diarahkan ke QA Subtask yang relevan. UUID hanya
tersedia di disclosure detail teknis histori, bukan sebagai input.

Histori menampilkan **Temuan awal**, lalu Card **Siklus perbaikan #n** dengan bagian Perbaikan
Developer dan Hasil Retest QA. Loading, empty, error/retry, disabled/submission, dan permission-denied
state tetap tersedia. Layout memakai susunan satu kolom pada mobile dan grid evidence pada layar yang
lebih lebar; kontrol menggunakan komponen dengan focus state dan touch target bawaan design system.

`QaTestingDesk` menandai contextual Run sebagai **Retest Bug**, otomatis memfinalkan outcome setelah
Result tersimpan, serta menyediakan aksi pemulihan **Sinkronkan Outcome Bug** bila pencatatan Result
berhasil tetapi finalisasi attempt sempat gagal.

## 8. Pengujian dan Evidence

- Contract suite memvalidasi input contextual retest, field provenance Run, evidence stage, dan
  history cycle.
- PostgreSQL integration membuktikan migrasi canonical dari database kosong, RBAC, linkage Run,
  idempotensi start retest, outcome `reopened → verified`, dan dua set evidence yang tetap tersusun.
- Component tests membuktikan tidak ada input Result UUID, deep-link ke QA Subtask, finalisasi
  otomatis, recovery action, serta render dua siklus yang berbeda.
- Typecheck, lint, build frontend/backend, dan `docs:check` menjadi gate sebelum TODO ditutup.

Hasil command aktual dicatat pada
[laporan implementasi S1](../reports/QA_E2E_S1_CONTEXTUAL_MULTI_CYCLE_RETEST_2026-09-16.md); bagian
ini tidak mengklaim deployment atau UAT Production.

## 9. Release dan Readiness

Slice tersedia pada kode lokal serta database development/test setelah migrasi 82. Tidak ada
deployment Production dalam task ini. Rollback migration menghapus constraint, index, dan kolom baru;
sebelum rollback pada environment berisi Run contextual, ekspor/audit relasi harus dilakukan karena
kolom provenance akan hilang. Perubahan ini tidak mengubah QA sign-off atau keputusan release.

## 10. Traceability

[Workflow Bug & Retest](../2_WORKFLOW_AND_ROLES.md#6-siklus-defek--retest-bug--retest-lifecycle) →
[rencana remediasi UX](../plans/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md) →
`QA-E2E-S1-CONTEXTUAL-MULTI-CYCLE-RETEST` di [TODO](../../TODO.md) →
shared contracts → migration 82 → Bug API/service → BugExperiencePanel dan QaTestingDesk →
contract/component/PostgreSQL integration evidence → laporan implementasi.
