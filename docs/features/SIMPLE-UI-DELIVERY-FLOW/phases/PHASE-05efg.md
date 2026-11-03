# SIMPLE-UI-P5e–P5g — UI perencanaan, Tahap, dan tugas terbuka

**Approval:** Owner, chat 2026-11-03: “ok jalankn”, sesudah rencana dan penjelasan desain.
**Baseline:** `ddcade5e5f897eca8a79cc8919c36b4d024ee52d`; branch `codex/simple-ui-p5efg`.
**Stage:** 4/6 Build; program Penuh. Task existing SIMPLE-UI, satu phase dikerjakan pada satu waktu.
**Policies:** UI-001–005, AUTH-001/002/009, DATA-001/002/006, CONTRACT-001, TEST-001,
DOMAIN-002/003/004, AI-001/020, DOC-003/006, SDLC-001/002.

## Approval Window dan keputusan

Empat window berurutan dalam satu persetujuan: P5e (AC-5.8), P5f (AC-5.9), P5g-1
(penyimpanan mode dan Apply), P5g-2 (klaim/antrean, AC-5.10). WRA 7, 7, 7, 8/16;
P5g 10/16 dipecah sebelum implementasi (**Ready after split**). Berakhir saat draft PR siap review
atau dibatalkan Owner. Scope: Feature Spec, Task Hub, Tugas Saya, Task service/policy/model,
assignment-mode migration, shared contracts, tes, Feature docs, SSoT terkait ADR-036 dan TODO.
Urutan yang disetujui: implementasi dan perbaikan dalam scope → pemeriksaan setiap phase → review
terpisah → docs/status → commit/push nonprotected/draft PR/CI. Tidak ada merge, migrasi/deploy
Production, perubahan credential/env/dependency, atau perbaikan koneksi Production.

Claim hanya Developer/QA dengan area/spesialisasi cocok sesuai ADR-036; Planner Owner/Admin/PO
menugaskan/melepas/mengalihkan. Claim mengubah open→assigned tanpa mengubah status; done/canceled
tidak claimable. Pelepasan mempertahankan status dan aturan planning yang ada. Tidak ada bypass QA.
Kolom Tahap berasal dari backend: Spec status; fallback legacy dari Brief/Requirement/subtask,
tanpa mengarang bukti Apply historis. Tidak menambah `tasks.stage`.

## Fakta, dampak, alternatif, evidence

Baseline sudah punya backend Spec/AI/Apply, editor Plan, shared atoms dan halaman Feature. Belum ada
UI PRD/Task/Apply lengkap, stage read model, assignment mode atau claim. Reuse dipilih dibanding
redesign/penulis API paralel: perubahan lebih kecil dan kontrak tetap satu sumber. Layout mengacu
export design, token/theme aplikasi dan ADR-035/036. Tambahan desain: pilihan Ditugaskan/Terbuka,
kartu Tersedia untuk diambil dengan tombol Ambil dan pesan konflik.

Change Impact Map **Cross-boundary**: React pages/hooks/organisms → shared contract → Task/Spec/
work queue services/policy → PostgreSQL. Spec 1:1 root; subtask satu tingkat; Requirement N:M;
Workspace/FK/lifecycle tetap. Assignment mode aditif default assigned menjaga legacy. Risiko:
balapan klaim, perluasan akses, stale draft, regresi queue/Apply dan data lama. Mitigasi lock/CAS,
scope/policy backend, version check, regression tests dan migrasi bersih. Rollback kode dengan
revert; tidak menghapus data/mengubah Production atau menjalankan down migration otomatis.

| AC/slice        | Evidence objektif dan environment                                                                                       |
| --------------- | ----------------------------------------------------------------------------------------------------------------------- |
| P5e / AC-5.8    | Component test field/locked/error/stale/read-only; browser login dan API/readback PostgreSQL disposable                 |
| P5f / AC-5.9    | HTTP stage Plan/PRD/Task/applied dan legacy; UI/readback; scoped batched queries                                        |
| P5g-1           | Clean canonical migration dan legacy assigned; Spec Apply assigned/open atomik, pool1 regression                        |
| P5g-2 / AC-5.10 | HTTP 401/403, membership/area/specialty, two simultaneous claims 200/409, release/reassign audit; queue/browser Dev/QA  |
| UI-002–005      | Phone390/tablet768/desktop1440, Light/Dark, keyboard/focus/touch target, loading/empty/error/disabled/permission denied |
| Regresi         | Contracts/API/PostgreSQL/web/E2E, build/validate/docs, quality review lima dimensi, review terpisah dan CI              |

