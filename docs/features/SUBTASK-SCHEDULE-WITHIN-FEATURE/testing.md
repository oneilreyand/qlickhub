# SUBTASK-SCHEDULE-WITHIN-FEATURE — Tahap 5: Test & Review

**Status:** Disetujui
**Gerbang:** G5 — Accepted oleh verifier Standards dan Spec, 2026-11-07 (kandidat lokal)
**Applicable Policy IDs:** AI-003, AI-004, AI-010, TEST-001, DOC-005, DOMAIN-005

## 1. AC → evidence lokal

| AC       | Minimum / dicapai   | Evidence primer                                                                                                                                             | Hasil lokal                           |
| -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| AC-F1.1  | E3 / E3             | HTTP root shrink 409; judul/tanggal child, root/title/audit/notifikasi/outbox unchanged                                                                     | Teruji                                |
| AC-F1.2  | E3 / E3             | HTTP create di luar rentang 400, no new child; rentang sah dan code terbaca                                                                                 | Teruji                                |
| AC-F1.3  | E3 / E3             | done/canceled diabaikan; root update sukses dengan tepat satu Activity baru                                                                                 | Teruji                                |
| AC-F1.4  | E3 / E3             | update child ditolak dan readback unchanged; tanggal tepat batas diterima                                                                                   | Teruji                                |
| AC-F1.5  | E3+E2 / E3+E2       | parent unbounded, child unscheduled; pair/order schema dan API existing regression                                                                          | Teruji                                |
| AC-F1.6  | E3+E2+E4 / E3+E2+E4 | legacy factory dipersist/readback; GET tanpa write; metadata/status edit sah; partial date fix ditolak; badge browser                                       | Teruji                                |
| AC-F1.7  | E3 / E3             | expansion sukses dan root start shrink 409                                                                                                                  | Teruji                                |
| AC-F1.8  | E3 / E3             | Plan shrink menolak, spec version/history/root/audit tetap; Apply existing rollback/idempotency suites                                                      | Teruji lokal, tanpa replay Production |
| AC-F1.9  | E3 / E3             | Planner melalui owner HTTP/PO browser dan existing policy tests; Dev/QA 403; foreign Task 404 tidak bocor; Workspace regression                             | Teruji                                |
| AC-F1.10 | E3 / E3             | Dua koneksi: create child → shrink root, shrink root → create child, shrink root → update child; wait observed di pg_stat_activity                          | Teruji, bukan sleep acak              |
| AC-F1.11 | E2+E4 / E2+E4       | component tests termasuk kedua layout; Chromium 390/768/1440 × Light/Dark, keyboard submit, 409/400 input retained, bounds refreshed, overflow/touch target | Teruji lokal                          |
| AC-F1.12 | E3+E2 / E3+E2       | Terminal di luar rentang tidak bisa reopen, status tetap; lifecycle/QA regression dan tampilan ignored                                                      | Teruji                                |

Fixtures hanya di support test, dipersist ke PostgreSQL disposable untuk E3/E4.
Frontend mocks hanya menguji rendering/koordinasi HTTP; tidak menggantikan PostgreSQL/API nyata.
Tidak ada backend model/repository/policy/migration mock untuk F1.

## 2. Outcome pemeriksaan

- Red F1: 1 pass / 5 fail; helper hanya pair/order belum menolak containment.
- Kandidat F1 setelah G5: 16 pass / 0 fail / 0 skip, HTTP dan PostgreSQL nyata.
- Web suite terbaru: 838 pass, 142 files, 0 fail/skip; termasuk error codes dan stale range hook.
- Contracts: 109 pass / 0 fail / 0 skip (27 suites).
- E2E F1: 6 pass / 0 fail / 0 skip, 44.1 s; API/Vite dan database disposable E2E sendiri.
- API final setelah G5 671/671; validate exit 0 (88/88, lint 0 error/15 warning existing); build exit 0.
- Regresi API lengkap, validate/build, perintah exact dan temuan runner dicatat pada
  [laporan Phase 1](../../reports/SUBTASK_SCHEDULE_WITHIN_FEATURE_P1_2026-11-07.md).
- Hasil lama/failure tidak dihapus atau dihitung sebagai passing; tidak ada tes yang dilemahkan.

## 3. Bukti UI dan Atomic

| State / route                                      | Phone              | Tablet              | Desktop             | Evidence                                                                            |
| -------------------------------------------------- | ------------------ | ------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| `/work/features/:featureId?tahap=plan`, 409        | 390×844 Light/Dark | 768×1024 Light/Dark | 1440×900 Light/Dark | Error teks, input tetap, keyboard submit/fokus, no horizontal overflow              |
| Task summary legacy, same Feature route tahap Task | Sama               | Sama                | Sama                | Label+ikon backend, bukan warna saja                                                |
| CreateSubtaskModal stale context 400               | Sama               | Sama                | Sama                | Error rentang baru, native max diperbarui lewat GET, draf tetap, touch target ≥44px |

18 screenshot lokal: `/private/tmp/qlickhub-f1-browser-evidence-20261107`.
Gambar phone conflict, tablet dark legacy dan phone dark child error diperiksa visual; tidak ada
teks tertutup/overflow pada surface baru. Route/error/empty/loading/read-only lainnya menggunakan
komponen existing dengan component regression; bukan klaim UAT semua peran di Production.

Reuse Input, Alert, Badge; molekul FeatureScheduleConstraint hanya presentasi; hook
useFeatureScheduleRange mengoordinasi context GET dengan generation guard. Pages tetap komposisi,
business containment dan status legacy di server. Tidak ada palette/token/layout framework baru.

## 4. Relasi dan performa

