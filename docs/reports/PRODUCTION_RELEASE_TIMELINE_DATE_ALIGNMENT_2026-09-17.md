# Agent Report — Production Release: Timeline Date Alignment & Today Marker Fix

## Task

`TIMELINE-DATE-ALIGNMENT-AND-TODAY-MARKER-FIX` — Perbaiki pergeseran tanggal task dan garis penanda "Hari Ini" pada komponen timeline Task Hub (`TaskTimelineView`) lintas skala Hari, Minggu, dan Bulan, lalu rilis ke Vercel Production (`https://qlickhub.vercel.app`).

## Outcome

Commit `c650f06` telah dipush ke `origin/main` dan dideploy ke Vercel Production sebagai deployment `dpl_BWzbhtutNSLNXF6qB8iWggb88zVJ`. Deployment berstatus `READY`, menargetkan Production, dan memegang alias kanonikal `https://qlickhub.vercel.app`.

Perubahan diterapkan pada komponen `TaskTimelineView` dan rangkaian tes `TaskTimelineView.test.tsx`:
- **Normalisasi Waktu Kalender:** Patokan waktu `anchor` dan `start` pada skala Hari (`day`) dan Minggu (`week`) kini dinormalkan ke tengah malam (`00:00:00.000`). Hal ini menghilangkan pergeseran mundur ~22.5 jam yang sebelumnya terjadi jika aplikasi dibuka di malam hari.
- **Presisi Bar Task:** Task yang dijadwalkan dari tanggal 14 September sampai 18 September kini ter-render tepat dari awal kolom 14 September (index 4) sampai akhir kolom 18 September (index 8). Kolom 13 September bebas dan tidak tertutupi bar task.
- **Indikator Garis "Hari Ini" Real-Time:** Garis dan floating pin badge "Hari Ini" kini ditempatkan menggunakan `dateToPercent(today)` sehingga berada **tepat di dalam kolom tanggal 17 September** (antara 24.14% dan 27.59%), bukan terlempar ke awal tanggal 16 September.
- **Evaluasi Akhir Pekan Skala Minggu:** Evaluasi kolom minggu aktif (`isTodayWeek`) kini menggunakan interval 7 hari eksklusif (`today >= cur && today < nextWeek`), memastikan kolom minggu tetap ter-highlight meskipun diakses pada Sabtu malam.
- **Month-Aware Coordinate Mapping pada Skala Bulan:** Posisi tanggal pada skala bulan kini dipetakan secara proporsional terhadap jumlah hari riil dalam bulan tersebut, menghilangkan deviasi akumulatif terhadap garis pembatas kolom bulan.

Tidak ada skema migrasi database, perubahan kontrak API, atau mutasi data persisten yang dijalankan.

## Source of truth and impact

- **Applicable SSoT:** [Deployment runbook](../DEPLOYMENT_AND_ENVIRONMENTS.md), [Workflow & Roles](../2_WORKFLOW_AND_ROLES.md), [Architecture](../1_ARCHITECTURE.md), [UI design system](../3_UI_ATOMIC_DESIGN_SYSTEM.md), dan [Agent guidelines](../4_AGENT_DEV_GUIDELINES.md).
- **Policy IDs:** `UI-001`, `UI-002`, `TEST-001`, `DATA-001`, `DOC-003`, `DOC-004`.
- **Data/interface impact:** Tidak ada. Menyelaraskan rendering visual kalender di browser tanpa mengubah payload atau endpoint API.
- **Authorization impact:** Tidak ada. Seluruh akses baca dan guard otentikasi tetap berlaku seperti semula.
- **Migration risk:** Nihil. Tidak ada skema database baru atau migrasi yang dijalankan.

## Changed files

- `apps/web/src/components/ui/organisms/TaskTimelineView.tsx` — normalisasi anchor ke 00:00:00, dateToPercent proporsional bulan, live marker posisi hari ini, dan highlight minggu akhir pekan.
- `apps/web/src/components/ui/organisms/__tests__/TaskTimelineView.test.tsx` — penambahan unit test untuk membuktikan posisi bar task 14–18 Sept dan marker Hari Ini 17 Sept tanpa pergeseran jam.
- `TODO.md` — pencatatan status implementasi dan rilis produksi.
- `docs/reports/PRODUCTION_RELEASE_TIMELINE_DATE_ALIGNMENT_2026-09-17.md` — laporan rilis produksi ini.

## Validation

- **Unit & Component Tests:**
  - `node ../../node_modules/.bin/vitest run src/components/ui/organisms/__tests__/TaskTimelineView.test.tsx`: 10/10 tes lulus (100%).
- **Governance & Types:**
  - `node scripts/checkDocs.mjs`: Documentation governance passed.
  - TypeScript Typecheck (`tsc --noEmit`): 0 error di `@qlick/web`.
- **Production Build:**
  - `node ../../node_modules/.bin/vite build`: kompilasi Vite sukses mentransformasi 1.711 modul tanpa error.
- **Live Production Smoke Checks (`https://qlickhub.vercel.app`):**
  - `GET /`: HTTP 200 OK
  - `GET /login`: HTTP 200 OK
  - `GET /v1/health`: HTTP 200 OK (`{"status":"ok","database":{"status":"connected"}}`)
  - `GET /v1/workspaces` (tanpa sesi terautentikasi): HTTP 401 Unauthorized (`Authentication required`)
- **Rollback Target:**
  - Deployment sehat sebelumnya: `dpl_7wwkze0z9-oneilreyands-projects.vercel.app`.

## TODO update

- `TIMELINE-DATE-ALIGNMENT-AND-TODAY-MARKER-FIX` → `Done`.
