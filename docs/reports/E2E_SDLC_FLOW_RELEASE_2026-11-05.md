# E2E-SDLC-FLOW Release — 2026-11-05

## Task

E2E-SDLC-FLOW P1–P6: satu Feature berjalan dari ide PO sampai Keputusan Rilis lewat UI,
[PR #105](https://github.com/oneilreyand/qlickhub/pull/105).

## Outcome

PR #105 di-merge Owner ke `main` (merge commit `f521444`, 2026-11-05 15:54 WIB) dan ter-deploy
otomatis ke Production. Sebelum merge, Owner menerapkan migrasi `20261105000095` dan `20261105000096`
lewat Supabase SQL Editor dalam satu transaksi ("Run and enable RLS"): `SequelizeMeta` sampai 096 dan
5 Requirement berkode UUID diganti menjadi `REQ-00x`; backfill notifikasi Bug menautkan 0 baris.
Setelah deploy, `GET https://qlickhub.vercel.app/v1/health` mengembalikan `status: ok`, database
`connected`, `migrations.latest` = `20261105000096-add-notification-bug-id.cjs` (80 migrasi), dan bundle
Production memuat UI baru (chunk `SubtaskWorkPage` berisi "Selesaikan Eksekusi QA").

## Work assurance

- **SDLC stage and path (`SDLC-001`):** tahap 6, jalur Standar,
  [folder Feature](../features/E2E-SDLC-FLOW/README.md), [PHASE-01](../features/E2E-SDLC-FLOW/phases/PHASE-01.md).
- **Work Readiness Assessment:** per phase 4–8/16, Ready ([breakdown](../features/E2E-SDLC-FLOW/breakdown.md)).
- **User plan approval:** rencana dan K1–K5 disetujui Owner 2026-11-05 ("ok jalankan", "aku ingin
  jalannya 1 round semua"); P6 dan K6 ("kerjakan rencana ini dengan sekali round dan nanti baru kita
  push sama pekerjaan sebelumnya").
- **Approval Window / high-risk decisions:** migrasi Production, label `owner-approved`, dan merge
  dijalankan Owner; agent tidak menekan merge maupun label.
- **Agent capability and access:** Claude tidak punya kredensial push/GitHub API, Vercel, atau
  database Production. Push dan migrasi oleh Owner; status CI dibaca lewat browser bawaan; data
  Production dari screenshot SQL Editor Owner; health dan bundle diperiksa langsung dari browser.
- **AC-to-evidence matrix:** lihat [testing.md](../features/E2E-SDLC-FLOW/testing.md) §1 dan
  [release.md](../features/E2E-SDLC-FLOW/release.md) §2.

| Acceptance Criterion | Required / achieved | Primary evidence and environment                                      | Verification status |
| -------------------- | ------------------- | --------------------------------------------------------------------- | ------------------- |
| AC-1 – AC-7          | E2–E4 / E3–E4 lokal | API 649/649 PostgreSQL 16, web 819/819, Playwright 33 + 1 skip, CI PR | Accepted            |
| AC-8                 | E3 / E4             | Production: `requirement_code_renames` = 5, `SequelizeMeta` 096       | Accepted            |
| AC-9, AC-10          | E4 / E4 lokal       | Playwright penuh; uji manual Production belum                         | Accepted with gaps  |

- **Evidence outcomes:** CI `verify` gagal pertama kali hanya pada gerbang "Production migrations
  applied before merge" (semua tes lulus); setelah migrasi diterapkan, re-run hijau dan PR di-merge.
- **Change Impact Map:** Cross-boundary — API (`testManagement`, `bugs`, `workQueue`, `notifications`,
  `ai` Apply), kontrak (`DeveloperReadiness`, Bug origin QA, notifikasi `bugId`), data (2 migrasi
  aditif), web (halaman QA, Test Case, Bug, Feature, Tugas Saya, lonceng, API client), dokumen
  (ADR-041, `QA-010`, Workflow SSoT).
- **Decision Snapshot:** [solution.md](../features/E2E-SDLC-FLOW/solution.md); rollout satu PR atas
  permintaan Owner; rollback revert PR + `down` 096 lalu 095.
- **Agent handoff and independent verification:** verifier = CI PR #105 dan merge Owner; gap E4
  manual dicatat di testing.md.
- **Quality review:** [testing.md](../features/E2E-SDLC-FLOW/testing.md) §4 — reuse, duplikasi, kode
  usang, boundary, dan regresi semuanya resolved.
- **Cross-layer quality gates:** Playwright desktop dan mobile untuk layar yang berubah; alur penuh
  hanya desktop. Tidak ada perubahan query berat; index parsial `idx_notifications_bug_id`.

## Incident: SQL Editor salah membaca `$` di pola regex

Script migrasi pertama ditolak Supabase SQL Editor (`trailing junk after numeric literal`) karena
tanda `$` di dalam string regex. Tidak ada perubahan yang tersimpan. Versi kedua mengganti `$` dengan
`\Z` (anchor yang sama), diuji di PostgreSQL 16 disposable dengan data contoh (hasil kode dan skema
identik dengan migrasi kanonis), lalu berhasil di Production.

## Source of truth and impact

- **Applicable SSoT:** [Workflow §5–§6](../2_WORKFLOW_AND_ROLES.md), [ADR-041](../adr/ADR-041-QA-READINESS-PER-REQUIREMENT-AND-SERVER-SIDE-QA-FLOW.md).
- **Policy IDs:** `QA-010`, `QA-008`, `RELEASE-001`, `TEST-001`, `SDLC-001`, `SDLC-002`.
- **Data/interface impact:** `requirements.code` UUID → `REQ-00x`; tabel `requirement_code_renames`;
  kolom `notifications.bug_id`; endpoint `GET …/tasks/:taskId/developer-readiness`.
- **Authorization impact:** tidak ada izin baru; UI mengikuti role Workspace yang sudah dipakai API.
- **Migration risk:** aditif, bisa di-`down`; sudah diterapkan.

## Changed files

- `docs/features/E2E-SDLC-FLOW/{README,testing,release}.md`, `phases/PHASE-01.md` — penutupan tahap 4–6.
- `docs/features/FEATURE_CATALOG.md` — status Active.
- `TODO.md` — status rilis.
- Laporan ini.

## Validation

- `npm run docs:check`, `npm run docs:completeness`, `npm run sdlc:check` pada branch penutupan.

## Risks or follow-up

1. Selesai 2026-11-05: uji manual Production satu putaran (AC-9, AC-10) lulus; QA sign-off dan Keputusan Rilis Feature uji tercatat (release.md). Temuan UX dikerjakan di P7 (AC-11 – AC-15).
2. PO "Fitur Pendaftaran Pasien" mengubah Status Brief Produk menjadi Disetujui.
3. Gerbang migrasi CI bekerja (menahan merge sampai Production siap); tetap manual di sisi penerapan.

## Human decision summary

Kode dan migrasi sudah di Production dan sehat. Yang tersisa adalah bukti E4 manual dan keputusan
rilis PO atas Feature ini; keduanya butuh Owner/PO.

## TODO update

E2E-SDLC-FLOW Done 2026-11-06: P7 dirilis lewat PR #107 dan diulang singkat di Production (AC-11 – AC-13 lulus); item dipindah ke [arsip TODO 2026-11-06](../archive/TODO_COMPLETED_2026-11-06.md).