Capability: Node24, local PostgreSQL16 dan test browser runner tersedia; E2E membuat database
disposable, login lewat UI dan data persisted. AI external seam boleh ditiru pada tes; tidak
mengklaim Gemini baru atau Production UAT. Unknown implementasi rutin diselesaikan dari source;
konflik material menghentikan slice untuk keputusan Owner. Tier2 diperkirakan pada migration/policy;
label Owner tidak pernah diubah agent. Semua hasil belum dieksekusi dicatat sebagai pending.

## Outcome / validation / quality / handoff

Build P5e berjalan. Hasil aktual, perintah/count/skip/warning, review/CI dan gap akan ditambahkan
di record ini sebelum penutupan; belum ada klaim AC selesai. Feature induk tetap In progress.

### P5e — kandidat Test & Review, 2026-11-03

File utama: `FeatureSpecDraftPanel`, `FeatureSpecPrdEditor`, `FeatureSpecTasksEditor`,
`FeatureSpecRequiredChecklist`, `useFeatureSpecActions`, client Feature Spec, integrasi
`TaskDetailDrawer`/Plan, serta error/identity guard `useFeatureSpec`. Editor memakai atom Input/
Textarea/Select/Checkbox/Button/Alert/Modal yang ada dan layout FeatureStageLayout. Requirement/AC
dan subtask tetap draf berversi sampai pengguna mengonfirmasi Apply. AI overwrite perlu konfirmasi;
perubahan lokal mengunci AI/Apply sampai disimpan. Retry Apply mempertahankan key versi yang sama.
Field baca-saja untuk non-Planner; error pemuatan Spec tidak disamarkan sebagai Feature legacy.

Review awal **Rejected** menemukan prior Plan yang diedit menjadi incomplete masih dapat
melanjutkan PRD, link checklist cakupan tidak spesifik, fokus lime pada putih kurang kontras,
target link terlalu kecil, serta matriks responsif hanya mencakup PRD. Perbaikan memakai evaluator
kanonis pada UI dan backend saveSection/AI Tasks, label/target Requirement serta pelepasan tautan
usang, fokus stone900 Light/lime Dark dan target44px. Matriks browser diperluas ke PRD/Task/Apply.
Tidak ada role/policy/migrasi baru di P5e. Guard sebelumnya adalah penegakan ADR-036, bukan aturan
produk baru. Kasus gagal tidak dihapus atau tes dilemahkan.