Canonical migrations 80/80 pada PostgreSQL 16 disposable baru. FK komposit parent/Workspace tetap;
root lock sebelum child dan reload setelah wait. Query read 23 request internal pada page size
1 dan 5, membuktikan tidak ada parent query per child pada endpoint yang diuji. Satu batch root
per halaman termasuk child di dalam includeSubtasks, metadata tidak dipersist. Indeks existing idx_tasks_workspace_parent_created dipakai
EXPLAIN pada 50 root/5.000 child factory; tidak perlu indeks atau migrasi baru.

20 sampel lokal page size 50: baseline read median 0.70 ms / p95 1.18 ms; read+metadata
median 1.26 ms / p95 3.70 ms. Conflict query execution 0.049 ms, planning 0.452 ms; bitmap index
scan 100 child lalu filter 50 konflik. Ini overhead lokal yang terukur, bukan klaim latency Production.
Write pada Feature yang sama diserialisasi; antrean pada beban tinggi belum diukur di Production.

## 5. Quality review (pelaksana)

| Dimensi           | Metode/scope dan hasil                                                                                                                                                 |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reuse/DRY         | Diff helper lifecycle/query/Plan, policy dan Gallery: pair/order, existing policy/audit, Input/Alert/Badge dipakai ulang; tidak ada client bisnis paralel              |
| Duplicate/overlap | Search imports/callers: satu helper containment; overdue scheduleHealth dan workload advisory FLOW-007 tidak diubah; dedicated codes tidak mengubah error lain         |
| Obsolete/unused   | Search referensi helper/hook/schema dan lint/typecheck: seluruh tambahan dipakai; tidak ada export/dependency/framework tak terpakai baru                              |
| Boundary          | Workspace scope, authorization sebelum detail konflik, atomic transaction, root-first locks, ADR/SSoT sebelum build; F2–F4/Production tidak disentuh                   |
| Regression        | API/contract/web/E2E dan query evidence nyata; runner/checker failures dicatat beserta koreksinya; Standards/Spec Accepted untuk kandidat lokal; CI/Production pending |

## 6. Hasil verifier

Dua verifier independen membaca diff termasuk file baru, membandingkan manifest dengan berkas
saat ini, serta memeriksa assertion dan log primer E2/E3/E4. Standards dan Spec masing-masing
**Accepted untuk G5 lokal**, 2026-11-07; tidak ada temuan actionable tersisa. Mereka tidak
mengoperasikan browser atau menjalankan tes baru sendiri. Inspeksi visual dilakukan pelaksana
secara terpisah; ini bukan keputusan rilis Production atau QA Test Result tersegel di aplikasi.

| Axis      | Temuan awal                                                                          | Perbaikan dan bukti                                                                                                                                                                 | Hasil akhir |
| --------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| Standards | P1: Save folder memakai request terpisah sebelum tanggal; 409 menyisakan perpindahan | Folder dan tanggal dikirim melalui updateTask transaksional existing. UI one-request/draf retained; HTTP readback root/child/audit unchanged pada 409 dan propagasi sukses pada 200 | Accepted    |
| Spec      | P2: hasil assignment tanpa metadata menghilangkan badge legacy                       | Shared backend metadata pada claim/release/reassign. HTTP ketiganya membuktikan flag/tanggal/assignee/audit; E2E release mempertahankan badge/range di tiga viewport Light/Dark     | Accepted    |

Embedded includeSubtasks tetap diuji: serializer mengolah JSON child hasil toJSON root, lalu
satu batch parent menambahkan metadata. Respons 200/flag legacy dibuktikan melalui HTTP.

Bukti terbaru dan perintah exact: [laporan G5](../../reports/SUBTASK_SCHEDULE_WITHIN_FEATURE_G5_2026-11-07.md).
18 screenshot rerun disimpan pada `/private/tmp/qlickhub-f1-g5-browser-evidence-20261107`;
pelaksana memeriksa phone Plan conflict, tablet dark legacy dan desktop child conflict.
Bukti awal Phase 1 tetap dipertahankan. CI dan verifikasi Production/G6 belum diklaim lulus.

## Temuan Production 2026-11-11 — peringatan dini rentang Feature di form subtask

Smoke Production terautentikasi: [laporan](../../reports/PRODUCTION_SMOKE_F1_F2_MERMAID_2026-11-11.md).
AC-F1.1 (409 dengan nama/tanggal child, tanpa perubahan data), AC-F1.4 (child keluar rentang
ditolak, data tetap) dan AC-F1.7 (perubahan root yang valid diterima) teramati di Production.

Temuan Owner: form subtask baru memberi tahu setelah Simpan. Perbaikan disetujui Owner lewat chat
2026-11-11 (`ok kerjakan`) dalam scope AC-F1.11 (form child menampilkan rentang):
`SubtaskAccordionItem` menampilkan pesan dan menonaktifkan `Simpan Detail` begitu tanggal draf yang
diubah berada di luar rentang Feature. Batas tetap berasal dari backend
(`featureScheduleConstraint` / `useFeatureScheduleRange`); server tetap otoritatif dan tidak ada
perubahan kontrak, API, data, atau authorization. Subtask legacy di luar rentang tetap bisa
menyimpan perubahan non-tanggal karena pesan hanya muncul bila tanggal draf diubah.

Evidence (clone `main` @ `431fcac8` + perubahan, Node 22): regression test baru
`warns as soon as a subtask date leaves the Feature range and blocks saving (F1)` lulus, termasuk
tanggal tepat di batas yang tetap diterima; hasil suite lengkap dicatat pada deskripsi PR.
Batas: belum diperiksa visual di tiga viewport/Dark, dan belum diverifikasi di Production.
