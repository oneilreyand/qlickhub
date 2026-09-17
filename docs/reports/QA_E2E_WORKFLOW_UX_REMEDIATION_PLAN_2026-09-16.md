# Laporan Rencana Remediasi UX Alur QA End-to-End

## Task

Menyusun rencana implementasi untuk menghilangkan dead-end Bug retest, memusatkan antrean QA pada
next action yang benar, menyederhanakan QA Desk menjadi alur progresif, dan menahan
completion/Sign-off sampai gate backend siap.

## Outcome

Rencana implementasi membagi remediasi menjadi tujuh vertical slice. S1 menutup dead-end retest
tanpa input UUID; S2 membuat antrean capability-scoped dan deep-linked; S3 memberi ringkasan serta
satu next action dari backend; S4 memecah QA Desk dengan progressive disclosure; S5
memvalidasi completion dan Sign-off sebelum aksi; S6 menyelaraskan istilah; S7 membuktikan alur
lintas peran melalui browser E2E dan PostgreSQL disposable.

Plan mempertahankan batas kanonikal: hanya QA assignee yang mengeksekusi pengujian normal, Result
dan Evidence Manifest tetap immutable, perubahan status Bug melalui Retest Attempt formal, serta
completion, Sign-off, dan Release Decision memakai snapshot scope/candidate yang sama. Rencana ini
tidak mengubah runtime, schema, data, otorisasi, Preview, atau Production.

Atas tindak lanjut pengguna, plan kini menetapkan perubahan UI wajib: satu CTA primer per konteks,
navigasi progresif empat area, deep-link antrean yang mempertahankan objek/fokus, retest tanpa input
ID internal, checklist blocker dari backend, timeline Bug kronologis, bahasa Indonesia konsisten,
serta interaction state dan perilaku mobile yang dapat diverifikasi.

Plan juga menetapkan histori multi-cycle yang tidak tertimpa: temuan awal diikuti kartu
`Siklus perbaikan #n` yang memasangkan Resolution Event, evidence Developer, Retest Attempt, Result,
Evidence Manifest, dan outcome melalui relasi eksplisit. Retest gagal/blocked menambahkan siklus
`reopened`; putaran berikutnya memakai record baru dan tetap mempertahankan seluruh evidence lama.

## Source of truth and impact

- **Applicable SSoT:** `docs/1_ARCHITECTURE.md`, `docs/2_WORKFLOW_AND_ROLES.md`,
  `docs/3_UI_ATOMIC_DESIGN_SYSTEM.md`, `docs/4_AGENT_DEV_GUIDELINES.md`, serta ADR-014.
- **Policy IDs:** `AUTH-009`, `QA-004`, `QA-006`, `QA-007`, `QA-008`, `QA-009`, `RELEASE-003`,
  `DATA-001`, `CONTRACT-001`, `UI-001`, `UI-002`, `TEST-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** tidak ada pada task perencanaan. Implementasi mendatang mengusulkan
  proyeksi `QaWorkflowSummary`, `BugRetestContext`, `BugRetestTimeline`, queue capability, command
  additive untuk memulai Run retest dari Bug, dan relasi evidence Developer ke Resolution Event.
- **Authorization impact:** tidak ada pada task perencanaan. Plan mempertahankan enforcement backend
  QA-assignee-only, membatasi evidence resolusi ke Developer assignee, dan menjadikan
  capability/blocker backend sebagai dasar affordance UI.
- **Migration risk:** tidak ada migration pada task ini. Implementasi memerlukan migration additive
  untuk menyimpan stage dan relasi Resolution Event pada evidence Bug. Backfill hanya untuk relasi
  deterministik; evidence lama yang tidak dapat dipasangkan tetap `legacy_unassigned`.

## Changed files

- `docs/plans/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md` — plan implementasi, keputusan, kontrak,
  acceptance criteria, risiko, dan strategi verifikasi.
- `docs/plans/QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md` — menautkan child plan remediasi UX.
- `docs/features/SDLC_QUALITY_AND_RELEASE.md` — menambahkan konteks dan traceability remediasi.
- `docs/reports/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN_2026-09-16.md` — laporan task ini.
- `TODO.md` — klaim dan status pekerjaan perencanaan.

## Validation

- `npm run docs:check` — lulus: 5/5 test governance dokumentasi; 0 gagal, 0 skipped.
- `git diff --check` serta pemeriksaan whitespace file baru — lulus; tidak ada whitespace error.
- `npx prettier --check docs/plans/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN.md
docs/reports/QA_E2E_WORKFLOW_UX_REMEDIATION_PLAN_2026-09-16.md` — lulus: 2/2 file.
- Tidak ada test runtime atau build yang diwajibkan karena perubahan hanya dokumentasi; hasil audit
  sebelumnya menjadi input plan, bukan bukti implementasi.

## Risks or follow-up

- Implementasi harus dimulai dari S1 dan S2 sebelum restrukturisasi besar QA Desk.
- Keputusan Product masih diperlukan bila satu Feature memiliki beberapa QA Subtask aktif dan retest
  hendak dipindahkan dari QA Subtask Run asal.
- Pembuatan cycle pengganti, penempatan authoring Test Case, dan sticky CTA mobile harus divalidasi
  pada slice terkait.
- Dua regression test Bug/retest yang ditemukan saat audit harus diperbaiki pada S1, bukan
  dilemahkan atau dihapus.
- Migration relasi evidence resolusi harus diuji clean/upgrade/rollback dan tidak boleh memasangkan
  evidence historis ke Resolution Event hanya berdasarkan timestamp.
- Parent plan `QA_EXECUTION_RELEASE_ASSURANCE_PLAN.md` adalah file worktree belum terlacak yang sudah
  memiliki perbedaan format menyeluruh. File itu tidak diformat massal agar perubahan lain tidak
  ikut tersentuh; governance docs dan whitespace tetap lulus.

## TODO update

- `QA-E2E-WORKFLOW-UX-REMEDIATION-PLAN` → `Done` setelah pemeriksaan dokumentasi final lulus.