| Pemeriksaan aktual                                                                                                                                                                                                                                                       | Scope/environment                                                                                                                                                                                                        | Outcome                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm --prefix apps/web run test -- --run src/components/ui/organisms/taskDetail/__tests__/FeatureSpecDraftPanel.test.tsx src/components/ui/organisms/taskDetail/__tests__/FeatureSpecPlanPanel.test.tsx src/components/ui/organisms/__tests__/TaskDetailDrawer.test.tsx` | jsdom contract factories                                                                                                                                                                                                 | 55/55 awal; legacy tests diberi mock Spec null eksplisit karena factory memang tidak memiliki Spec, bukan mengandalkan network failure |
| UI focused ditambah `src/lib/hooks/__tests__/useFeatureSpec.test.tsx`, `src/lib/api/__tests__/featureSpecService.test.ts`                                                                                                                                                | E2                                                                                                                                                                                                                       | 59/59 sebelum koreksi review; delta terakhir 10/10 (DraftPanel8 + hook2)                                                               |
| `NODE_ENV=test node --import tsx --test apps/api/src/modules/featureSpecs/__tests__/featureSpecApiIntegration.test.ts apps/api/src/modules/featureSpecs/__tests__/featureSpecTasksAiApiIntegration.test.ts`                                                              | Node24.15.0; PostgreSQL16 disposable `qlickhub_p5d2_test_20261102`,77 migrations                                                                                                                                         | **35 pass /0 fail /0 skip**, termasuk prior-stage regression yang tidak menambah versi/audit atau memanggil AI                         |
| `npm --prefix apps/web run typecheck` dan `npm --prefix apps/web run build`                                                                                                                                                                                              | Node24                                                                                                                                                                                                                   | Exit0                                                                                                                                  |
| `npm --prefix apps/web run test:e2e -- feature-planning.spec.ts --project=desktop-chromium`                                                                                                                                                                              | Browser UI login → authenticated API → persisted readback, disposable DB dengan canonical migrations; port3100/4101 memakai `BROWSER_TEST_WEB_PORT`/`BROWSER_TEST_API_PORT` agar localhost3000 pengguna tidak dihentikan | Versi awal2/2 pass (flow danPRD6combinations); matriks lengkap setelah review masih menunggu hasil                                     |

Uji browser pertama gagal pada selector input checkbox yang sr-only; alur keyboard Space dipakai
dan indikator fokus atom diperbaiki. Uji berikutnya mencapai applied+readback Spec, tetapi assertion
delivery salah membaca envelope; disesuaikan ke `TaskListResponseSchema.parse(body.data)`. Perbaikan
factory import path hook dan dua error typecheck awal juga dicatat sebagai outcome gagal yang
diselesaikan. Tidak ada bukti Production/Gemini asli baru; test AI eksternal tetap seam yang ada.
Warning browser NO_COLOR/FORCE_COLOR diketahui; screenshot responsif merupakan fixture persisted.
Matriks browser lengkap akhirnya **2/2 pass** (26.7 detik): alur Apply/readback dan 18 adegan
PRD/Task/Apply pada390/768/1440 Light/Dark, keyboard/focus/Escape/modal44px/no-overflow.
Spec re-review **Accepted** setelah memeriksa sumber dan log35/35PG,10/10UI,2/2browser.
Standards re-review juga **Accepted**, 0 temuan actionable. Quality review: reuse atoms/layout/
evaluator/API; tidak ada persistence, izin, atau data produksi paralel; error fallback yang usang
dihapus; regressions dan docs diperbarui. Contoh E4 fixture persisted:
[Task phone Dark](../evidence/p5efg/p5e-task-phone-dark.png) dan
[Apply desktop Light](../evidence/p5efg/p5e-apply-desktop-light.png).
`npm --prefix apps/web run test`: **789 pass /0 fail**,134files,34.1detik; warning React act()
pada TaskTimelineView yang sudah ada dicatat, bukan dihapus/dinonaktifkan. P5e lokal **Accepted**
oleh kedua reviewer; tahap berikutnya P5f Build. Tidak ada klaim CI remote atau rilis.

### P5f — Test & Review, 2026-11-03

Task list/detail mengembalikan `featureStage` dan `featureStageSource` untuk root yang telah
diotorisasi. Spec menjadi sumber utama; legacy memakai keberadaan subtask aktif, Brief utama
atau Requirement, tanpa menyatakan Apply historis. Maksimal empat pembacaan batched/grouped
per halaman, semuanya scoped Workspace dan root yang sudah lolos akses. Badge dan drawer hanya
memetakan metadata backend; metadata hilang menampilkan keadaan belum tersedia dan muat ulang.
Tidak ada kolom stage, perubahan role, atau migrasi pada slice ini.

`NODE_ENV=test node --import tsx --test apps/api/src/modules/featureSpecs/__tests__/featureSpecApplyApiIntegration.test.ts`:
**19/19 pass,0 skip** di PostgreSQL16 disposable `qlickhub_p5d2_test_20261102`,77 migrasi.
Rerun `--test-name-pattern='Task Hub'` setelah query dikelompokkan: **1/1 pass**;
delapan pasangan list/detail HTTP sekitar16–50ms pada fixture kecil, bukan bukti kapasitas produksi.
`npm --prefix apps/web run test -- --run` untuk TaskDetailDrawer, featureStages,
FeaturePlanningStageBadge dan TaskCollection: **54/54 pass**,4files.
Web typecheck dan `npm run docs:check`: exit0 (docs12/12).
`BROWSER_TEST_WEB_PORT=3100 BROWSER_TEST_API_PORT=4101 npm --prefix apps/web run test:e2e -- feature-planning.spec.ts --project=desktop-chromium --grep='Task Hub presents'`:
**1/1 pass**,12.6detik, persisted disposable PostgreSQL dengan canonical migrations;
Plan/PRD/Task/Diterapkan pada390/768/1440 Light/Dark, keyboard dan akses kolom aksi.
Node24.15.0 untuk seluruh perintah; environment koneksi dibaca dari konfigurasi test tanpa dicetak.

Uji browser awal menemukan overflow tablet. Diagnosis membuktikan tabel sudah scrollable,
tetapi heading aksi sr-only yang absolute tidak memiliki containing block. Wrapper `relative`
memperbaikinya tanpa menyembunyikan kolom; region diberi accessible name/fokus keyboard.
React classifier legacy yang tumpang tindih juga dihapus setelah review. Warning NO_COLOR/
FORCE_COLOR tetap dicatat. Quality review: reuse Badge/collection/stepper, stage kanonis backend,
classifier usang dihapus, HTTP/PG/UI/browser mencakup perubahan, kontrak dan katalog Atomic diperbarui.
Spec dan Standards re-review **Accepted**, tidak ada temuan actionable tersisa.
P5f lokal diterima; lanjut P5g-1 Build. Tidak ada klaim merge/deploy.

### P5g-1 — Build, 2026-11-03

Assignment mode diperkenalkan pada jalur Spec/Apply yang sudah meminta pilihan eksplisit.
CreateTask legacy tetap kompatibel: default penyimpanan assigned termasuk assignee kosong;
input lama tidak otomatis menjadi open atau claimable. Ini menjaga batas ADR-036 tentang Task
Spec tanpa memaksakan perubahan breaking pada API manual lama. Planner dapat melepas pekerjaan
melalui operasi eksplisit P5g-2. Shared Task mode optional untuk pembaca/client lama, backend
selalu mengembalikannya. Mode Spec memakai enum shared yang sama.

Migrasi94 aditif memakai varchar+CHECK assigned/open dan open hanya untuk subtask tanpa assignee,
serta partial index queue scoped Workspace/area/tenggat. Default tidak mengubah assignee/status
legacy. Risiko rollback: drop kolom menghilangkan pilihan mode, sehingga down hanya disposable;
rilis kelak memakai revert kode/forward recovery dengan ekspor mode sebelum rollback schema.
Tidak ada migrasi pada database pengguna/Production. AC evidence: clean migrations+CHECK/index,
Apply campuran assigned/open+readback+replay/rollback, UI pilihan mode tanpa assignee, pool1.

Hasil P5g-1: Node24.15.0 `npm --prefix packages/contracts run build`, `npm run typecheck`:
exit0; `npm --prefix apps/web run test -- --run src/components/ui/organisms/taskDetail/__tests__/FeatureSpecDraftPanel.test.tsx`:
**9/9 pass**; `npm run docs:check`: exit0,12/12.
`NODE_ENV=test node --import tsx --test apps/api/src/modules/featureSpecs/__tests__/featureSpecApplyApiIntegration.test.ts`:
**21/21 pass,0 skip**,28.2detik, PostgreSQL16 disposable `qlickhub_p5g_test_77806`
(nama per proses),78 canonical migrations. Suite membuktikan mode, root/open/assignee CHECK,
index, readback HTTP dan replay; regresi rollback dan pool1 tetap lulus.
`BROWSER_TEST_WEB_PORT=3100 BROWSER_TEST_API_PORT=4101 npm --prefix apps/web run test:e2e -- feature-planning.spec.ts --project=desktop-chromium`:
**3/3 pass**,20.3detik, database disposable; mixed assigned/open Apply/readback dan matriks
PRD/Task/Apply/TaskHub pada390/768/1440 Light/Dark. Warning NO_COLOR/FORCE_COLOR.
Rerun PG pertama sempat gagal karena package contracts dist belum dibangun sehingga parser
readback menghapus field baru; build package dan rerun menyelesaikan kegagalan, tanpa melemahkan
assertion. Typecheck awal juga menemukan envelope unknown yang kemudian diparse dengan Zod.
Quality review: satu enum mode, reuse writer kanonis dan atoms; tidak ada API manual paralel,
rejection open yang obsolete diganti menjadi open+assignee invalid sesuai ADR-036; tes dan docs
disesuaikan bersama. Review Spec dan Standards **Accepted**, tidak ada temuan actionable.
P5g-1 diterima lokal; lanjut P5g-2 Build.
