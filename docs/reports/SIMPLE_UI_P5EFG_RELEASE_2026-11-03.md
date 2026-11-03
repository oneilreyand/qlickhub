# SIMPLE-UI P5e–P5g Release — 2026-11-03

## Task

SIMPLE-UI-DELIVERY-FLOW P5e (UI PRD/Task/Apply), P5f (tahap di Task Hub), P5g-1 (assignment mode)
dan P5g-2 (klaim/lepas/alih subtask terbuka, ADR-038), [PR #97](https://github.com/oneilreyand/qlickhub/pull/97).

## Outcome

PR #97 di-merge Owner ke `main` (merge commit `2cf906e`) dan ter-deploy otomatis ke Production.
Sebelum merge, Owner menjalankan migrasi 089–094 di Production lewat Supabase SQL Editor (satu
transaksi, "Run and enable RLS"); `SequelizeMeta` kini sampai `20261103000094-add-task-assignment-mode.cjs`.
Setelah deploy, `https://qlickhub.vercel.app/v1/health` mengembalikan `status: ok` dan database
`connected`; bundle Production memuat UI baru (chunk `MyTasksPage` berisi "Tersedia untuk Diambil");
`POST …/tasks/:taskId/claim` tanpa sesi mengembalikan 401. Owner melaporkan pemeriksaan Production
aman.

## Work assurance

- **SDLC stage and path (`SDLC-001`):** tahap 6, jalur Penuh,
  [folder Feature](../features/SIMPLE-UI-DELIVERY-FLOW/README.md),
  [PHASE-05efg](../features/SIMPLE-UI-DELIVERY-FLOW/phases/PHASE-05efg.md).
- **User plan approval:** Approval Window P5e–P5g disetujui Owner 2026-11-03; ADR-038 dikonfirmasi
  ulang Owner 2026-11-03 (Fullstack mencakup FE/BE/Mobile; klaim hanya Developer/QA).
- **Approval Window / high-risk decisions:** migrasi Production dan merge dijalankan Owner sendiri;
  label `owner-approved` (Tier 2) dipasang Owner; agent tidak menekan merge maupun label.
- **Agent capability and access:** Claude tidak punya kredensial push/GitHub API, Vercel, atau database
  Production. Push dilakukan Owner lewat GitHub Desktop; draft PR dibuat Claude lewat browser yang
  sudah login Owner; observasi database Production berasal dari screenshot Owner.
- **Evidence outcomes:** lihat PHASE-05efg — PG integration P5g-2 7/7 (klaim bersamaan 200/409),
  suite API 633 (624 + 1 ekspektasi usang dikoreksi + 8 rerun pass), web 805/805, E2E desktop 16/16
  dan mobile 4/4, `npm run validate` exit 0; CI `verify` dan Owner gate hijau pada `e990487`.
- **Agent handoff and independent verification:** P5e–P5g-1 ditulis Codex; Claude menjalankan ulang
  suite terkait sebelum melanjutkan P5g-2 dari WIP Codex.

## Incident: migrasi Production tertinggal lagi (089–093)

| Fakta                                                                      | Bukti                               |
| -------------------------------------------------------------------------- | ----------------------------------- |
| Sebelum 2026-11-03, migrasi terakhir di Production adalah `20261013000088` | Screenshot `SequelizeMeta` Owner    |
| 089–093 sudah di `main` lewat PR #89–#96 dan ter-deploy otomatis           | `git log` file migrasi              |
| Tabel/kolom 089–094 belum ada sama sekali (6× `false`)                     | Screenshot query cek Owner          |
| Setelah SQL gabungan: 089–094 tercatat; health `ok`                        | Screenshot SQL Editor; `/v1/health` |

SQL gabungan diuji dulu di PostgreSQL 16 disposable yang dimigrasi sampai 088: skema hasilnya
identik dengan migrasi kanonis (`pg_dump -s` diff hanya token `\restrict`). Dampak error di Production
sebelum migrasi (Feature Spec, checklist AC, pesan serah-terima) belum diverifikasi dari log.
Akar masalah sama dengan insiden 085/086: merge ke `main` men-deploy Production otomatis, sedangkan
migrasi Production manual dan tidak diperiksa.

RLS: Supabase menawarkan RLS untuk tabel baru; Owner memilih "Run and enable RLS" sesuai
DEPLOYMENT_AND_ENVIRONMENTS (tanpa akses `anon`/`authenticated`). Aplikasi tetap terhubung sebagai
pemilik tabel, terbukti dari health dan pemeriksaan Owner.

## Follow-up

1. Pengecekan otomatis migrasi tertinggal sebelum merge ke `main` (sudah dua kali terjadi; butuh
   keputusan Owner soal akses read-only CI ke database Production).
2. Smoke test Ambil/Lepas di Production dengan anggota Developer berspesialisasi dan QA.
3. Label "Unassigned" lain di luar daftar subtask belum ditinjau untuk mode `open`.

## Source of truth and impact

- **Policy IDs:** UI-001–005, AUTH-001/002, DATA-001/002, CONTRACT-001, TEST-001, AI-020, SDLC-001.
- **Data/interface impact:** endpoint baru claim/release/reassign; bucket `available_to_claim`;
  kolom `tasks.assignment_mode` (default `assigned`, data lama tidak berubah).
- **Authorization impact:** klaim hanya Developer/QA yang cocok area/spesialisasi; lepas/alih hanya
  Owner/Admin/PO (ADR-038).
- **Migration risk:** semua migrasi 089–094 aditif; rollback kode lewat revert, kolom/tabel dibiarkan.
